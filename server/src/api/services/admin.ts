import { Types } from 'mongoose';
import type {
    AdminResetPasswordInput,
    AdminStats,
    AdminTopUser,
    AdminUpdateUserInput,
    AdminUser,
    AdminUserExchangesQuery,
    AdminUserQuery,
    AdminUserRow,
    ControlList,
    ExchangeDetail,
    ExchangeStatus,
    ExchangeSummary,
    Paginated,
    PasswordRequestQuery,
    PasswordRequestRow,
} from '@anapal/shared';
import { EMAIL_CAPS, EXCHANGE_STATUS } from '@anapal/shared';
import type { CampaignDocument } from '@/api/models/campaign';
import { Exchange } from '@/api/models/exchange';
import { LotteryNumber } from '@/api/models/lotteryNumber';
import { PasswordResetRequest } from '@/api/models/passwordResetRequest';
import { ADMIN_USER_FIELDS, PUBLIC_USER_FIELDS, User, type UserDocument } from '@/api/models/user';
import { toExchangeDetail, toExchangeSummary } from '@/api/services/exchangeMapper';
import { controlList as buildUserControlList } from '@/api/services/exchanges';
import { revokeAllSessions } from '@/api/services/session';
import { toPublicUser } from '@/api/services/users';
import { AppError } from '@/utils/AppError';
import { hashPassword } from '@/utils/password';
import { escapeRegex, paginate } from '@/utils/pagination';
import type { AuthUser } from '@/types/express';

const DAY_MS = 86_400_000;
const LIVE: ExchangeStatus[] = ['pending', 'accepted'];

export function toAdminUser(user: UserDocument): AdminUser {
    return {
        _id: user._id.toString(),
        receptorNumber: user.receptorNumber,
        name: user.name,
        poblacion: user.poblacion,
        provincia: user.provincia,
        address: user.address ?? undefined,
        phone: user.phone ?? undefined,
        contactName: user.contactName ?? undefined,
        email: user.email,
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString(),
        lastSeenAt: user.lastSeenAt?.toISOString(),
        verificationEmailsSent: user.verificationEmailsSent,
        updatedAt: user.updatedAt.toISOString(),
    };
}

async function findUserOr404(id: string): Promise<UserDocument> {
    const user = await User.findById(id).select(ADMIN_USER_FIELDS);
    if (!user) throw new AppError(404, 'user.not_found', 'User not found');
    return user;
}

/** Nobody manages the superadmin account from the panel, and admins never act on themselves. */
function assertManageable(target: UserDocument, actor: AuthUser, selfAllowed = false) {
    if (target.role === 'superadmin') {
        throw new AppError(403, 'admin.cannot_modify_superadmin', 'Cannot modify the superadmin');
    }
    if (!selfAllowed && target._id.toString() === actor.id) {
        throw new AppError(403, 'admin.cannot_modify_self', 'Cannot modify yourself');
    }
}

// ---------------------------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------------------------

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

async function topUsers(campaign: Types.ObjectId, field: 'from' | 'to'): Promise<AdminTopUser[]> {
    const rows = await Exchange.aggregate<{ _id: Types.ObjectId; decimos: number; envelopes: number }>([
        { $match: { campaign, status: { $in: LIVE } } },
        { $group: { _id: `$${field}`, decimos: { $sum: '$totalDecimos' }, envelopes: { $sum: 1 } } },
        { $sort: { decimos: -1, envelopes: -1 } },
        { $limit: 10 },
    ]);
    const users = await User.find({ _id: { $in: rows.map((r) => r._id) } })
        .select(PUBLIC_USER_FIELDS)
        .lean();
    const byId = new Map(users.map((u) => [u._id.toString(), toPublicUser(u)]));
    return rows.flatMap((r) => {
        const user = byId.get(r._id.toString());
        return user ? [{ user, decimos: r.decimos, envelopes: r.envelopes }] : [];
    });
}

async function perDay(campaign: Types.ObjectId): Promise<AdminStats['exchangesPerDay']> {
    const since = new Date(Date.now() - 59 * DAY_MS);
    since.setUTCHours(0, 0, 0, 0);
    const [created, accepted] = await Promise.all([
        Exchange.aggregate<{ _id: string; n: number }>([
            { $match: { campaign, createdAt: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } },
        ]),
        Exchange.aggregate<{ _id: string; n: number }>([
            { $match: { campaign, status: 'accepted', respondedAt: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$respondedAt' } }, n: { $sum: 1 } } },
        ]),
    ]);
    const createdBy = new Map(created.map((r) => [r._id, r.n]));
    const acceptedBy = new Map(accepted.map((r) => [r._id, r.n]));
    const days: AdminStats['exchangesPerDay'] = [];
    for (let t = since.getTime(); t <= Date.now(); t += DAY_MS) {
        const date = dayKey(new Date(t));
        days.push({ date, created: createdBy.get(date) ?? 0, accepted: acceptedBy.get(date) ?? 0 });
    }
    return days;
}

async function bidirectionalPairs(campaign: Types.ObjectId): Promise<number> {
    const [row] = await Exchange.aggregate<{ n: number }>([
        { $match: { campaign, status: { $in: LIVE }, counterpart: { $ne: null } } },
        {
            $lookup: {
                from: 'exchanges',
                localField: 'counterpart',
                foreignField: '_id',
                as: 'reverse',
                pipeline: [{ $match: { status: { $in: LIVE } } }, { $project: { _id: 1 } }],
            },
        },
        { $match: { 'reverse.0': { $exists: true } } },
        { $count: 'n' },
    ]);
    // Each pair is matched from both ends.
    return Math.floor((row?.n ?? 0) / 2);
}

/**
 * Email usage is derived from the users' verification counters (docs/06): sends in the last 24 h
 * come from the rolling window counter; "this month" sums lifetime sends of users emailed this month.
 */
async function emailUsage(): Promise<AdminStats['emails']> {
    const now = Date.now();
    const monthStart = new Date(now);
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const [today, month] = await Promise.all([
        User.aggregate<{ n: number }>([
            { $match: { lastVerificationEmailAt: { $gte: new Date(now - DAY_MS) } } },
            { $group: { _id: null, n: { $sum: '$verificationEmailsWindowCount' } } },
        ]),
        User.aggregate<{ n: number }>([
            { $match: { lastVerificationEmailAt: { $gte: monthStart } } },
            { $group: { _id: null, n: { $sum: '$verificationEmailsSent' } } },
        ]),
    ]);
    return {
        today: today[0]?.n ?? 0,
        thisMonth: month[0]?.n ?? 0,
        dailyCap: EMAIL_CAPS.daily,
        monthlyCap: EMAIL_CAPS.monthly,
    };
}

export async function stats(campaign: CampaignDocument): Promise<AdminStats> {
    const campaignId = campaign._id;
    const now = Date.now();

    const [userRows, exchangeRows, pairs, emails, lotteryNumbers, lotteryUsers, days, givers, receivers, requests] =
        await Promise.all([
            User.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
            Exchange.aggregate<{ _id: ExchangeStatus; n: number; decimos: number }>([
                { $match: { campaign: campaignId } },
                { $group: { _id: '$status', n: { $sum: 1 }, decimos: { $sum: '$totalDecimos' } } },
            ]),
            bidirectionalPairs(campaignId),
            emailUsage(),
            LotteryNumber.countDocuments({ campaign: campaignId }),
            LotteryNumber.distinct('user', { campaign: campaignId }),
            perDay(campaignId),
            topUsers(campaignId, 'from'),
            topUsers(campaignId, 'to'),
            PasswordResetRequest.countDocuments({ status: 'pending' }),
        ]);
    const [admins, active7, active30] = await Promise.all([
        User.countDocuments({ role: { $in: ['admin', 'superadmin'] } }),
        User.countDocuments({ lastSeenAt: { $gte: new Date(now - 7 * DAY_MS) } }),
        User.countDocuments({ lastSeenAt: { $gte: new Date(now - 30 * DAY_MS) } }),
    ]);

    const userCount = (status: string) => userRows.find((r) => r._id === status)?.n ?? 0;
    const exchanges = Object.fromEntries(EXCHANGE_STATUS.map((s) => [s, 0])) as Record<ExchangeStatus, number>;
    let decimosLive = 0;
    let decimosAccepted = 0;
    for (const row of exchangeRows) {
        exchanges[row._id] = row.n;
        if (LIVE.includes(row._id)) decimosLive += row.decimos;
        if (row._id === 'accepted') decimosAccepted += row.decimos;
    }

    return {
        campaign: {
            _id: campaignId.toString(),
            name: campaign.name,
            exchangeDeadline: campaign.exchangeDeadline.toISOString(),
            isActive: campaign.isActive,
        },
        users: {
            total: userRows.reduce((acc, r) => acc + r.n, 0),
            active: userCount('active'),
            pending: userCount('pending'),
            blocked: userCount('blocked'),
            admins,
            activeLast7Days: active7,
            activeLast30Days: active30,
        },
        exchanges: { ...exchanges, total: exchangeRows.reduce((acc, r) => acc + r.n, 0), bidirectionalPairs: pairs },
        decimos: { total: decimosLive, accepted: decimosAccepted },
        envelopes: { toSend: exchanges.pending + exchanges.accepted },
        emails,
        lottery: { usersWithList: lotteryUsers.length, numbers: lotteryNumbers },
        exchangesPerDay: days,
        topGivers: givers,
        topReceivers: receivers,
        pendingPasswordRequests: requests,
    };
}

// ---------------------------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------------------------

export async function listUsers(query: AdminUserQuery, campaign: CampaignDocument): Promise<Paginated<AdminUserRow>> {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.role) filter.role = query.role;
    if (query.q) {
        const rx = new RegExp(escapeRegex(query.q), 'i');
        filter.$or = [
            { receptorNumber: new RegExp('^' + escapeRegex(query.q)) },
            { name: rx },
            { poblacion: rx },
            { email: rx },
        ];
    }
    const sort: Record<string, 1 | -1> =
        query.sort === 'lastSeenAt'
            ? { lastSeenAt: -1 }
            : query.sort === 'receptorNumber'
              ? { receptorNumber: 1 }
              : { createdAt: -1 };

    const page = await paginate(User.find(filter).select(ADMIN_USER_FIELDS).sort(sort), query);
    const ids = page.items.map((u) => u._id);
    const [out, inc] = await Promise.all([
        Exchange.aggregate<{ _id: Types.ObjectId; n: number }>([
            { $match: { campaign: campaign._id, from: { $in: ids } } },
            { $group: { _id: '$from', n: { $sum: 1 } } },
        ]),
        Exchange.aggregate<{ _id: Types.ObjectId; n: number }>([
            { $match: { campaign: campaign._id, to: { $in: ids }, status: { $ne: 'draft' } } },
            { $group: { _id: '$to', n: { $sum: 1 } } },
        ]),
    ]);
    const outBy = new Map(out.map((r) => [r._id.toString(), r.n]));
    const inBy = new Map(inc.map((r) => [r._id.toString(), r.n]));
    return {
        ...page,
        items: page.items.map((u) => ({
            ...toAdminUser(u),
            exchangeCounts: { out: outBy.get(u._id.toString()) ?? 0, in: inBy.get(u._id.toString()) ?? 0 },
        })),
    };
}

export async function getUser(id: string): Promise<AdminUser> {
    return toAdminUser(await findUserOr404(id));
}

export async function updateUser(id: string, input: AdminUpdateUserInput, actor: AuthUser): Promise<AdminUser> {
    const user = await findUserOr404(id);
    assertManageable(user, actor, true);
    if (input.receptorNumber && input.receptorNumber !== user.receptorNumber) {
        if (await User.exists({ receptorNumber: input.receptorNumber, _id: { $ne: user._id } })) {
            throw new AppError(409, 'auth.receptor_taken', 'Receptor number already in use');
        }
    }
    user.set(input);
    await user.save();
    return toAdminUser(user);
}

export async function setStatus(id: string, status: 'active' | 'blocked', actor: AuthUser): Promise<AdminUser> {
    const user = await findUserOr404(id);
    assertManageable(user, actor);
    user.status = status;
    await user.save();
    if (status === 'blocked') await revokeAllSessions(id);
    return toAdminUser(user);
}

export async function setRole(id: string, role: 'user' | 'admin', actor: AuthUser): Promise<AdminUser> {
    const user = await findUserOr404(id);
    assertManageable(user, actor);
    user.role = role;
    await user.save();
    // The role travels inside the access token: force a fresh login so it takes effect.
    await revokeAllSessions(id);
    return toAdminUser(user);
}

export async function resetPassword(id: string, input: AdminResetPasswordInput, actor: AuthUser): Promise<void> {
    const user = await findUserOr404(id);
    assertManageable(user, actor, true);
    user.set('passwordHash', await hashPassword(input.temporaryPassword));
    user.mustChangePassword = true;
    await user.save();
    await Promise.all([
        revokeAllSessions(id),
        PasswordResetRequest.updateMany(
            { user: user._id, status: 'pending' },
            { $set: { status: 'resolved', resolvedAt: new Date(), resolvedBy: actor.id } },
        ),
    ]);
}

export async function revokeSessions(id: string, actor: AuthUser): Promise<void> {
    const user = await findUserOr404(id);
    assertManageable(user, actor);
    await revokeAllSessions(id);
}

// ---------------------------------------------------------------------------------------------
// Password requests, exchanges, control list
// ---------------------------------------------------------------------------------------------

export async function listPasswordRequests(query: PasswordRequestQuery): Promise<Paginated<PasswordRequestRow>> {
    const page = await paginate(
        PasswordResetRequest.find({ status: query.status })
            .sort({ requestedAt: -1 })
            .populate<{ user: UserDocument | null }>('user', ADMIN_USER_FIELDS),
        query,
    );
    return {
        ...page,
        items: page.items.flatMap((r) =>
            r.user
                ? [
                      {
                          _id: r._id.toString(),
                          user: toAdminUser(r.user),
                          status: r.status,
                          requestedAt: r.requestedAt.toISOString(),
                          resolvedAt: r.resolvedAt?.toISOString(),
                      },
                  ]
                : [],
        ),
    };
}

export async function userExchanges(
    id: string,
    query: AdminUserExchangesQuery,
    campaign: CampaignDocument,
): Promise<Paginated<ExchangeSummary>> {
    await findUserOr404(id);
    const userId = new Types.ObjectId(id);
    const filter =
        query.direction === 'out'
            ? { campaign: campaign._id, from: userId }
            : query.direction === 'in'
              ? { campaign: campaign._id, to: userId }
              : { campaign: campaign._id, $or: [{ from: userId }, { to: userId }] };
    const page = await paginate(
        Exchange.find(filter)
            .sort({ updatedAt: -1 })
            .populate([
                { path: 'from', select: PUBLIC_USER_FIELDS },
                { path: 'to', select: PUBLIC_USER_FIELDS },
                { path: 'counterpart', select: 'status' },
            ]),
        query,
    );
    return {
        ...page,
        items: page.items.map((e) =>
            toExchangeSummary(e, id, (e.counterpart as { status?: ExchangeStatus } | null)?.status),
        ),
    };
}

export async function userControlList(id: string, campaign: CampaignDocument): Promise<ControlList> {
    await findUserOr404(id);
    return buildUserControlList(campaign._id, id);
}

/** Any exchange, in whatever campaign it belongs to; the viewer is the admin so `direction` is meaningless. */
export async function getExchange(id: string, actor: AuthUser): Promise<ExchangeDetail> {
    const exchange = await Exchange.findById(id).populate([
        { path: 'from', select: PUBLIC_USER_FIELDS },
        { path: 'to', select: PUBLIC_USER_FIELDS },
        { path: 'counterpart', select: 'status' },
        { path: 'campaign' },
    ]);
    if (!exchange) throw new AppError(404, 'exchange.not_found', 'Exchange not found');
    const campaign = exchange.campaign as unknown as CampaignDocument;
    const counterpartStatus = (exchange.counterpart as { status?: ExchangeStatus } | null)?.status;
    return toExchangeDetail(exchange, actor.id, campaign, counterpartStatus);
}
