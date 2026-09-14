import { Trash2 } from 'lucide-react';
import type { LotteryNumberDto } from '@anapal/shared';
import { formatSeries } from '@anapal/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface LotteryTableProps {
    items: LotteryNumberDto[];
    onRemove: (item: LotteryNumberDto) => void;
    removingId?: string;
}

export function LotteryTable({ items, onRemove, removingId }: LotteryTableProps) {
    return (
        <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-32">Número</TableHead>
                            <TableHead>Series</TableHead>
                            <TableHead className="w-28">Origen</TableHead>
                            <TableHead className="w-12" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => (
                            <TableRow key={item._id}>
                                <TableCell className="font-mono text-base">{item.numero}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {item.series.length > 0 ? formatSeries(item.series) : 'Todas / sin especificar'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{item.source === 'import' ? 'Importado' : 'Manual'}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Eliminar ${item.numero}`}
                                        disabled={removingId === item._id}
                                        onClick={() => onRemove(item)}
                                    >
                                        <Trash2 />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}
