import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export type EnvelopeKind = 'out' | 'in';

/** Each direction keeps its own colour everywhere on the page so the two halves never look alike. */
export const ENVELOPE_STYLE: Record<
    EnvelopeKind,
    { icon: typeof ArrowUpRight; border: string; iconBox: string; text: string; label: string }
> = {
    out: {
        icon: ArrowUpRight,
        border: 'border-t-primary',
        iconBox: 'bg-primary/12 text-primary',
        text: 'text-primary',
        label: 'Doy',
    },
    in: {
        icon: ArrowDownLeft,
        border: 'border-t-sky-500',
        iconBox: 'bg-sky-500/12 text-sky-700 dark:text-sky-400',
        text: 'text-sky-700 dark:text-sky-400',
        label: 'Recibo',
    },
};
