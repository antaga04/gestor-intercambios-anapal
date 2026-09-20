import { DECIMOS_PER_BILLETE, LIMITS, type RowType } from '../constants';
import { exchangeRowSchema, type ExchangeRowInput } from '../schemas/exchange';

/**
 * One `operaciones` line of the previous app, already typed. `billetes` is what the user entered in that app:
 * billetes, possibly fractional (0,1 = one décimo); `numero` is the raw text (may be empty or free text).
 */
export interface LegacyLineInput {
    id: string;
    numero?: string | null;
    serie?: number | null;
    fraccion?: number | null;
    billetes: number;
    sellado: boolean;
    modo: RowType;
}

export interface ConvertedRow {
    row: ExchangeRowInput;
    /** Lines merged into this row. */
    lineIds: string[];
}

export interface SkippedLine {
    line: LegacyLineInput;
    reason: string;
}

export interface LegacyRowConversion {
    rows: ConvertedRow[];
    skipped: SkippedLine[];
}

const isSerie = (v: number | null | undefined): v is number =>
    typeof v === 'number' && Number.isInteger(v) && v >= LIMITS.serieMin && v <= LIMITS.serieMax;
const isFraccion = (v: number | null | undefined): v is number =>
    typeof v === 'number' && Number.isInteger(v) && v >= LIMITS.fraccionMin && v <= LIMITS.fraccionMax;

/** "7" → "00007"; free text such as "SALP" → undefined. */
function normalizeNumero(raw: string | null | undefined): string | undefined {
    const text = (raw ?? '').trim();
    if (!/^\d{1,5}$/.test(text)) return undefined;
    return text.padStart(LIMITS.numeroLength, '0');
}

const decimosOf = (line: LegacyLineInput) => Math.round(line.billetes * DECIMOS_PER_BILLETE);

/** "serie 205, fracción 4" — what the old line carried, for the row note when it does not fit the new fields. */
function describeSerie(line: LegacyLineInput): string | undefined {
    const parts: string[] = [];
    if (line.serie != null) parts.push(`serie ${line.serie}`);
    if (line.fraccion != null) parts.push(`fracción ${line.fraccion}`);
    return parts.length ? parts.join(', ') : undefined;
}

function describeLine(line: LegacyLineInput): string {
    const d = decimosOf(line);
    const amount =
        line.modo === 'billete'
            ? `${line.billetes} ${line.billetes === 1 ? 'billete' : 'billetes'}`
            : `${d} ${d === 1 ? 'décimo' : 'décimos'}`;
    const serie = describeSerie(line);
    return serie ? `${amount} (${serie})` : amount;
}

const note = (text: string) => `Importado: ${text}`.slice(0, LIMITS.rowNoteMax);

/** Builds one row from all the lines of a número (same intercambio, same direction). */
function groupToRow(numero: string, lines: LegacyLineInput[]): ExchangeRowInput {
    const signed = lines.every((line) => line.sellado);

    if (lines.every((line) => line.modo === 'billete')) {
        const quantity = lines.reduce((acc, line) => acc + line.billetes, 0);
        return { numero, type: 'billete', quantity, signed };
    }

    const total = lines.reduce((acc, line) => acc + decimosOf(line), 0);

    if (lines.length === 1) {
        const [line] = lines;
        if (total === 1) {
            const details =
                isSerie(line.serie) && isFraccion(line.fraccion)
                    ? { serie: line.serie, fraccion: line.fraccion }
                    : undefined;
            const serie = describeSerie(line);
            return {
                numero,
                type: 'decimo',
                quantity: 1,
                details,
                signed,
                note: !details && serie ? note(serie) : undefined,
            };
        }
        const serie = describeSerie(line);
        return {
            numero,
            type: 'decimos',
            quantity: total,
            signed,
            note: serie ? note(`${total} décimos, ${serie}`) : undefined,
        };
    }

    // Several lines of the same número: loose décimos, with the concrete list only when every line names one.
    const items = lines.map((line) => ({ serie: line.serie, fraccion: line.fraccion }));
    const concrete =
        lines.every((line) => line.modo === 'decimo' && decimosOf(line) === 1) &&
        items.every((i): i is { serie: number; fraccion: number } => isSerie(i.serie) && isFraccion(i.fraccion)) &&
        new Set(items.map((i) => `${i.serie}/${i.fraccion}`)).size === items.length;
    if (total === 1) {
        return { numero, type: 'decimo', quantity: 1, signed, note: note(lines.map(describeLine).join(' + ')) };
    }
    return {
        numero,
        type: 'decimos',
        quantity: total,
        details: concrete ? { items: items as { serie: number; fraccion: number }[] } : undefined,
        signed,
        note: concrete ? undefined : note(lines.map(describeLine).join(' + ')),
    };
}

/**
 * Converts the lines of one old intercambio (one direction) into rows of the current model.
 * Lines without a valid 5-digit número cannot become rows; lines sharing a número are merged into one row.
 * Every produced row passes `exchangeRowSchema`; anything else is reported in `skipped` with the reason.
 */
export function legacyLinesToRows(lines: LegacyLineInput[]): LegacyRowConversion {
    const skipped: SkippedLine[] = [];
    const groups = new Map<string, LegacyLineInput[]>();

    for (const line of lines) {
        const numero = normalizeNumero(line.numero);
        if (!numero) {
            const raw = (line.numero ?? '').trim();
            skipped.push({ line, reason: raw ? `número no válido ("${raw}")` : 'sin número' });
            continue;
        }
        if (decimosOf(line) < 1) {
            skipped.push({ line, reason: 'cantidad cero' });
            continue;
        }
        const group = groups.get(numero);
        if (group) group.push(line);
        else groups.set(numero, [line]);
    }

    const rows: ConvertedRow[] = [];
    for (const [numero, group] of groups) {
        const candidate = groupToRow(numero, group);
        const parsed = exchangeRowSchema.safeParse(candidate);
        if (parsed.success) {
            rows.push({ row: parsed.data, lineIds: group.map((line) => line.id) });
        } else {
            const reason = parsed.error.issues.map((i) => i.message).join('; ');
            for (const line of group) skipped.push({ line, reason });
        }
    }
    return { rows, skipped };
}
