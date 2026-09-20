import { Types } from 'mongoose';
import type { DashboardPayload, ExchangeStatusCounts, ExchangeStatus } from '@anapal/shared';
import { Exchange } from '@/api/models/exchange';
import { LotteryNumber } from '@/api/models/lotteryNumber';
import { PasswordResetRequest } from '@/api/models/passwordResetRequest';
import { countForUser as countLegacyForUser } from '@/api/services/legacy';
import type { CampaignDocument } from '@/api/models/campaign';
import { PUBLIC_USER_FIELDS } from '@/api/models/user';
import { isCampaignClosed } from '@/middlewares/campaign';
import { isAdmin } from '@/middlewares/authorize';
import { toExchangeSummary } from '@/api/services/exchangeMapper';
import type { AuthUser } from '@/types/express';

const EMPTY_COUNTS: ExchangeStatusCounts = { draft: 0, pending: 0, accepted: 0, rejected: 0, cancelled: 0 };
const LIVE: ExchangeStatus[] = ['pending', 'accepted'];

interface StatusAggregate {
    _id: ExchangeStatus;
    count: number;
    decimos: number;
}

async function countsByStatus(campaign: Types.ObjectId, field: 'from' | 'to', userId: Types.ObjectId) {
    const rows = await Exchange.aggregate<StatusAggregate>([
        { $match: { campaign, [field]: userId } },
        { $group: { _id: '$status', count: { $sum: 1 }, decimos: { $sum: '$totalDecimos' } } },
    ]);
    const counts: ExchangeStatusCounts = { ...EMPTY_COUNTS };
    let liveDecimos = 0;
    let liveEnvelopes = 0;
    for (const row of rows) {
        counts[row._id] = row.count;
        if (LIVE.includes(row._id)) {
            liveDecimos += row.decimos;
            liveEnvelopes += row.count;
        }
    }
    return { counts, liveDecimos, liveEnvelopes };
}

export async function getDashboard(user: AuthUser, campaign: CampaignDocument): Promise<DashboardPayload> {
    const userId = new Types.ObjectId(user.id);
    const campaignId = campaign._id;

    const [outgoing, incoming, inboxUnread, lotteryCount, lastExchange, adminPendingRequests, legacyCount] =
        await Promise.all([
            countsByStatus(campaignId, 'from', userId),
            countsByStatus(campaignId, 'to', userId),
            Exchange.countDocuments({ campaign: campaignId, to: userId, status: 'pending', seenByReceiverAt: null }),
            LotteryNumber.countDocuments({ campaign: campaignId, user: userId }),
            // Incoming drafts are private to their sender: never surface one as "último intercambio".
            Exchange.findOne({
                campaign: campaignId,
                $or: [{ from: userId }, { to: userId, status: { $ne: 'draft' } }],
            })
                .sort({ updatedAt: -1 })
                .populate('from', PUBLIC_USER_FIELDS)
                .populate('to', PUBLIC_USER_FIELDS)
                .populate('counterpart', 'status'),
            isAdmin(user.role)
                ? PasswordResetRequest.countDocuments({ status: 'pending' })
                : Promise.resolve(undefined),
            countLegacyForUser(userId),
        ]);

    const counterpartStatus = (lastExchange?.counterpart as { status?: ExchangeStatus } | null)?.status;

    return {
        campaign: {
            _id: campaignId.toString(),
            name: campaign.name,
            drawDate: campaign.drawDate.toISOString(),
            exchangeDeadline: campaign.exchangeDeadline.toISOString(),
            isClosed: isCampaignClosed(campaign),
        },
        inboxPending: incoming.counts.pending,
        inboxUnread,
        outgoing: outgoing.counts,
        incoming: incoming.counts,
        decimosOut: outgoing.liveDecimos,
        decimosIn: incoming.liveDecimos,
        envelopesToSend: outgoing.liveEnvelopes,
        envelopesToReceive: incoming.liveEnvelopes,
        lastExchange: lastExchange ? toExchangeSummary(lastExchange, user.id, counterpartStatus) : null,
        lotteryCount,
        legacyCount,
        adminPendingRequests,
    };
}
