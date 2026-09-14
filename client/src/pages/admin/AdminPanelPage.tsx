import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, KeyRound, Mail, Mails, Ticket, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { CampaignSelect } from '@/features/admin/components/CampaignSelect';
import { ExchangesChart } from '@/features/admin/components/ExchangesChart';
import { TopUsersTable } from '@/features/admin/components/TopUsersTable';
import { useAdminStats } from '@/features/admin/hooks';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { formatBilletes, formatDate, formatInt } from '@/lib/format';

function Budget({ label, used, cap }: { label: string; used: number; cap: number }) {
    const pct = Math.min(100, Math.round((used / cap) * 100));
    const tone = pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-amber-500' : 'bg-primary';
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <span>{label}</span>
                <span className="tabular-nums text-muted-foreground">
                    {formatInt(used)} / {formatInt(cap)}
                </span>
            </div>
            <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={cap}
                aria-valuenow={used}
                aria-label={label}
            >
                <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

export function AdminPanelPage() {
    const [campaign, setCampaign] = useState<string | undefined>(undefined);
    const { data, isLoading } = useAdminStats(campaign);
    const loading = isLoading;

    return (
        <>
            <PageHeader
                title="Panel de administración"
                description={
                    data
                        ? `${data.campaign.name} · plazo de intercambio hasta el ${formatDate(data.campaign.exchangeDeadline)}`
                        : 'Estado general de la campaña.'
                }
                actions={<CampaignSelect value={campaign} onChange={setCampaign} />}
            />

            {data && data.pendingPasswordRequests > 0 && (
                <Alert className="border-primary/50 bg-primary/5">
                    <KeyRound />
                    <AlertTitle>
                        {data.pendingPasswordRequests}{' '}
                        {data.pendingPasswordRequests === 1 ? 'solicitud' : 'solicitudes'} de contraseña sin resolver
                    </AlertTitle>
                    <AlertDescription className="flex items-center justify-between gap-2">
                        <span>Establece una contraseña temporal y comunícasela por teléfono.</span>
                        <Button asChild size="sm" variant="outline">
                            <Link to="/admin/solicitudes">Ver solicitudes</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Administraciones"
                    value={formatInt(data?.users.total ?? 0)}
                    hint={
                        data
                            ? `${formatInt(data.users.active)} activas · ${formatInt(data.users.pending)} pendientes · ${formatInt(data.users.blocked)} bloqueadas`
                            : undefined
                    }
                    icon={Users}
                    to="/admin/usuarios"
                    loading={loading}
                />
                <StatCard
                    label="Intercambios"
                    value={formatInt(data?.exchanges.total ?? 0)}
                    hint={
                        data
                            ? `${formatInt(data.exchanges.pending)} pendientes · ${formatInt(data.exchanges.accepted)} aceptados · ${formatInt(data.exchanges.bidirectionalPairs)} parejas`
                            : undefined
                    }
                    icon={ArrowLeftRight}
                    loading={loading}
                />
                <StatCard
                    label="Billetes en juego"
                    value={formatBilletes(data?.decimos.total ?? 0)}
                    hint={data ? `${formatBilletes(data.decimos.accepted)} ya aceptados` : undefined}
                    icon={Ticket}
                    loading={loading}
                />
                <StatCard
                    label="Sobres que viajarán"
                    value={formatInt(data?.envelopes.toSend ?? 0)}
                    hint="Pendientes + aceptados"
                    icon={Mails}
                    loading={loading}
                />
            </section>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Intercambios por día</CardTitle>
                    <CardDescription>Creados y aceptados en los últimos 60 días.</CardDescription>
                </CardHeader>
                <CardContent>
                    {data ? <ExchangesChart data={data.exchangesPerDay} /> : <Skeleton className="h-56 w-full" />}
                </CardContent>
            </Card>

            <section className="grid gap-4 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Quién más da</CardTitle>
                        <CardDescription>Sobres pendientes y aceptados que envían.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data ? (
                            <TopUsersTable rows={data.topGivers} emptyText="Todavía no hay envíos." />
                        ) : (
                            <Skeleton className="h-40" />
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Quién más recibe</CardTitle>
                        <CardDescription>Sobres pendientes y aceptados que reciben.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data ? (
                            <TopUsersTable rows={data.topReceivers} emptyText="Todavía no hay envíos." />
                        ) : (
                            <Skeleton className="h-40" />
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Mail className="size-4 text-primary" /> Emails y actividad
                        </CardTitle>
                        <CardDescription>Solo se envían emails de verificación (Resend).</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {data ? (
                            <>
                                <Budget label="Hoy" used={data.emails.today} cap={data.emails.dailyCap} />
                                <Budget label="Este mes" used={data.emails.thisMonth} cap={data.emails.monthlyCap} />
                                <dl className="grid grid-cols-2 gap-2 pt-2 text-sm">
                                    <dt className="text-muted-foreground">Activas 7 días</dt>
                                    <dd className="text-right tabular-nums">{formatInt(data.users.activeLast7Days)}</dd>
                                    <dt className="text-muted-foreground">Activas 30 días</dt>
                                    <dd className="text-right tabular-nums">
                                        {formatInt(data.users.activeLast30Days)}
                                    </dd>
                                    <dt className="text-muted-foreground">Con lista de lotería</dt>
                                    <dd className="text-right tabular-nums">
                                        {formatInt(data.lottery.usersWithList)} ({formatInt(data.lottery.numbers)}{' '}
                                        números)
                                    </dd>
                                    <dt className="text-muted-foreground">Administradores</dt>
                                    <dd className="text-right tabular-nums">{formatInt(data.users.admins)}</dd>
                                </dl>
                            </>
                        ) : (
                            <Skeleton className="h-40" />
                        )}
                    </CardContent>
                </Card>
            </section>
        </>
    );
}
