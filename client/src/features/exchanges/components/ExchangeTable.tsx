import { Link } from 'react-router-dom';
import type { ExchangeSummary } from '@anapal/shared';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DirectionBadge } from '@/components/common/DirectionBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ExchangeActions } from '@/features/exchanges/components/ExchangeActions';
import { useAuth } from '@/features/auth/hooks';
import { formatBilletes, formatDateTime } from '@/lib/format';
import { useIsMobile } from '@/hooks/use-mobile';

interface ExchangeTableProps {
    items: ExchangeSummary[];
    /** Incoming rows show the sender, outgoing rows the receiver. */
    direction: 'out' | 'in';
}

function counterpartOf(exchange: ExchangeSummary, meId?: string) {
    return exchange.from._id === meId ? exchange.to : exchange.from;
}

export function ExchangeTable({ items, direction }: ExchangeTableProps) {
    const { user } = useAuth();
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <div className="space-y-3">
                {items.map((exchange) => {
                    const counterpart = counterpartOf(exchange, user?._id);
                    const unread = direction === 'in' && !exchange.seenByReceiverAt;
                    return (
                        <Card key={exchange._id} className="gap-3 p-4">
                            <div className="flex items-start justify-between gap-2">
                                <Link to={`/intercambios/${exchange._id}`} className="min-w-0 space-y-1">
                                    <p className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-mono">
                                            Nº {counterpart.receptorNumber}
                                        </Badge>
                                        {unread && (
                                            <span className="size-2 rounded-full bg-primary" aria-label="Sin ver" />
                                        )}
                                    </p>
                                    <p className="truncate font-medium">{counterpart.name}</p>
                                    <p className="truncate text-sm text-muted-foreground">{counterpart.poblacion}</p>
                                </Link>
                                <ExchangeActions exchange={exchange} />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={exchange.status} />
                                <DirectionBadge direction={exchange.direction} />
                                <span className="text-sm text-muted-foreground">
                                    {exchange.rowCount} filas ·{' '}
                                    <strong className="text-foreground">{formatBilletes(exchange.totalDecimos)}</strong>{' '}
                                    billetes
                                </span>
                            </div>
                        </Card>
                    );
                })}
            </div>
        );
    }

    return (
        <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Administración</TableHead>
                            <TableHead className="w-28">Dirección</TableHead>
                            <TableHead className="w-28">Estado</TableHead>
                            <TableHead className="w-20 text-right">Filas</TableHead>
                            <TableHead className="w-24 text-right">Billetes</TableHead>
                            <TableHead className="w-24 text-right">Firmadas</TableHead>
                            <TableHead className="w-36">Actualizado</TableHead>
                            <TableHead className="w-12" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((exchange) => {
                            const counterpart = counterpartOf(exchange, user?._id);
                            const unread = direction === 'in' && !exchange.seenByReceiverAt;
                            return (
                                <TableRow key={exchange._id}>
                                    <TableCell>
                                        <Link to={`/intercambios/${exchange._id}`} className="flex items-center gap-2">
                                            {unread && (
                                                <span
                                                    className="size-2 shrink-0 rounded-full bg-primary"
                                                    aria-label="Sin ver"
                                                />
                                            )}
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {counterpart.receptorNumber}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate font-medium">{counterpart.name}</span>
                                                <span className="block truncate text-xs text-muted-foreground">
                                                    {counterpart.poblacion} ({counterpart.provincia})
                                                </span>
                                            </span>
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <DirectionBadge direction={exchange.direction} />
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={exchange.status} />
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{exchange.rowCount}</TableCell>
                                    <TableCell className="text-right font-medium tabular-nums">
                                        {formatBilletes(exchange.totalDecimos)}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-muted-foreground">
                                        {exchange.signedRowCount}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDateTime(exchange.updatedAt)}
                                    </TableCell>
                                    <TableCell>
                                        <ExchangeActions exchange={exchange} />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}
