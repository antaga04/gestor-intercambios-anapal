import { AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { ROW_TYPE_LABELS, describeRowDetails, rowSeries } from '@anapal/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { draftAmountDecimos, draftToRow, type RowDraft } from '@/features/exchanges/rowDraft';
import { LOTTERY_WARNING_TEXT, useLotteryCheck } from '@/features/lottery/hooks';
import { formatBilletes } from '@/lib/format';

interface RowTableProps {
    rows: RowDraft[];
    onEdit?: (row: RowDraft) => void;
    onRemove?: (row: RowDraft) => void;
    editingKey?: string;
}

export function RowTable({ rows, onEdit, onRemove, editingKey }: RowTableProps) {
    const checkLottery = useLotteryCheck();
    const editable = !!onEdit || !!onRemove;

    return (
        <div className="overflow-x-auto rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-28">Número</TableHead>
                        <TableHead className="w-32">Tipo</TableHead>
                        <TableHead className="w-20 text-right">Cantidad</TableHead>
                        <TableHead>Series / fracciones</TableHead>
                        <TableHead className="w-24 text-right">Billetes</TableHead>
                        <TableHead className="w-24">Firmado</TableHead>
                        {editable && <TableHead className="w-24" />}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => {
                        const parsed = draftToRow(row);
                        const warning = row.numero.length === 5 ? checkLottery(row.numero, rowSeries(parsed)) : null;
                        return (
                            <TableRow key={row.key} data-state={editingKey === row.key ? 'selected' : undefined}>
                                <TableCell className="font-mono text-base">
                                    <span className="inline-flex items-center gap-1.5">
                                        {row.numero}
                                        {warning && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
                                                </TooltipTrigger>
                                                <TooltipContent>{LOTTERY_WARNING_TEXT[warning]}</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </span>
                                </TableCell>
                                <TableCell>{ROW_TYPE_LABELS[row.type]}</TableCell>
                                <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
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
