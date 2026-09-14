/**
 * Burst detector for hardware barcode scanners that act as a keyboard ("keyboard wedge").
 * A scanner types the whole code in a few milliseconds and finishes with Enter; a person cannot.
 * Pure state machine so the browser hook stays thin and this logic is unit-tested.
 */
export const WEDGE = {
    /** Max gap between two keys for them to belong to the same burst. */
    maxGapMs: 50,
    /** Silence after the last key that ends a burst when the scanner sends no Enter. */
    idleMs: 120,
    /** A burst is only a scan when it carries at least this many digits. */
    minDigits: 20,
} as const;

export interface WedgeState {
    buffer: string;
    lastKeyAt: number | null;
}

export const emptyWedge = (): WedgeState => ({ buffer: '', lastKeyAt: null });

export type WedgeAction =
    | { kind: 'ignore' }
    /** A burst just started or restarted: the caller may snapshot where the keys are going. */
    | { kind: 'start' }
    | { kind: 'buffering' }
    /** Enter (or idle) closed a burst that looks like a scan. */
    | { kind: 'scan'; raw: string }
    /** Enter (or idle) closed a burst that is just typing. */
    | { kind: 'discard' };

const digitCount = (s: string) => s.replace(/\D/g, '').length;
export const looksLikeScan = (buffer: string) => digitCount(buffer) >= WEDGE.minDigits;

/** Feeds one printable character. */
export function wedgeKey(state: WedgeState, char: string, now: number): { state: WedgeState; action: WedgeAction } {
    if (char.length !== 1) return { state, action: { kind: 'ignore' } };
    const gap = state.lastKeyAt === null ? Infinity : now - state.lastKeyAt;
    if (gap > WEDGE.maxGapMs) {
        return { state: { buffer: char, lastKeyAt: now }, action: { kind: 'start' } };
    }
    return { state: { buffer: state.buffer + char, lastKeyAt: now }, action: { kind: 'buffering' } };
}

/** Feeds a terminator: the scanner's Enter, or the idle timer. */
export function wedgeEnd(state: WedgeState): { state: WedgeState; action: WedgeAction } {
    if (!state.buffer) return { state, action: { kind: 'ignore' } };
    const action: WedgeAction = looksLikeScan(state.buffer) ? { kind: 'scan', raw: state.buffer } : { kind: 'discard' };
    return { state: emptyWedge(), action };
}
