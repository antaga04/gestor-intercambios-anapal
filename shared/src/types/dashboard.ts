import type { ExchangeSummary } from './exchange';

export interface ExchangeStatusCounts {
    draft: number;
    pending: number;
    accepted: number;
    rejected: number;
    cancelled: number;
}

export interface DashboardPayload {
    campaign: {
        _id: string;
        name: string;
        drawDate: string;
        exchangeDeadline: string;
        isClosed: boolean;
    };
    inboxPending: number;
    inboxUnread: number;
    outgoing: ExchangeStatusCounts;
    incoming: ExchangeStatusCounts;
    /** Décimos in live (pending + accepted) exchanges. */
    decimosOut: number;
    decimosIn: number;
    envelopesToSend: number;
    envelopesToReceive: number;
    lastExchange: ExchangeSummary | null;
    lotteryCount: number;
    /** Only for admins: pending password reset requests. */
    adminPendingRequests?: number;
}
