import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import type { AdminUser, PasswordRequestRow } from '@anapal/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { SetPasswordDialog } from '@/features/admin/components/SetPasswordDialog';
import { usePasswordRequests } from '@/features/admin/hooks';
import { formatDateTime, formatRelative } from '@/lib/format';
import { useIsMobile } from '@/hooks/use-mobile';

export function AdminPasswordRequestsPage() {
    const [params, setParams] = useSearchParams();
    const status = params.get('estado') === 'resueltas' ? 'resolved' : 'pending';
    const page = Number(params.get('page') ?? 1);
    const { data, isLoading } = usePasswordRequests({ status, page });
    const [target, setTarget] = useState<AdminUser | null>(null);
    const isMobile = useIsMobile();

    const setParam = (key: string, value: string | null) => {
        const next = new URLSearchParams(params);
        if (value === null) next.delete(key);
        else next.set(key, value);
        if (key !== 'page') next.delete('page');
        setParams(next, { replace: true });
    };

    const UserCell = ({ row }: { row: PasswordRequestRow }) => (
        <div className="min-w-0">
            <Link to={`/admin/usuarios/${row.user._id}`} className="font-medium hover:underline">
                <span className="font-mono text-muted-foreground">{row.user.receptorNumber}</span> {row.user.name}
            </Link>
            <p className="truncate text-xs text-muted-foreground">
                {row.user.email}
                {row.user.phone ? ` · ${row.user.phone}` : ''}
                {row.user.contactName ? ` · ${row.user.contactName}` : ''}
            </p>
        </div>
    );

    const action = (row: PasswordRequestRow) =>
        row.status === 'pending' ? (
            <Button size="sm" onClick={() => setTarget(row.user)}>
                <KeyRound /> Establecer contraseña
            </Button>
        ) : (
            <Badge variant="secondary">Resuelta {row.resolvedAt ? formatRelative(row.resolvedAt) : ''}</Badge>
        );

    return (
        <>
            <PageHeader
                title="Solicitudes de contraseña"
                description="Usuarios que han pedido recuperar el acceso. No se envían emails: asigna una contraseña temporal y comunícasela."
            />

            <Tabs
                value={status === 'pending' ? 'pendientes' : 'resueltas'}
                onValueChange={(v) => setParam('estado', v === 'pendientes' ? null : v)}
            >
                <TabsList>
                    <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
                    <TabsTrigger value="resueltas">Resueltas</TabsTrigger>
                </TabsList>
            </Tabs>

            {isLoading ? (
                <Skeleton className="h-48 w-full" />
            ) : !data || data.items.length === 0 ? (
                <EmptyState
                    icon={KeyRound}
                    title={
                        status === 'pending' ? 'No hay solicitudes pendientes' : 'Todavía no hay solicitudes resueltas'
                    }
                />
            ) : isMobile ? (
                <div className="space-y-3">
                    {data.items.map((row) => (
                        <Card key={row._id} className="gap-3 p-4">
                            <UserCell row={row} />
                            <p className="text-sm text-muted-foreground">
                                Solicitada {formatRelative(row.requestedAt)}
                            </p>
                            {action(row)}
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="overflow-x-auto rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Solicitada</TableHead>
                                    <TableHead className="text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.items.map((row) => (
                                    <TableRow key={row._id}>
                                        <TableCell className="max-w-96">
                                            <UserCell row={row} />
                                        </TableCell>
                                        <TableCell title={formatDateTime(row.requestedAt)}>
                                            {formatRelative(row.requestedAt)}
                                        </TableCell>
                                        <TableCell className="text-right">{action(row)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <Pagination
                        pagination={data.pagination}
                        noun="solicitudes"
                        onPage={(p) => setParam('page', String(p))}
                    />
                </div>
            )}

            <SetPasswordDialog user={target} onClose={() => setTarget(null)} />
        </>
    );
}
