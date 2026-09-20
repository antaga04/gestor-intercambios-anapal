import type { ExchangeStatus, PairDirection, RowType } from '../constants';
import type { PublicUser } from './user';

export interface ExchangeRowDetails {
    serieFrom?: number;
    serieTo?: number;
    serie?: number;
    fraccion?: number;
    items?: { serie: number; fraccion: number }[];
}

export interface ExchangeRow {
    _id: string;
    numero: string;
    type: RowType;
    quantity: number;
    amountDecimos: number;
    details?: ExchangeRowDetails;
    signed: boolean;
    note?: string;
}

export interface ExchangeSummary {
    _id: string;
    status: ExchangeStatus;
    totalDecimos: number;
    rowCount: number;
    signedRowCount: number;
    from: PublicUser;
    to: PublicUser;
    /** Relative to the viewer: `da` = I give, `recibe` = I receive, `ambos` = both directions exist. */
    direction: PairDirection;
    counterpartStatus?: ExchangeStatus;
    /** Id of the reverse exchange, when the viewer may know it exists. */
    counterpartId?: string;
    sentAt?: string;
    respondedAt?: string;
    seenByReceiverAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ExchangeDetail extends ExchangeSummary {
    rows: ExchangeRow[];
    note?: string;
    rejectReason?: string;
    campaign: { _id: string; name: string; exchangeDeadline: string };
}

/**
 * Result of `POST /exchanges/overlap`: which of the numbers I plan to give the receiver already owns
 * ("Mi lotería") and which ones they already give me in their live envelope. Both are advisory only.
 */
export interface ExchangeOverlap {
    inTheirLottery: string[];
    inTheirEnvelope: string[];
}
