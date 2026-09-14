import { Link } from 'react-router-dom';
import type { AdminUserRow } from '@anapal/shared';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AdminUserActions } from '@/features/admin/components/AdminUserActions';
import { RoleBadge, UserStatusBadge } from '@/features/admin/components/UserStatusBadge';
import { formatDate, formatDateTime, formatRelative } from '@/lib/format';
import { useIsMobile } from '@/hooks/use-mobile';

export function LastSeen({ at }: { at?: string }) {
    if (!at) return <span className="text-muted-foreground">Nunca</span>;
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="cursor-default">{formatRelative(at)}</span>
            </TooltipTrigger>
            <TooltipContent>{formatDateTime(at)}</TooltipContent>
        </Tooltip>
    );
}

export function AdminUsersTable({ items }: { items: AdminUserRow[] }) {
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <div className="space-y-3">
                {items.map((user) => (
                    <Card key={user._id} className="gap-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                            <Link to={`/admin/usuarios/${user._id}`} className="min-w-0 space-y-1">
                                <Badge variant="outline" className="font-mono">
                                    Nº {user.receptorNumber}
                                </Badge>
                                <p className="truncate font-medium">{user.name}</p>
                                <p className="truncate text-sm text-muted-foreground">
                                    {user.poblacion} ({user.provincia}) · {user.email}
                                </p>
                            </Link>
                            <AdminUserActions user={user} />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <UserStatusBadge status={user.status} />
                            <RoleBadge role={user.role} />
                            <span className="text-muted-foreground">
                                {user.exchangeCounts.out} env. · {user.exchangeCounts.in} rec. · visto{' '}
                                <LastSeen at={user.lastSeenAt} />
                            </span>
                        </div>
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
                        <TableHead>Email</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead className="text-right">Intercambios</TableHead>
                        <TableHead>Última conexión</TableHead>
                        <TableHead>Alta</TableHead>
                        <TableHead className="w-12" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((user) => (
                        <TableRow key={user._id}>
                            <TableCell className="font-mono">
                                <Link to={`/admin/usuarios/${user._id}`} className="hover:underline">
                                    {user.receptorNumber}
                                </Link>
                            </TableCell>
                            <TableCell className="max-w-72">
                                <Link
                                    to={`/admin/usuarios/${user._id}`}
                                    className="block truncate font-medium hover:underline"
                                >
                                    {user.name}
                                </Link>
                                <p className="truncate text-xs text-muted-foreground">
                                    {user.poblacion} ({user.provincia})
                                </p>
                            </TableCell>
                            <TableCell className="max-w-56 truncate text-muted-foreground">{user.email}</TableCell>
                            <TableCell>
                                <UserStatusBadge status={user.status} />
                            </TableCell>
                            <TableCell>
                                <RoleBadge role={user.role} />
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                                <span title="Enviados / recibidos">
                                    {user.exchangeCounts.out} / {user.exchangeCounts.in}
                                </span>
                            </TableCell>
                            <TableCell>
                                <LastSeen at={user.lastSeenAt} />
                            </TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                            <TableCell>
                                <AdminUserActions user={user} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
