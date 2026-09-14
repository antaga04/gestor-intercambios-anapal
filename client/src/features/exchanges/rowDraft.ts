import type { ExchangeRow, ExchangeRowInput, RowType, SerieFraccion } from '@anapal/shared';
import { rowAmountDecimos } from '@anapal/shared';

/** A row while it is being edited: everything optional, quantity derived where possible. */
export interface RowDraft {
    key: string;
    numero: string;
    type: RowType;
    quantity: number;
    serieFrom?: number;
    serieTo?: number;
    serie?: number;
    fraccion?: number;
    items: SerieFraccion[];
    signed: boolean;
    note?: string;
}

export const newKey = () => Math.random().toString(36).slice(2, 10);

export function emptyDraft(type: RowType): RowDraft {
    return { key: newKey(), numero: '', type, quantity: type === 'decimo' ? 1 : 1, items: [], signed: false };
}

export function draftFromRow(row: ExchangeRow): RowDraft {
    return {
        key: row._id,
        numero: row.numero,
        type: row.type,
        quantity: row.quantity,
        serieFrom: row.details?.serieFrom,
        serieTo: row.details?.serieTo,
        serie: row.details?.serie,
        fraccion: row.details?.fraccion,
        items: row.details?.items ?? [],
        signed: row.signed,
        note: row.note,
    };
}

/** Shape expected by `validateRow` and by the API. */
export function draftToRow(draft: RowDraft): ExchangeRowInput {
    const base = { numero: draft.numero, signed: draft.signed, note: draft.note || undefined };
    if (draft.type === 'billete') {
        const details =
            draft.serieFrom !== undefined || draft.serieTo !== undefined
                ? { serieFrom: draft.serieFrom, serieTo: draft.serieTo }
                : undefined;
        return { ...base, type: 'billete', quantity: draft.quantity, details };
    }
    if (draft.type === 'decimo') {
        const details =
            draft.serie !== undefined || draft.fraccion !== undefined
                ? { serie: draft.serie, fraccion: draft.fraccion }
                : undefined;
        return { ...base, type: 'decimo', quantity: 1, details };
    }
    return {
        ...base,
        type: 'decimos',
        quantity: draft.quantity,
        details: draft.items.length > 0 ? { items: draft.items } : undefined,
    };
}

export const draftAmountDecimos = (draft: RowDraft) => rowAmountDecimos(draftToRow(draft));

/** Quantity that can be derived from the details (range size or number of détailed décimos). */
export function derivedQuantity(draft: RowDraft): number | null {
    if (draft.type === 'billete' && draft.serieFrom !== undefined && draft.serieTo !== undefined) {
        return draft.serieTo >= draft.serieFrom ? draft.serieTo - draft.serieFrom + 1 : null;
    }
    if (draft.type === 'decimo') return 1;
    if (draft.type === 'decimos' && draft.items.length > 0) return draft.items.length;
    return null;
}

export const parseNumberInput = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : undefined;
};
