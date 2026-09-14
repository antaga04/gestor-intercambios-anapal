import type { ExchangeStatus } from '@anapal/shared';
import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';

const STYLES: Record<ExchangeStatus, string> = {
    draft: 'bg-muted text-muted-foreground',
    pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    accepted: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    rejected: 'bg-destructive/15 text-destructive',
    cancelled: 'bg-muted text-muted-foreground line-through',
};

export function StatusBadge({ status, className }: { status: ExchangeStatus; className?: string }) {
    return (
        <Badge variant="outline" className={cn('border-transparent', STYLES[status], className)}>
            {STATUS_LABELS[status]}
        </Badge>
    );
}
