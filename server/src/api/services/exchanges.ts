import { Types } from 'mongoose';
import type {
    ControlList,
    ExchangeDetail,
    ExchangeInput,
    ExchangeOverlap,
    ExchangeOverlapInput,
    ExchangeQuery,
    ExchangeStatus,
    ExchangeSummary,
    ExchangeUpdateInput,
    Paginated,
    Role,
} from '@anapal/shared';
import { buildControlList } from '@anapal/shared';
import { Exchange, type ExchangeDocument } from '@/api/models/exchange';
import { LotteryNumber } from '@/api/models/lotteryNumber';
import { PUBLIC_USER_FIELDS, User } from '@/api/models/user';
import type { CampaignDocument } from '@/api/models/campaign';
import { toExchangeDetail, toExchangeSummary } from '@/api/services/exchangeMapper';
import { isAdmin } from '@/middlewares/authorize';
import { AppError } from '@/utils/AppError';
import { escapeRegex } from '@/utils/pagination';

export interface Actor {
    id: string;
    role: Role;
}

interface Scope {
    actor: Actor;
    campaign: CampaignDocument;
}

const POPULATE = [
    { path: 'from', select: PUBLIC_USER_FIELDS },
    { path: 'to', select: PUBLIC_USER_FIELDS },
    { path: 'counterpart', select: 'status' },
];

const counterpartStatusOf = (exchange: ExchangeDocument): ExchangeStatus | undefined =>
    (exchange.counterpart as { status?: ExchangeStatus } | null)?.status;

async function findOr404(id: string, campaign: CampaignDocument): Promise<ExchangeDocument> {
    const exchange = await Exchange.findOne({ _id: id, campaign: campaign._id }).populate(POPULATE);
    if (!exchange) throw new AppError(404, 'exchange.not_found', 'Exchange not found');
    return exchange;
}

const idOf = (value: unknown): string =>
    value && typeof value === 'object' && '_id' in value ? String((value as { _id: unknown })._id) : String(value);

function assertParty(exchange: ExchangeDocument, actor: Actor) {
    if (isAdmin(actor.role)) return;
    const isSender = idOf(exchange.from) === actor.id;
    if (!isSender && idOf(exchange.to) !== actor.id) {
        throw new AppError(403, 'exchange.forbidden', 'Not a party of this exchange');
    }
    // A draft has not been sent yet: it stays private to its owner.
    if (!isSender && exchange.status === 'draft') {
        throw new AppError(403, 'exchange.forbidden', 'Draft exchanges are private to their sender');
    }
}

function assertOwner(exchange: ExchangeDocument, actor: Actor) {
    if (isAdmin(actor.role)) return;
    if (idOf(exchange.from) !== actor.id) throw new AppError(403, 'exchange.not_owner', 'Only the sender can do this');
}

function assertReceiver(exchange: ExchangeDocument, actor: Actor) {
    if (isAdmin(actor.role)) return;
    if (idOf(exchange.to) !== actor.id)
        throw new AppError(403, 'exchange.not_receiver', 'Only the receiver can do this');
}

function assertStatus(exchange: ExchangeDocument, allowed: ExchangeStatus[]) {
    if (!allowed.includes(exchange.status)) {
        throw new AppError(409, 'exchange.invalid_transition', `Cannot do this while status is ${exchange.status}`);
    }
}

/** Keeps the `counterpart` link symmetric with the reverse exchange (to → from) of the same campaign. */
async function linkCounterpart(exchange: ExchangeDocument): Promise<void> {
    const reverse = await Exchange.findOne({
        campaign: exchange.campaign,
        from: idOf(exchange.to),
        to: idOf(exchange.from),
    }).select('_id');
    if (!reverse) return;
    await Exchange.updateOne({ _id: exchange._id }, { $set: { counterpart: reverse._id } });
    await Exchange.updateOne({ _id: reverse._id }, { $set: { counterpart: exchange._id } });
}

export async function create({ actor, campaign }: Scope, input: ExchangeInput): Promise<ExchangeDetail> {
    if (input.to === actor.id) throw new AppError(400, 'exchange.self', 'Cannot exchange with yourself');

    const recipient = await User.exists({ _id: input.to, status: 'active', role: { $ne: 'superadmin' } });
    if (!recipient) throw new AppError(404, 'user.not_found', 'Recipient not found');

    const existing = await Exchange.findOne({ campaign: campaign._id, from: actor.id, to: input.to }).select(
        '_id status',
    );
    if (existing) {
        throw new AppError(409, 'exchange.exists', 'An exchange with this admon already exists', {
            exchangeId: existing._id.toString(),
            status: existing.status,
        });
    }
    if (input.send && input.rows.length === 0)
        throw new AppError(400, 'exchange.no_rows', 'Cannot send an empty exchange');

    const created = await Exchange.create({
        campaign: campaign._id,
        from: actor.id,
        to: input.to,
        status: input.send ? 'pending' : 'draft',
        sentAt: input.send ? new Date() : undefined,
        rows: input.rows,
        note: input.note,
    });
    await linkCounterpart(created);

    return detail(await findOr404(created._id.toString(), campaign), { actor, campaign });
}

export async function update(scope: Scope, id: string, input: ExchangeUpdateInput): Promise<ExchangeDetail> {
    const exchange = await findOr404(id, scope.campaign);
    assertOwner(exchange, scope.actor);

    exchange.set({ rows: input.rows, note: input.note });

    // Editing after the receiver answered restarts the conversation (docs/03 §3).
    if (exchange.status === 'accepted') {
        exchange.status = 'pending';
        exchange.respondedAt = null;
        exchange.seenByReceiverAt = null;
    } else if (exchange.status === 'rejected' || exchange.status === 'cancelled') {
        exchange.status = 'draft';
        exchange.sentAt = null;
        exchange.respondedAt = null;
        exchange.rejectReason = null;
        exchange.seenByReceiverAt = null;
    }

    await exchange.save();
    return detail(exchange, scope);
}

export async function send(scope: Scope, id: string): Promise<ExchangeDetail> {
    const exchange = await findOr404(id, scope.campaign);
    assertOwner(exchange, scope.actor);
    // A rejected or cancelled envelope can be sent again without editing it first.
    assertStatus(exchange, ['draft', 'rejected', 'cancelled']);
    if (exchange.rows.length === 0) throw new AppError(400, 'exchange.no_rows', 'Cannot send an empty exchange');

    exchange.status = 'pending';
    exchange.sentAt = new Date();
    exchange.respondedAt = null;
    exchange.rejectReason = null;
    exchange.seenByReceiverAt = null;
    await exchange.save();
    return detail(exchange, scope);
}

export async function cancel(scope: Scope, id: string): Promise<ExchangeDetail> {
    const exchange = await findOr404(id, scope.campaign);
    assertOwner(exchange, scope.actor);
    assertStatus(exchange, ['pending']);

    exchange.status = 'cancelled';
    await exchange.save();
    return detail(exchange, scope);
}

export async function respond(scope: Scope, id: string, accept: boolean, reason?: string): Promise<ExchangeDetail> {
    const exchange = await findOr404(id, scope.campaign);
    assertReceiver(exchange, scope.actor);
    assertStatus(exchange, ['pending']);

    exchange.status = accept ? 'accepted' : 'rejected';
    exchange.respondedAt = new Date();
    exchange.rejectReason = accept ? null : (reason ?? null);
    if (!exchange.seenByReceiverAt) exchange.seenByReceiverAt = new Date();
    await exchange.save();
    return detail(exchange, scope);
}

export async function remove(scope: Scope, id: string): Promise<void> {
    const exchange = await findOr404(id, scope.campaign);
    assertOwner(exchange, scope.actor);

    if (exchange.counterpart) {
        await Exchange.updateOne({ _id: idOf(exchange.counterpart) }, { $unset: { counterpart: '' } });
    }
    await exchange.deleteOne();
}

/** Marks the exchange as seen the first time its receiver opens it. */
export async function getOne(scope: Scope, id: string): Promise<ExchangeDetail> {
    const exchange = await findOr404(id, scope.campaign);
    assertParty(exchange, scope.actor);

    if (idOf(exchange.to) === scope.actor.id && !exchange.seenByReceiverAt) {
        exchange.seenByReceiverAt = new Date();
        await exchange.save();
    }
    return detail(exchange, scope);
}

export async function list(scope: Scope, query: ExchangeQuery): Promise<Paginated<ExchangeSummary>> {
    const mine = scope.actor.id;
    const filter: Record<string, unknown> = { campaign: scope.campaign._id };
    filter[query.direction === 'out' ? 'from' : 'to'] = mine;
    if (query.status) filter.status = query.status;
    // Incoming lists never show the other admon's unsent drafts.
    if (query.direction === 'in')
        filter.status = query.status === 'draft' ? '__none__' : (query.status ?? { $ne: 'draft' });

    if (query.q) {
        const rx = new RegExp(escapeRegex(query.q), 'i');
        const counterparts = await User.find({
            $or: [{ receptorNumber: new RegExp('^' + escapeRegex(query.q)) }, { name: rx }, { poblacion: rx }],
        }).select('_id');
        filter[query.direction === 'out' ? 'to' : 'from'] = { $in: counterparts.map((u) => u._id) };
    }

    const sort: Record<string, 1 | -1> =
        query.sort === 'total'
            ? { totalDecimos: -1 }
            : query.sort === 'counterpart'
              ? { createdAt: 1 }
              : { updatedAt: -1 };

    const [items, totalItems] = await Promise.all([
        Exchange.find(filter)
            .sort(sort)
            .skip((query.page - 1) * query.limit)
            .limit(query.limit)
            .populate(POPULATE),
        Exchange.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / query.limit));
    return {
        items: items.map((e) => toExchangeSummary(e, mine, counterpartStatusOf(e))),
        pagination: {
            totalItems,
            currentPage: query.page,
            totalPages,
            hasNextPage: query.page < totalPages,
            hasPreviousPage: query.page > 1,
        },
    };
}

export async function inbox(scope: Scope): Promise<ExchangeSummary[]> {
    const items = await Exchange.find({ campaign: scope.campaign._id, to: scope.actor.id, status: 'pending' })
        .sort({ sentAt: -1 })
        .populate(POPULATE);
    return items.map((e) => toExchangeSummary(e, scope.actor.id, counterpartStatusOf(e)));
}

/** All of a user's exchanges in the campaign, both directions — used by the control list and the admin panel. */
export async function allForUser(campaign: Types.ObjectId, userId: string): Promise<ExchangeSummary[]> {
    const items = await Exchange.find({ campaign, $or: [{ from: userId }, { to: userId }] })
        .sort({ updatedAt: -1 })
        .populate(POPULATE);
    return items.map((e) => toExchangeSummary(e, userId, counterpartStatusOf(e)));
}

/**
 * Advisory check before giving `numeros` to `to` (docs/03 §2): which ones they already hold in "Mi lotería"
 * and which ones they already give me in their live envelope. Only membership of the numbers asked about is
 * revealed — never the receiver's whole list. Empty list on their side → nothing is flagged.
 */
export async function overlap({ actor, campaign }: Scope, input: ExchangeOverlapInput): Promise<ExchangeOverlap> {
    if (input.numeros.length === 0) return { inTheirLottery: [], inTheirEnvelope: [] };
    const numeros = [...new Set(input.numeros)];
    const [owned, reverse] = await Promise.all([
        LotteryNumber.find({ user: input.to, campaign: campaign._id, numero: { $in: numeros } })
            .select('numero')
            .lean(),
        Exchange.findOne({
            campaign: campaign._id,
            from: input.to,
            to: actor.id,
            status: { $in: ['pending', 'accepted'] },
        })
            .select('rows.numero')
            .lean(),
    ]);
    const given = new Set(reverse?.rows.map((r) => r.numero) ?? []);
    return {
        inTheirLottery: owned.map((doc) => doc.numero),
        inTheirEnvelope: numeros.filter((numero) => given.has(numero)),
    };
}

/** "Lista de control" of a user in a campaign (docs/03 §7). Admins call it for any user. */
export async function controlList(campaign: Types.ObjectId, userId: string): Promise<ControlList> {
    return buildControlList(await allForUser(campaign, userId), userId);
}

function detail(exchange: ExchangeDocument, { actor, campaign }: Scope): ExchangeDetail {
    return toExchangeDetail(exchange, actor.id, campaign, counterpartStatusOf(exchange));
}
