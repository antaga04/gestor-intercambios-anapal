import type { ExchangeStatus } from '../constants';
import type { PublicUser, AdminUser } from './user';

export interface AdminStats {
    campaign: { _id: string; name: string; exchangeDeadline: string; isActive: boolean };
    users: {
        total: number;
        active: number;
        pending: number;
        blocked: number;
        admins: number;
        activeLast7Days: number;
        activeLast30Days: number;
    };
    exchanges: Record<ExchangeStatus, number> & { total: number; bidirectionalPairs: number };
    /** Sum of `totalDecimos`: `total` over pending + accepted, `accepted` over accepted only. */
    decimos: { total: number; accepted: number };
    envelopes: { toSend: number };
    emails: { today: number; thisMonth: number; dailyCap: number; monthlyCap: number };
    lottery: { usersWithList: number; numbers: number };
    /** Last 60 days, oldest first. */
    exchangesPerDay: { date: string; created: number; accepted: number }[];
    topGivers: AdminTopUser[];
    topReceivers: AdminTopUser[];
    pendingPasswordRequests: number;
}

export interface AdminTopUser {
    user: PublicUser;
    decimos: number;
    envelopes: number;
}

export interface AdminUserRow extends AdminUser {
    exchangeCounts: { out: number; in: number };
}

export interface PasswordRequestRow {
    _id: string;
    user: AdminUser;
    status: 'pending' | 'resolved';
    requestedAt: string;
    resolvedAt?: string;
}
