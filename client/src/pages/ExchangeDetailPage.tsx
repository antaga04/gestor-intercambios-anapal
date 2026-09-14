import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, CalendarClock, MessageSquare, Repeat } from 'lucide-react';
import { exchangeTotalDecimos } from '@anapal/shared';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { DirectionBadge } from '@/components/common/DirectionBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { UserCard } from '@/components/common/UserCard';
import { ExchangeActions } from '@/features/exchanges/components/ExchangeActions';
import { ExchangeTotals } from '@/features/exchanges/components/ExchangeTotals';
import { RowTable } from '@/features/exchanges/components/RowTable';
import { useExchange } from '@/features/exchanges/hooks';
import { useAdminExchange } from '@/features/admin/hooks';
import { isAdminRole, useAuth } from '@/features/auth/hooks';
import { draftFromRow, draftToRow } from '@/features/exchanges/rowDraft';
import { formatDateTime } from '@/lib/format';
import { STATUS_LABELS } from '@/lib/labels';

export function ExchangeDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const own = useExchange(id);
    // Admins can open any exchange, including those of past campaigns, through the admin endpoint.
    const admin = useAdminExchange(id, isAdminRole(user?.role) && own.isError);
    const exchange = own.data ?? admin.data;
    const isLoading = own.isLoading || admin.isLoading;
    const isError = own.isError && (admin.isError || !isAdminRole(user?.role));

    if (isLoading) return <Skeleton className="h-96 w-full" />;
    if (isError || !exchange) {
        return (
            <EmptyState
                icon={ArrowLeftRight}
                title="No se puede mostrar este intercambio"
                description="Puede que se haya eliminado o que no participes en él."
                action={
                    <Button asChild variant="outline">
                        <Link to="/intercambios">Volver a intercambios</Link>
                    </Button>
                }
            />
        );
    }

    const isSender = exchange.from._id === user?._id;
    const isParty = isSender || exchange.to._id === user?._id;
    const counterpart = isSender ? exchange.to : exchange.from;
    const rows = exchange.rows.map(draftFromRow);
    const decimos = exchangeTotalDecimos(rows.map(draftToRow));

    return (
        <>
            <PageHeader
                title={
                    !isParty
                        ? `Sobre de ${exchange.from.name} para ${exchange.to.name}`
                        : isSender
                          ? `Sobre para ${counterpart.name}`
                          : `Sobre de ${counterpart.name}`
                }
                description={`Nº de receptor ${counterpart.receptorNumber} · ${counterpart.poblacion} (${counterpart.provincia})`}
                actions={
                    <Button asChild variant="outline">
                        <Link to="/intercambios">
                            <ArrowLeft /> Volver
                        </Link>
                    </Button>
                }
            />

            <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={exchange.status} />
                <DirectionBadge direction={exchange.direction} />
                <span className="text-sm text-muted-foreground">
                    {!isParty ? 'Vista de administrador' : isSender ? 'Lo envías tú' : 'Te lo envían a ti'}
                    {exchange.sentAt && ` · enviado el ${formatDateTime(exchange.sentAt)}`}
                    {exchange.respondedAt && ` · respondido el ${formatDateTime(exchange.respondedAt)}`}
                </span>
            </div>

            {exchange.status === 'rejected' && (
                <Alert variant="destructive">
                    <MessageSquare />
                    <AlertTitle>Intercambio rechazado</AlertTitle>
                    <AlertDescription>
                        {exchange.rejectReason ? `Motivo: ${exchange.rejectReason}` : 'No se indicó ningún motivo.'}
                        {isSender && ' Puedes modificarlo y volver a enviarlo.'}
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Lotería {isSender ? 'que doy' : 'que recibo'}</CardTitle>
                            <CardDescription>{exchange.rowCount} números en el sobre.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {rows.length > 0 ? (
                                <RowTable rows={rows} />
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Este intercambio todavía no tiene números.
                                </p>
                            )}
                            <ExchangeTotals
                                rowCount={rows.length}
                                decimos={decimos}
                                signedCount={exchange.signedRowCount}
                            />
                        </CardContent>
                    </Card>

                    {exchange.note && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Nota</CardTitle>
                            </CardHeader>
                            <CardContent className="whitespace-pre-line text-sm text-muted-foreground">
                                {exchange.note}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{isSender ? 'Destinatario' : 'Remitente'}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <UserCard user={counterpart} />
                            <ExchangeActions exchange={exchange} variant="buttons" />
                        </CardContent>
                    </Card>

                    {exchange.counterpartStatus && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Repeat className="size-4 text-primary" /> Intercambio de vuelta
                                </CardTitle>
                                <CardDescription>
                                    {isSender
                                        ? 'Esta administración también te envía un sobre.'
                                        : 'Tú también le envías un sobre a esta administración.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between gap-2">
                                <StatusBadge status={exchange.counterpartStatus} />
                                <Button asChild size="sm" variant="outline">
                                    <Link
                                        to={
                                            exchange.counterpartId
                                                ? `/intercambios/${exchange.counterpartId}`
                                                : `/intercambios?tab=${isSender ? 'recibidos' : 'enviados'}&q=${counterpart.receptorNumber}`
                                        }
                                    >
                                        Ver
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <CalendarClock className="size-4" /> Seguimiento
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm text-muted-foreground">
                            <p>Creado: {formatDateTime(exchange.createdAt)}</p>
                            <p>Actualizado: {formatDateTime(exchange.updatedAt)}</p>
                            <p>Estado: {STATUS_LABELS[exchange.status]}</p>
                            {isSender && (
                                <p>
                                    Visto por el destinatario:{' '}
                                    {exchange.seenByReceiverAt
                                        ? formatDateTime(exchange.seenByReceiverAt)
                                        : 'todavía no'}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
