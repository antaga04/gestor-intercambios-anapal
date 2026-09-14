import { DECIMOS_PER_BILLETE, type RowType } from '../constants';

export interface RowAmountInput {
    type: RowType;
    quantity: number;
}

/** Décimos represented by a row: billetes count 10 each, the other types are already décimos. */
export function rowAmountDecimos(row: RowAmountInput): number {
    return row.type === 'billete' ? row.quantity * DECIMOS_PER_BILLETE : row.quantity;
}

export function exchangeTotalDecimos(rows: readonly RowAmountInput[]): number {
    return rows.reduce((acc, row) => acc + rowAmountDecimos(row), 0);
}

export function toBilletes(decimos: number): number {
    return decimos / DECIMOS_PER_BILLETE;
}

const billetesFormatter = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 24 décimos → "2,4" */
export function formatBilletes(decimos: number): string {
    return billetesFormatter.format(toBilletes(decimos));
}
