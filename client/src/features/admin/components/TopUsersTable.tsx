import { Link } from 'react-router-dom';
import type { AdminTopUser } from '@anapal/shared';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatBilletes, formatInt } from '@/lib/format';

export function TopUsersTable({ rows, emptyText }: { rows: AdminTopUser[]; emptyText: string }) {
    if (rows.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Administración</TableHead>
                    <TableHead className="text-right">Sobres</TableHead>
                    <TableHead className="text-right">Billetes</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map((row) => (
                    <TableRow key={row.user._id}>
                        <TableCell className="max-w-56">
                            <Link to={`/admin/usuarios/${row.user._id}`} className="block truncate hover:underline">
                                <span className="font-mono text-muted-foreground">{row.user.receptorNumber}</span>{' '}
                                {row.user.name}
                            </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatInt(row.envelopes)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                            {formatBilletes(row.decimos)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
