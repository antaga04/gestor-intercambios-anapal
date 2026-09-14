import { pairDirection, type ExchangeStatus, type ExchangeSummary, type PublicUser } from '@anapal/shared';
import type { ExchangeDocument } from '@/api/models/exchange';
import { toPublicUser } from '@/api/services/users';

type PopulatedUser = Parameters<typeof toPublicUser>[0];

function asPublicUser(value: unknown): PublicUser {
    return toPublicUser(value as PopulatedUser);
}

/**
 * Maps an exchange (with `from`/`to` populated) to the summary DTO.
 * `direction` is relative to `viewerId`; `counterpart` must be populated (or passed) to detect "ambos".
 */
export function toExchangeSummary(
    exchange: ExchangeDocument,
    viewerId: string,
    counterpartStatus?: ExchangeStatus,
): ExchangeSummary {
    const from = asPublicUser(exchange.from);
    const to = asPublicUser(exchange.to);
    const viewerGives = from._id === viewerId;
    const mine = { status: exchange.status };
    const theirs = counterpartStatus ? { status: counterpartStatus } : null;

    return {
        _id: exchange._id.toString(),
        status: exchange.status,
        totalDecimos: exchange.totalDecimos,
        rowCount: exchange.rows.length,
        signedRowCount: exchange.rows.filter((r) => r.signed).length,
        from,
        to,
        direction: viewerGives ? pairDirection(mine, theirs) : pairDirection(theirs, mine),
        counterpartStatus,
        sentAt: exchange.sentAt?.toISOString(),
        respondedAt: exchange.respondedAt?.toISOString(),
        seenByReceiverAt: exchange.seenByReceiverAt?.toISOString(),
        createdAt: exchange.createdAt.toISOString(),
        updatedAt: exchange.updatedAt.toISOString(),
    };
}
