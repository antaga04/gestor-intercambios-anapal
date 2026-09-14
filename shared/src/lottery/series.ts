import { LIMITS } from '../constants';

export interface SerieRange {
    from: number;
    to: number;
}

/** Sorts and merges overlapping or adjacent ranges: [{1,3},{4,6},{10,10}] → [{1,6},{10,10}]. */
export function normalizeSeries(ranges: readonly SerieRange[]): SerieRange[] {
    if (ranges.length === 0) return [];
    // Build plain objects explicitly: callers may pass mongoose subdocuments, whose own
    // enumerable properties are internals rather than `from`/`to`.
    const sorted = ranges
        .map(({ from, to }) => ({ from: Math.min(from, to), to: Math.max(from, to) }))
        .sort((a, b) => a.from - b.from || a.to - b.to);

    const merged: SerieRange[] = [sorted[0]];
    for (const range of sorted.slice(1)) {
        const last = merged[merged.length - 1];
        if (range.from <= last.to + 1) last.to = Math.max(last.to, range.to);
        else merged.push({ ...range });
    }
    return merged;
}

export function mergeSeries(a: readonly SerieRange[], b: readonly SerieRange[]): SerieRange[] {
    return normalizeSeries([...a, ...b]);
}

export function seriesContains(ranges: readonly SerieRange[], serie: number): boolean {
    return ranges.some((r) => serie >= r.from && serie <= r.to);
}

export function countSeries(ranges: readonly SerieRange[]): number {
    return normalizeSeries(ranges).reduce((acc, r) => acc + (r.to - r.from + 1), 0);
}

/** "35–74, 80" (an empty list means "unknown series"). */
export function formatSeries(ranges: readonly SerieRange[]): string {
    if (ranges.length === 0) return '';
    return normalizeSeries(ranges)
        .map((r) => (r.from === r.to ? String(r.from) : `${r.from}–${r.to}`))
        .join(', ');
}

export const isValidSerie = (serie: number): boolean =>
    Number.isInteger(serie) && serie >= LIMITS.serieMin && serie <= LIMITS.serieMax;
