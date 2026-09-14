import { PenLine } from 'lucide-react';
import { formatBilletes, formatInt } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ExchangeTotalsProps {
    rowCount: number;
    decimos: number;
    signedCount: number;
    className?: string;
}

export function ExchangeTotals({ rowCount, decimos, signedCount, className }: ExchangeTotalsProps) {
    return (
        <div className={cn('flex flex-wrap items-center gap-x-6 gap-y-2 text-sm', className)}>
            <span className="text-muted-foreground">
                {formatInt(rowCount)} {rowCount === 1 ? 'fila' : 'filas'}
            </span>
            <span className="text-muted-foreground">{formatInt(decimos)} décimos</span>
            <span className="text-base font-semibold text-primary">{formatBilletes(decimos)} billetes</span>
            {signedCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <PenLine className="size-3.5" /> {formatInt(signedCount)} firmado{signedCount === 1 ? '' : 's'}
                </span>
            )}
        </div>
    );
}
