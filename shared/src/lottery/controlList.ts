import type { ExchangeStatus, PairDirection } from '../constants';
import type { ExchangeSummary } from '../types/exchange';
import type { PublicUser } from '../types/user';
import { formatBilletes } from './amounts';
import { isLiveStatus, pairDirection } from './direction';

export interface ControlListSide {
    exchangeId: string;
    status: ExchangeStatus;
    decimos: number;
}

export interface ControlListRow {
    counterpart: PublicUser;
    /** My outgoing envelope to them. */
    gives: ControlListSide | null;
    /** Their outgoing envelope to me. */
    receives: ControlListSide | null;
    direction: PairDirection;
}

export interface ControlListTotals {
    envelopesToSend: number;
    envelopesToReceive: number;
    decimosOut: number;
    decimosIn: number;
    /** Outgoing drafts not yet sent (a reminder, not counted above). */
    drafts: number;
}

export interface ControlList {
    rows: ControlListRow[];
    totals: ControlListTotals;
}

/** Statuses whose envelope will actually travel. */
export const COUNTED_STATUS: readonly ExchangeStatus[] = ['pending', 'accepted'];
const isCounted = (side: ControlListSide | null): boolean => !!side && COUNTED_STATUS.includes(side.status);

/** Receptor numbers are digits, but compare as text with numeric collation so "9" < "10" and odd values still sort. */
export const compareReceptor = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true });

const toSide = (e: ExchangeSummary): ControlListSide => ({
    exchangeId: e._id,
    status: e.status,
    decimos: e.totalDecimos,
});

/**
 * Builds the "Lista de control" of `meId` from every exchange they take part in (both directions,
 * docs/03 §7). Only live exchanges (draft/pending/accepted) form a row; rejected and cancelled ones
 * are not envelopes. Incoming drafts are ignored: the other admon has not sent them yet.
 */
export function buildControlList(exchanges: ExchangeSummary[], meId: string): ControlList {
    const byCounterpart = new Map<string, ControlListRow>();

    for (const exchange of exchanges) {
        if (!isLiveStatus(exchange.status)) continue;
        const gives = exchange.from._id === meId;
        if (!gives && exchange.to._id !== meId) continue;
        if (!gives && exchange.status === 'draft') continue;

        const counterpart = gives ? exchange.to : exchange.from;
        const row = byCounterpart.get(counterpart._id) ?? { counterpart, gives: null, receives: null, direction: 'da' };
        if (gives) row.gives = toSide(exchange);
        else row.receives = toSide(exchange);
        byCounterpart.set(counterpart._id, row);
    }

    const rows = [...byCounterpart.values()]
        .map((row) => ({ ...row, direction: pairDirection(row.gives, row.receives) }))
        .sort((a, b) => compareReceptor(a.counterpart.receptorNumber, b.counterpart.receptorNumber));

    const totals = rows.reduce<ControlListTotals>(
        (acc, row) => {
            if (row.gives && isCounted(row.gives)) {
                acc.envelopesToSend += 1;
                acc.decimosOut += row.gives.decimos;
            } else if (row.gives?.status === 'draft') {
                acc.drafts += 1;
            }
            if (row.receives && isCounted(row.receives)) {
                acc.envelopesToReceive += 1;
                acc.decimosIn += row.receives.decimos;
            }
            return acc;
        },
        { envelopesToSend: 0, envelopesToReceive: 0, decimosOut: 0, decimosIn: 0, drafts: 0 },
    );

    return { rows, totals };
}

export const EXCHANGE_STATUS_LABELS: Record<ExchangeStatus, string> = {
    draft: 'Borrador',
    pending: 'Pendiente',
    accepted: 'Aceptado',
    rejected: 'Rechazado',
    cancelled: 'Cancelado',
};

export const PAIR_DIRECTION_LABELS: Record<PairDirection, string> = {
    da: 'Doy',
    recibe: 'Recibo',
    ambos: 'Ambos',
};

/** Excel (Spanish locale) friendly: `;` separated, CRLF, UTF-8 BOM, quotes only where needed. */
export const CSV_BOM = '﻿';

const csvCell = (value: string | number) => {
    const text = String(value);
    return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const CONTROL_LIST_CSV_HEADER = [
    'Nº receptor',
    'Administración',
    'Población',
    'Provincia',
    'Doy (billetes)',
    'Estado doy',
    'Recibo (billetes)',
    'Estado recibo',
    'Dirección',
] as const;

export function controlListToCsv(list: ControlList): string {
    const lines = [CONTROL_LIST_CSV_HEADER.join(';')];
    for (const row of list.rows) {
        lines.push(
            [
                row.counterpart.receptorNumber,
                row.counterpart.name,
                row.counterpart.poblacion,
                row.counterpart.provincia,
                row.gives ? formatBilletes(row.gives.decimos) : '',
                row.gives ? EXCHANGE_STATUS_LABELS[row.gives.status] : '',
                row.receives ? formatBilletes(row.receives.decimos) : '',
                row.receives ? EXCHANGE_STATUS_LABELS[row.receives.status] : '',
                PAIR_DIRECTION_LABELS[row.direction],
            ]
                .map(csvCell)
                .join(';'),
        );
    }
    lines.push('');
    lines.push(['Sobres a enviar', list.totals.envelopesToSend].map(csvCell).join(';'));
    lines.push(['Sobres a recibir', list.totals.envelopesToReceive].map(csvCell).join(';'));
    lines.push(['Billetes que doy', formatBilletes(list.totals.decimosOut)].map(csvCell).join(';'));
    lines.push(['Billetes que recibo', formatBilletes(list.totals.decimosIn)].map(csvCell).join(';'));
    lines.push(['Borradores sin enviar', list.totals.drafts].map(csvCell).join(';'));
    return CSV_BOM + lines.join('\r\n') + '\r\n';
}
