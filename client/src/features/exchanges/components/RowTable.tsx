import { AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { ROW_TYPE_LABELS, describeRowDetails } from '@anapal/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { draftAmountDecimos, draftToRow, type RowDraft } from '@/features/exchanges/rowDraft';
import { ROW_WARNING_TEXT, type RowWarningsFn } from '@/features/exchanges/warnings';
import { formatBilletes } from '@/lib/format';
import { cn } from '@/lib/utils';

interface RowTableProps {
    rows: RowDraft[];
    onEdit?: (row: RowDraft) => void;
    onRemove?: (row: RowDraft) => void;
    editingKey?: string;
    /** Advisory hints per row (amber icon + tooltip). Nothing is checked when omitted. */
    warningsFor?: RowWarningsFn;
    /** Merges "Tipo" and "Cantidad" into one column — for half-width layouts. */
    compact?: boolean;
}

function quantityLabel(row: RowDraft) {
    if (row.type === 'billete') return `${row.quantity} ${row.quantity === 1 ? 'billete' : 'billetes'}`;
    return `${row.quantity} ${row.quantity === 1 ? 'décimo' : 'décimos'}`;
}

export function RowTable({ rows, onEdit, onRemove, editingKey, warningsFor, compact }: RowTableProps) {
    const editable = !!onEdit || !!onRemove;

    return (
        <div className="overflow-x-auto rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-28">Número</TableHead>
                        {compact ? (
                            <TableHead className="w-28">Cantidad</TableHead>
                        ) : (
                            <>
                                <TableHead className="w-32">Tipo</TableHead>
                                <TableHead className="w-20 text-right">Cantidad</TableHead>
                            </>
                        )}
                        <TableHead>Series / fracciones</TableHead>
                        <TableHead className="w-24 text-right">Billetes</TableHead>
                        <TableHead className="w-24">Sellado</TableHead>
                        {editable && <TableHead className="w-24" />}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => {
                        const parsed = draftToRow(row);
                        const warnings = warningsFor?.(row) ?? [];
                        return (
                            <TableRow
                                key={row.key}
                                data-state={editingKey === row.key ? 'selected' : undefined}
                                className={cn(warnings.length > 0 && 'bg-amber-500/5')}
                            >
                                <TableCell className="font-mono text-base">
                                    <span className="inline-flex items-center gap-1.5">
                                        {row.numero}
                                        {warnings.length > 0 && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <AlertTriangle
                                                        className="size-3.5 text-amber-600 dark:text-amber-400"
                                                        aria-label="Aviso"
                                                    />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {warnings.map((warning) => (
                                                        <p key={warning}>{ROW_WARNING_TEXT[warning]}</p>
                                                    ))}
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </span>
                                </TableCell>
                                {compact ? (
                                    <TableCell className="whitespace-nowrap tabular-nums">
                                        {quantityLabel(row)}
                                    </TableCell>
                                ) : (
                                    <>
                                        <TableCell>{ROW_TYPE_LABELS[row.type]}</TableCell>
                                        <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
                                    </>
                                )}
                                <TableCell className="text-muted-foreground">{describeRowDetails(parsed)}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatBilletes(draftAmountDecimos(row))}
                                </TableCell>
                                <TableCell>
                                    {row.signed ? (
                                        <Badge variant="secondary">Sí</Badge>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </TableCell>
                                {editable && (
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            {onEdit && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Editar ${row.numero}`}
                                                    onClick={() => onEdit(row)}
                                                >
                                                    <Pencil />
                                                </Button>
                                            )}
                                            {onRemove && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Quitar ${row.numero}`}
                                                    onClick={() => onRemove(row)}
                                                >
                                                    <Trash2 />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
