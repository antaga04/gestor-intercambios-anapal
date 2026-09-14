import { LIMITS } from '../constants';
import { isValidSerie, mergeSeries, type SerieRange } from './series';

export interface ParsedLotteryRow {
    numero: string;
    series: SerieRange[];
    /** 1-based source lines this número came from (several when the file repeats it). */
    lines: number[];
}

export interface LotteryParseIssue {
    line: number;
    raw: string;
    message: string;
}

export interface LotteryParseResult {
    rows: ParsedLotteryRow[];
    issues: LotteryParseIssue[];
    /** Números that appeared more than once and were merged. */
    mergedCount: number;
}

const SEPARATORS = /[;,\t\s]+/;

/**
 * Parses a pasted list or CSV/TXT file. One número per line:
 *   `12345`            → número only
 *   `12345;40;74`      → número + serie range
 *   `12345;40`         → número + a single serie
 * `;`, `,`, tabs and spaces all work as separators. Números shorter than 5 digits are left-padded
 * with zeros (`7` → `00007`). Blank lines and `#` comments are ignored; repeated números merge their series.
 */
export function parseLotteryList(text: string): LotteryParseResult {
    const byNumero = new Map<string, ParsedLotteryRow>();
    const issues: LotteryParseIssue[] = [];
    let mergedCount = 0;

    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const line = i + 1;
        const trimmed = raw.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const parts = trimmed.split(SEPARATORS).filter(Boolean);
        const [rawNumero, rawFrom, rawTo, ...extra] = parts;

        if (!/^\d{1,5}$/.test(rawNumero)) {
            issues.push({ line, raw: trimmed, message: 'El número debe tener entre 1 y 5 dígitos' });
            continue;
        }
        if (extra.length > 0) {
            issues.push({ line, raw: trimmed, message: 'Formato no reconocido (número;serie desde;serie hasta)' });
            continue;
        }

        const numero = rawNumero.padStart(LIMITS.numeroLength, '0');
        let series: SerieRange[] = [];
        if (rawFrom !== undefined) {
            const from = Number(rawFrom);
            const to = rawTo === undefined ? from : Number(rawTo);
            if (!isValidSerie(from) || !isValidSerie(to)) {
                issues.push({
                    line,
                    raw: trimmed,
                    message: `Las series deben estar entre ${LIMITS.serieMin} y ${LIMITS.serieMax}`,
                });
                continue;
            }
            series = [{ from: Math.min(from, to), to: Math.max(from, to) }];
        }

        const existing = byNumero.get(numero);
        if (existing) {
            mergedCount++;
            existing.series = mergeSeries(existing.series, series);
            existing.lines.push(line);
        } else {
            byNumero.set(numero, { numero, series, lines: [line] });
        }
    }

    return { rows: [...byNumero.values()], issues, mergedCount };
}
