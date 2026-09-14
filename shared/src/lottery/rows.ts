import { LIMITS, type RowType } from '../constants';

export interface SerieFraccion {
    serie: number;
    fraccion: number;
}

export interface RowDetailsInput {
    serieFrom?: number;
    serieTo?: number;
    serie?: number;
    fraccion?: number;
    items?: SerieFraccion[];
}

export interface RowInput {
    numero: string;
    type: RowType;
    quantity: number;
    details?: RowDetailsInput;
    signed?: boolean;
    note?: string;
}

export type RowIssueCode =
    | 'row.numero_invalid'
    | 'row.quantity_out_of_range'
    | 'row.series_incomplete'
    | 'row.series_order'
    | 'row.series_count_mismatch'
    | 'row.serie_invalid'
    | 'row.fraccion_invalid'
    | 'row.decimo_incomplete'
    | 'row.items_count_mismatch'
    | 'row.items_duplicate'
    | 'row.items_required';

export interface RowIssue {
    /** Field path relative to the row, e.g. `details.serieTo`. */
    path: string;
    code: RowIssueCode;
    message: string;
}

const isSerie = (v: number | undefined): v is number =>
    typeof v === 'number' && Number.isInteger(v) && v >= LIMITS.serieMin && v <= LIMITS.serieMax;
const isFraccion = (v: number | undefined): v is number =>
    typeof v === 'number' && Number.isInteger(v) && v >= LIMITS.fraccionMin && v <= LIMITS.fraccionMax;

/**
 * Validates one row against the rules in docs/03-domain-logic.md §2.
 * Details are optional everywhere: an admon may not know the series it will send.
 */
export function validateRow(row: RowInput): RowIssue[] {
    const issues: RowIssue[] = [];
    const push = (path: string, code: RowIssueCode, message: string) => issues.push({ path, code, message });

    if (!/^\d{5}$/.test(row.numero)) push('numero', 'row.numero_invalid', 'El número debe tener 5 dígitos');

    const details = row.details ?? {};

    if (row.type === 'billete') {
        if (!Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > LIMITS.billetesMax) {
            push('quantity', 'row.quantity_out_of_range', `Entre 1 y ${LIMITS.billetesMax} billetes`);
        }
        const { serieFrom, serieTo } = details;
        const hasFrom = serieFrom !== undefined;
        const hasTo = serieTo !== undefined;
        if (hasFrom !== hasTo) {
            push('details.serieTo', 'row.series_incomplete', 'Indica la serie inicial y la final, o ninguna');
        } else if (hasFrom && hasTo) {
            if (!isSerie(serieFrom) || !isSerie(serieTo)) {
                push(
                    'details.serieFrom',
                    'row.serie_invalid',
                    `Las series van de ${LIMITS.serieMin} a ${LIMITS.serieMax}`,
                );
            } else if (serieFrom > serieTo) {
                push('details.serieTo', 'row.series_order', 'La serie final debe ser mayor o igual que la inicial');
            } else if (serieTo - serieFrom + 1 !== row.quantity) {
                push(
                    'details.serieTo',
                    'row.series_count_mismatch',
                    `El rango ${serieFrom}–${serieTo} son ${serieTo - serieFrom + 1} billetes, pero la cantidad es ${row.quantity}`,
                );
            }
        }
        return issues;
    }

    if (row.type === 'decimo') {
        if (row.quantity !== 1) push('quantity', 'row.quantity_out_of_range', 'Un décimo es siempre 1');
        const { serie, fraccion } = details;
        const hasSerie = serie !== undefined;
        const hasFraccion = fraccion !== undefined;
        if (hasSerie !== hasFraccion) {
            push('details.fraccion', 'row.decimo_incomplete', 'Indica serie y fracción, o ninguna de las dos');
        } else if (hasSerie && hasFraccion) {
            if (!isSerie(serie))
                push('details.serie', 'row.serie_invalid', `Las series van de ${LIMITS.serieMin} a ${LIMITS.serieMax}`);
            if (!isFraccion(fraccion)) {
                push(
                    'details.fraccion',
                    'row.fraccion_invalid',
                    `Las fracciones van de ${LIMITS.fraccionMin} a ${LIMITS.fraccionMax}`,
                );
            }
        }
        return issues;
    }

    // decimos: several décimos of the same número, any serie/fracción
    if (!Number.isInteger(row.quantity) || row.quantity < 2 || row.quantity > LIMITS.decimosMax) {
        push('quantity', 'row.quantity_out_of_range', `Entre 2 y ${LIMITS.decimosMax} décimos`);
    }
    const items = details.items;
    if (items && items.length > 0) {
        const seen = new Set<string>();
        items.forEach((item, index) => {
            if (!isSerie(item.serie)) push(`details.items.${index}.serie`, 'row.serie_invalid', 'Serie no válida');
            if (!isFraccion(item.fraccion))
                push(`details.items.${index}.fraccion`, 'row.fraccion_invalid', 'Fracción no válida');
            const key = `${item.serie}-${item.fraccion}`;
            if (seen.has(key)) {
                push(
                    `details.items.${index}`,
                    'row.items_duplicate',
                    `Serie ${item.serie} fracción ${item.fraccion} está repetida`,
                );
            }
            seen.add(key);
        });
        if (items.length !== row.quantity) {
            push(
                'details.items',
                'row.items_count_mismatch',
                `Has detallado ${items.length} décimos pero la cantidad es ${row.quantity}`,
            );
        }
    }
    return issues;
}

/** Series referenced by a row, used to warn against "Mi lotería". */
export function rowSeries(row: RowInput): number[] {
    const details = row.details ?? {};
    if (row.type === 'billete') {
        if (details.serieFrom === undefined || details.serieTo === undefined) return [];
        const series: number[] = [];
        for (let serie = details.serieFrom; serie <= details.serieTo; serie++) series.push(serie);
        return series;
    }
    if (row.type === 'decimo') return details.serie === undefined ? [] : [details.serie];
    return [...new Set((details.items ?? []).map((i) => i.serie))];
}

/** Human-readable detail of a row: "Series 40–74", "Serie 3 · fracción 7", "3 décimos detallados". */
export function describeRowDetails(row: RowInput): string {
    const details = row.details ?? {};
    if (row.type === 'billete') {
        if (details.serieFrom === undefined || details.serieTo === undefined) return 'Series sin especificar';
        return details.serieFrom === details.serieTo
            ? `Serie ${details.serieFrom}`
            : `Series ${details.serieFrom}–${details.serieTo}`;
    }
    if (row.type === 'decimo') {
        if (details.serie === undefined || details.fraccion === undefined) return 'Serie y fracción sin especificar';
        return `Serie ${details.serie} · fracción ${details.fraccion}`;
    }
    const items = details.items ?? [];
    if (items.length === 0) return 'Series y fracciones sin especificar';
    return items.map((i) => `${i.serie}/${i.fraccion}`).join(', ');
}

export const ROW_TYPE_LABELS: Record<RowType, string> = {
    billete: 'Billete',
    decimo: '1 décimo',
    decimos: 'Varios décimos',
};

// ---------------------------------------------------------------------------------------------
// Scanning (docs/03 §5.3)
// ---------------------------------------------------------------------------------------------

/** The flat shape the editor keeps while a row is being written; the client's `RowDraft` extends it. */
export interface ScanRow {
    numero: string;
    type: RowType;
    quantity: number;
    serieFrom?: number;
    serieTo?: number;
    serie?: number;
    fraccion?: number;
    items: SerieFraccion[];
}

export type ScanEvent =
    /** billete: first serie of a range captured. */
    | 'series_start'
    /** billete: second scan closed the range (in either order). */
    | 'series_end'
    /** decimo: serie and fracción set (a later scan overwrites). */
    | 'set'
    /** decimos: a new serie/fracción pair appended. */
    | 'appended'
    /** decimos: that serie/fracción was already in the row; nothing changed. */
    | 'duplicate'
    /** Different número than the row being edited: the returned row is the fresh one for it. */
    | 'new_row';

export interface ScanInput {
    numero: string;
    serie: string | number;
    fraccion: string | number;
}

/** Row details cleared and número taken from the scan; everything else (type, flags…) untouched. */
function freshFromScan<T extends ScanRow>(row: T, numero: string): T {
    return {
        ...row,
        numero,
        quantity: 1,
        serieFrom: undefined,
        serieTo: undefined,
        serie: undefined,
        fraccion: undefined,
        items: [],
    };
}

function applyScan<T extends ScanRow>(row: T, serie: number, fraccion: number): { row: T; event: ScanEvent } {
    if (row.type === 'billete') {
        const { serieFrom, serieTo } = row;
        // First scan, or a third one after a closed range: (re)start the range with this serie.
        if (serieFrom === undefined || serieTo !== undefined) {
            return { row: { ...row, serieFrom: serie, serieTo: undefined, quantity: 1 }, event: 'series_start' };
        }
        const from = Math.min(serieFrom, serie);
        const to = Math.max(serieFrom, serie);
        return { row: { ...row, serieFrom: from, serieTo: to, quantity: to - from + 1 }, event: 'series_end' };
    }
    if (row.type === 'decimo') {
        return { row: { ...row, serie, fraccion, quantity: 1 }, event: 'set' };
    }
    if (row.items.some((i) => i.serie === serie && i.fraccion === fraccion)) {
        return { row, event: 'duplicate' };
    }
    const items = [...row.items, { serie, fraccion }];
    return { row: { ...row, items, quantity: items.length }, event: 'appended' };
}

/**
 * Applies a decoded décimo to the row being edited. Pure: the caller decides what to do on
 * `new_row` (commit the previous row if valid, otherwise keep it and warn).
 */
export function mergeScanIntoRow<T extends ScanRow>(row: T, scan: ScanInput): { row: T; event: ScanEvent } {
    const serie = Number(scan.serie);
    const fraccion = Number(scan.fraccion);
    if (row.numero !== '' && row.numero !== scan.numero) {
        const next = applyScan(freshFromScan(row, scan.numero), serie, fraccion);
        return { row: next.row, event: 'new_row' };
    }
    const target = row.numero === '' ? freshFromScan(row, scan.numero) : row;
    return applyScan(target, serie, fraccion);
}

/** Toast title for a scan event, e.g. "Rango 35–74 · 40 billetes". */
export function describeScanEvent(event: ScanEvent, row: ScanRow): string {
    switch (event) {
        case 'series_start':
            return `Serie inicial ${row.serieFrom}. Escanea la última serie del rango.`;
        case 'series_end':
            return row.serieFrom === row.serieTo
                ? `Serie ${row.serieFrom} · 1 billete`
                : `Rango ${row.serieFrom}–${row.serieTo} · ${row.quantity} billetes`;
        case 'set':
            return `Serie ${row.serie} · fracción ${row.fraccion}`;
        case 'appended':
            return `Décimo añadido (${row.items.length})`;
        case 'duplicate':
            return 'Ya has escaneado este décimo';
        case 'new_row':
            return `Nuevo número detectado: ${row.numero}`;
    }
}
