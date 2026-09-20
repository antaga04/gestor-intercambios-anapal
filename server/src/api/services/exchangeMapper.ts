import {
    pairDirection,
    type ExchangeDetail,
    type ExchangeRow,
    type ExchangeStatus,
    type ExchangeSummary,
    type PublicUser,
} from '@anapal/shared';
import type { CampaignDocument } from '@/api/models/campaign';
import type { ExchangeDocument, ExchangeRowSubdocument } from '@/api/models/exchange';
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
    const counterpartId = exchange.counterpart
        ? String((exchange.counterpart as { _id?: unknown })._id ?? exchange.counterpart)
        : undefined;
    const from = asPublicUser(exchange.from);
    const to = asPublicUser(exchange.to);
    const viewerGives = from._id === viewerId;
    // The counterpart (to → from) belongs to `to`; while it is a draft nobody else may know it exists.
    const visibleCounterpartStatus =
        counterpartStatus === 'draft' && to._id !== viewerId ? undefined : counterpartStatus;
    const mine = { status: exchange.status };
    const theirs = visibleCounterpartStatus ? { status: visibleCounterpartStatus } : null;

    return {
        _id: exchange._id.toString(),
        status: exchange.status,
        totalDecimos: exchange.totalDecimos,
        rowCount: exchange.rows.length,
        signedRowCount: exchange.rows.filter((r) => r.signed).length,
        from,
        to,
        direction: viewerGives ? pairDirection(mine, theirs) : pairDirection(theirs, mine),
        counterpartStatus: visibleCounterpartStatus,
        counterpartId: visibleCounterpartStatus ? counterpartId : undefined,
        sentAt: exchange.sentAt?.toISOString(),
        respondedAt: exchange.respondedAt?.toISOString(),
        seenByReceiverAt: exchange.seenByReceiverAt?.toISOString(),
        createdAt: exchange.createdAt.toISOString(),
        updatedAt: exchange.updatedAt.toISOString(),
    };
}

function toRowDto(row: ExchangeRowSubdocument): ExchangeRow {
    const details = row.details;
    return {
        _id: row._id.toString(),
        numero: row.numero,
        type: row.type,
        quantity: row.quantity,
        amountDecimos: row.amountDecimos,
        details: details
            ? {
                  serieFrom: details.serieFrom ?? undefined,
                  serieTo: details.serieTo ?? undefined,
                  serie: details.serie ?? undefined,
                  fraccion: details.fraccion ?? undefined,
                  items: details.items?.length
                      ? details.items.map((i) => ({ serie: i.serie, fraccion: i.fraccion }))
                      : undefined,
              }
            : undefined,
        signed: row.signed,
        note: row.note ?? undefined,
    };
}

export function toExchangeDetail(
    exchange: ExchangeDocument,
    viewerId: string,
    campaign: CampaignDocument,
    counterpartStatus?: ExchangeStatus,
): ExchangeDetail {
    return {
        ...toExchangeSummary(exchange, viewerId, counterpartStatus),
        rows: exchange.rows.map(toRowDto),
        note: exchange.note ?? undefined,
        rejectReason: exchange.rejectReason ?? undefined,
        campaign: {
            _id: campaign._id.toString(),
            name: campaign.name,
            exchangeDeadline: campaign.exchangeDeadline.toISOString(),
        },
        legacy: exchange.legacy ? { skippedLines: exchange.legacy.skippedLines } : undefined,
    };
}
