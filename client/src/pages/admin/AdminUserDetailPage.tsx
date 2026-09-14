import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileDown, FileSpreadsheet, Loader2, UserX } from 'lucide-react';
import type { ExchangeSummary } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { DirectionBadge } from '@/components/common/DirectionBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AdminUserActions } from '@/features/admin/components/AdminUserActions';
import { AdminUserForm } from '@/features/admin/components/AdminUserForm';
import { LastSeen } from '@/features/admin/components/AdminUsersTable';
import { CampaignSelect } from '@/features/admin/components/CampaignSelect';
import { RoleBadge, UserStatusBadge } from '@/features/admin/components/UserStatusBadge';
import { useAdminUser, useAdminUserControlList, useAdminUserExchanges } from '@/features/admin/hooks';
import { ControlListTable } from '@/features/controlList/components/ControlListTable';
import { ControlListTotals } from '@/features/controlList/components/ControlListTotals';
import { useControlListDownloads } from '@/features/pdf/hooks';
import { formatBilletes, formatDate, formatDateTime } from '@/lib/format';

function UserExchangesTab({ userId, campaign }: { userId: string; campaign?: string }) {
    const [page, setPage] = useState(1);
    const { data, isLoading } = useAdminUserExchanges(userId, { page, campaign, direction: 'all' });
    if (isLoading) return <Skeleton className="h-48 w-full" />;
    if (!data || data.items.length === 0) {
        return <EmptyState title="Sin intercambios en esta campaña" />;
    }
    const counterpart = (e: ExchangeSummary) => (e.from._id === userId ? e.to : e.from);
    return (
        <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Sentido</TableHead>
                            <TableHead>Con</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Dirección</TableHead>
                            <TableHead className="text-right">Filas</TableHead>
                            <TableHead className="text-right">Billetes</TableHead>
                            <TableHead>Actualizado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.items.map((e) => {
                            const other = counterpart(e);
                            return (
                                <TableRow key={e._id}>
                                    <TableCell className="text-muted-foreground">
                                        {e.from._id === userId ? 'Envía' : 'Recibe'}
                                    </TableCell>
                                    <TableCell className="max-w-64">
                                        <Link to={`/intercambios/${e._id}`} className="block truncate hover:underline">
                                            <span className="font-mono text-muted-foreground">
                                                {other.receptorNumber}
                                            </span>{' '}
                                            {other.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={e.status} />
                                    </TableCell>
                                    <TableCell>
                                        <DirectionBadge direction={e.direction} />
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{e.rowCount}</TableCell>
                                    <TableCell className="text-right font-medium tabular-nums">
                                        {formatBilletes(e.totalDecimos)}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatDateTime(e.updatedAt)}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            <Pagination pagination={data.pagination} noun="intercambios" onPage={setPage} />
        </div>
    );
}

export function AdminUserDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [params, setParams] = useSearchParams();
    const campaign = params.get('campaign') ?? undefined;
    const { data: user, isLoading } = useAdminUser(id);
    const controlList = useAdminUserControlList(id, campaign);
    const downloads = useControlListDownloads();

    if (isLoading) return <Skeleton className="h-96 w-full" />;
    if (!user) {
        return (
            <EmptyState
                icon={UserX}
                title="Usuario no encontrado"
                action={
                    <Button asChild variant="outline">
                        <Link to="/admin/usuarios">Volver a usuarios</Link>
                    </Button>
                }
            />
        );
    }

    const list = controlList.data;
    const campaignLabel = campaign ?? 'campaña';

    return (
        <>
            <PageHeader
                title={user.name}
                description={`Nº de receptor ${user.receptorNumber} · ${user.poblacion} (${user.provincia}) · ${user.email}`}
                actions={
                    <Button asChild variant="outline">
                        <Link to="/admin/usuarios">
                            <ArrowLeft /> Usuarios
                        </Link>
                    </Button>
                }
            />

            <div className="flex flex-wrap items-center gap-2">
                <UserStatusBadge status={user.status} />
                <RoleBadge role={user.role} />
                {user.mustChangePassword && (
                    <span className="text-sm text-amber-700 dark:text-amber-400">Debe cambiar la contraseña</span>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Datos de la administración</CardTitle>
                        <CardDescription>
                            Se muestran a las demás administraciones y se imprimen en los sobres.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AdminUserForm user={user} />
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Cuenta y sesiones</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                                <dt className="text-muted-foreground">Alta</dt>
                                <dd>{formatDate(user.createdAt)}</dd>
                                <dt className="text-muted-foreground">Último inicio de sesión</dt>
                                <dd>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Nunca'}</dd>
                                <dt className="text-muted-foreground">Última actividad</dt>
                                <dd>
                                    <LastSeen at={user.lastSeenAt} />
                                </dd>
                                <dt className="text-muted-foreground">Emails de verificación</dt>
                                <dd>{user.verificationEmailsSent}</dd>
                            </dl>
                            <AdminUserActions user={user} variant="buttons" />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-base">Actividad en la campaña</CardTitle>
                        <CardDescription>Intercambios en ambos sentidos y su lista de control.</CardDescription>
                    </div>
                    <CampaignSelect
                        value={campaign}
                        onChange={(v) => {
                            const next = new URLSearchParams(params);
                            if (v) next.set('campaign', v);
                            else next.delete('campaign');
                            setParams(next, { replace: true });
                        }}
                    />
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="intercambios">
                        <TabsList>
                            <TabsTrigger value="intercambios">Intercambios</TabsTrigger>
                            <TabsTrigger value="lista">Lista de control</TabsTrigger>
                        </TabsList>
                        <TabsContent value="intercambios" className="pt-4">
                            <UserExchangesTab userId={user._id} campaign={campaign} />
                        </TabsContent>
                        <TabsContent value="lista" className="space-y-4 pt-4">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!list || list.rows.length === 0 || downloads.busy}
                                    onClick={() => list && void downloads.pdf(list, user, campaignLabel)}
                                >
                                    {downloads.busy ? <Loader2 className="animate-spin" /> : <FileDown />} Descargar PDF
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!list || list.rows.length === 0}
                                    onClick={() =>
                                        list && downloads.csv(list, `${user.receptorNumber}-${campaignLabel}`)
                                    }
                                >
                                    <FileSpreadsheet /> Descargar CSV
                                </Button>
                            </div>
                            <ControlListTotals totals={list?.totals} loading={controlList.isLoading} />
                            {controlList.isLoading ? (
                                <Skeleton className="h-48 w-full" />
                            ) : !list || list.rows.length === 0 ? (
                                <EmptyState title="Sin intercambios que controlar" />
                            ) : (
                                <ControlListTable rows={list.rows} />
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </>
    );
}
