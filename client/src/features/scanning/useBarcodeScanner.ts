import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { toast } from 'sonner';
import {
    decodeDecimo,
    emptyWedge,
    looksLikeScan,
    WEDGE,
    wedgeEnd,
    wedgeKey,
    type DecimoDecodificado,
    type WedgeState,
} from '@anapal/shared';
import { t } from '@/lib/messages';

interface UseBarcodeScannerOptions {
    enabled: boolean;
    onScan: (scan: DecimoDecodificado) => void;
}

/** Where the burst's keystrokes are landing, so a confirmed scan can be undone from that field. */
interface LeakTarget {
    el: HTMLInputElement;
    valueBefore: string;
}

const isTextField = (el: Element | null): el is HTMLInputElement =>
    el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit'].includes(el.type);

/**
 * Sets a controlled input's value the way React expects it (native setter + `input` event), so the
 * component's `onChange` runs and its state matches the DOM again.
 */
function setReactInputValue(el: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!setter) return;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Hardware barcode scanner support (keyboard wedge, docs/03 §5.1).
 *
 * The scanner "types" the 20-digit code into whatever is focused, so the hook listens on `window`
 * in the capture phase, buffers fast bursts, and — once a burst proves to be a scan — swallows the
 * trailing Enter and restores the field that received the keystrokes. Slow input never qualifies,
 * so hand-typed digits are left alone.
 */
export function useBarcodeScanner({ enabled, onScan }: UseBarcodeScannerOptions) {
    const [lastScanAt, setLastScanAt] = useState<number | null>(null);
    const onScanRef = useRef(onScan);
    onScanRef.current = onScan;

    useEffect(() => {
        if (!enabled) return;

        let state: WedgeState = emptyWedge();
        let leak: LeakTarget | null = null;
        let idleTimer: ReturnType<typeof setTimeout> | undefined;

        const finish = () => {
            clearTimeout(idleTimer);
            const { state: next, action } = wedgeEnd(state);
            state = next;
            const target = leak;
            leak = null;
            if (action.kind !== 'scan') return;
            // Undo the keystrokes that landed in the focused field and let React re-render before the
            // scan is applied, so `onScan` works on a draft without the leaked digits.
            if (target && target.el.isConnected) flushSync(() => setReactInputValue(target.el, target.valueBefore));
            const decoded = decodeDecimo(action.raw);
            if (!decoded) {
                toast.error(t('scan.unreadable'), { id: 'scan-unreadable' });
                return;
            }
            setLastScanAt(Date.now());
            onScanRef.current(decoded);
        };

        const otherDialogOpen = () =>
            document.querySelector('[role="dialog"][data-state="open"]:not([data-scanner-dialog])') !== null;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
            const active = document.activeElement;
            if (active instanceof HTMLTextAreaElement || otherDialogOpen()) return;

            if (event.key === 'Enter' || event.key === 'Tab') {
                if (looksLikeScan(state.buffer)) {
                    // The scanner's terminator: keep it away from forms, focus and Enter handlers.
                    event.preventDefault();
                    event.stopPropagation();
                }
                finish();
                return;
            }

            const { state: next, action } = wedgeKey(state, event.key, event.timeStamp);
            state = next;
            if (action.kind === 'ignore') return;
            if (action.kind === 'start') {
                leak = isTextField(active) ? { el: active, valueBefore: active.value } : null;
            }
            clearTimeout(idleTimer);
            idleTimer = setTimeout(finish, WEDGE.idleMs);
        };

        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            clearTimeout(idleTimer);
            window.removeEventListener('keydown', onKeyDown, true);
        };
    }, [enabled]);

    return { lastScanAt };
}
