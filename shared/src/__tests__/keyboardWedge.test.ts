import { WEDGE, emptyWedge, looksLikeScan, wedgeEnd, wedgeKey, type WedgeState } from '../lottery/keyboardWedge';

const CODE = '61020070350123459876';

/** Types `text` with a fixed gap between keys and returns the final state plus the actions seen. */
function type(state: WedgeState, text: string, gapMs: number, startAt = 1000) {
    const actions: string[] = [];
    let now = startAt;
    for (const char of text) {
        const r = wedgeKey(state, char, now);
        state = r.state;
        actions.push(r.action.kind);
        now += gapMs;
    }
    return { state, actions, now };
}

describe('keyboard wedge burst detection', () => {
    it('accepts a 20-digit burst finished with Enter', () => {
        const { state, actions } = type(emptyWedge(), CODE, 10);
        expect(actions[0]).toBe('start');
        expect(new Set(actions.slice(1))).toEqual(new Set(['buffering']));
        expect(wedgeEnd(state)).toEqual({ state: emptyWedge(), action: { kind: 'scan', raw: CODE } });
    });

    it('accepts a burst with separators as long as it carries 20 digits', () => {
        const { state } = type(emptyWedge(), '6102-0-07-035-0-12345-9876', 5);
        expect(wedgeEnd(state).action.kind).toBe('scan');
    });

    it('does not accept 20 digits typed by hand', () => {
        // ~120 ms between keys is already a very fast typist.
        const { state, actions } = type(emptyWedge(), CODE, 120);
        expect(actions.every((a) => a === 'start')).toBe(true);
        expect(state.buffer).toBe(CODE.at(-1));
        expect(wedgeEnd(state).action.kind).toBe('discard');
    });

    it('restarts the burst after a gap longer than the threshold', () => {
        const first = type(emptyWedge(), '12345', 10);
        const r = wedgeKey(first.state, '6', first.now + WEDGE.maxGapMs + 1);
        expect(r.action.kind).toBe('start');
        expect(r.state.buffer).toBe('6');
    });

    it('discards short bursts', () => {
        const { state } = type(emptyWedge(), '12345', 10);
        expect(wedgeEnd(state).action.kind).toBe('discard');
        expect(looksLikeScan('12345')).toBe(false);
    });

    it('ignores non-printable input and an Enter with nothing buffered', () => {
        expect(wedgeKey(emptyWedge(), 'Shift', 0).action.kind).toBe('ignore');
        expect(wedgeEnd(emptyWedge()).action.kind).toBe('ignore');
    });
});
