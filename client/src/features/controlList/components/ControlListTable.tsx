import { Link } from 'react-router-dom';
import type { ControlListRow, ControlListSide } from '@anapal/shared';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DirectionBadge } from '@/components/common/DirectionBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatBilletes } from '@/lib/format';
import { useIsMobile } from '@/hooks/use-mobile';

function Side({ side, label }: { side: ControlListSide | null; label: string }) {
    if (!side) return <span className="text-muted-foreground">—</span>;
    return (
        <Link
            to={`/intercambios/${side.exchangeId}`}
            className="inline-flex flex-wrap items-center gap-2 hover:underline"
            aria-label={label}
        >
            <span className="font-medium tabular-nums">{formatBilletes(side.decimos)}</span>
            <StatusBadge status={side.status} />
        </Link>
    );
}

export function ControlListTable({ rows }: { rows: ControlListRow[] }) {
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <div className="space-y-3">
                {rows.map((row) => (
                    <Card key={row.counterpart._id} className="gap-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 space-y-1">
                                <Badge variant="outline" className="font-mono">
                                    Nº {row.counterpart.receptorNumber}
                                </Badge>
                                <p className="truncate font-medium">{row.counterpart.name}</p>
                                <p className="truncate text-sm text-muted-foreground">
                                    {row.counterpart.poblacion} ({row.counterpart.provincia})
                                </p>
                            </div>
                            <DirectionBadge direction={row.direction} />
                        </div>
                        <dl className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <dt className="text-xs text-muted-foreground">Doy</dt>
                                <dd>
                                    <Side side={row.gives} label={`Sobre para ${row.counterpart.receptorNumber}`} />
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground">Recibo</dt>
                                <dd>
                                    <Side side={row.receives} label={`Sobre de ${row.counterpart.receptorNumber}`} />
                                </dd>
                            </div>
                        </dl>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nº receptor</TableHead>
                        <TableHead>Administración</TableHead>
                        <TableHead>Población</TableHead>
                        <TableHead>Provincia</TableHead>
                        <TableHead>Doy</TableHead>
                        <TableHead>Recibo</TableHead>
                        <TableHead>Dirección</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.counterpart._id}>
                            <TableCell className="font-mono">{row.counterpart.receptorNumber}</TableCell>
                            <TableCell className="max-w-64 truncate font-medium">{row.counterpart.name}</TableCell>
                            <TableCell>{row.counterpart.poblacion}</TableCell>
                            <TableCell>{row.counterpart.provincia}</TableCell>
                            <TableCell>
                                <Side side={row.gives} label={`Sobre para ${row.counterpart.receptorNumber}`} />
                            </TableCell>
                            <TableCell>
                                <Side side={row.receives} label={`Sobre de ${row.counterpart.receptorNumber}`} />
                            </TableCell>
                            <TableCell>
                                <DirectionBadge direction={row.direction} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
