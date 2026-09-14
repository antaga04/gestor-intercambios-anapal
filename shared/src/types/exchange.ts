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
