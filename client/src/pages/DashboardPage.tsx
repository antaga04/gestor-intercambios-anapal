import { Link } from 'react-router-dom';
import {
    ArrowDownLeft,
    ArrowLeftRight,
    CheckCheck,
    ClipboardList,
    FileEdit,
    Inbox,
    Mails,
    PackageOpen,
    Send,
    Ticket,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { MustChangePasswordAlert } from '@/components/common/MustChangePasswordAlert';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/features/auth/hooks';
import { CampaignBanner } from '@/features/campaigns/components/CampaignBanner';
import { useDashboard } from '@/features/dashboard/hooks';
import { InstructionsCard } from '@/features/dashboard/components/InstructionsCard';
import { LastExchangeCard } from '@/features/dashboard/components/LastExchangeCard';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { formatBilletes, formatInt } from '@/lib/format';

const QUICK_ACTIONS = [
    { to: '/intercambios/nuevo', label: 'Nuevo intercambio', icon: ArrowLeftRight },
    { to: '/intercambios?tab=bandeja', label: 'Ver bandeja', icon: Inbox },
    { to: '/mi-loteria', label: 'Importar lotería', icon: Ticket },
    { to: '/lista-control', label: 'Descargar sobres', icon: Mails },
    { to: '/lista-control', label: 'Lista de control', icon: ClipboardList },
];

export function DashboardPage() {
    const { user } = useAuth();
    const { data, isLoading } = useDashboard();
    const loading = isLoading;
    const isNewUser = !loading && data !== null && data !== undefined && data.lastExchange === null;

    return (
        <>
            <PageHeader
                title={`Hola, ${user?.name ?? ''}`}
                description={`Nº de receptor ${user?.receptorNumber ?? ''}`}
                actions={
                    <Button asChild>
                        <Link to="/intercambios/nuevo">
                            <ArrowLeftRight /> Nuevo intercambio
                        </Link>
                    </Button>
                }
            />
            <MustChangePasswordAlert />
            <CampaignBanner />

            {data === null && !loading ? (
                <EmptyState
                    icon={PackageOpen}
                    title="Todavía no hay una campaña activa"
                    description="Cuando ANAPAL abra la campaña del sorteo podrás crear intercambios."
                />
            ) : (
                <>
                    {!loading && data && data.inboxPending > 0 && (
                        <Alert className="border-primary/50 bg-primary/5">
                            <Inbox />
                            <AlertTitle>
                                Tienes {data.inboxPending} {data.inboxPending === 1 ? 'intercambio' : 'intercambios'}{' '}
                                pendiente
                                {data.inboxPending === 1 ? '' : 's'} de aceptar
                                {data.inboxUnread > 0 && ` (${data.inboxUnread} sin ver)`}
                            </AlertTitle>
                            <AlertDescription className="flex items-center justify-between gap-2">
                                <span>Revísalos para confirmar lo que vas a recibir.</span>
                                <Button asChild size="sm" variant="outline">
                                    <Link to="/intercambios?tab=bandeja">Ir a la bandeja</Link>
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label="Sobres a enviar"
                            value={formatInt(data?.envelopesToSend ?? 0)}
                            icon={Send}
                            to="/intercambios"
                            loading={loading}
                        />
                        <StatCard
                            label="Sobres a recibir"
                            value={formatInt(data?.envelopesToReceive ?? 0)}
                            icon={ArrowDownLeft}
                            to="/intercambios?tab=recibidos"
                            loading={loading}
                        />
                        <StatCard
                            label="Billetes que doy"
                            value={formatBilletes(data?.decimosOut ?? 0)}
                            hint={`${formatInt(data?.decimosOut ?? 0)} décimos`}
                            loading={loading}
                        />
                        <StatCard
                            label="Billetes que recibo"
                            value={formatBilletes(data?.decimosIn ?? 0)}
                            hint={`${formatInt(data?.decimosIn ?? 0)} décimos`}
                            loading={loading}
                        />
                        <StatCard
                            label="Pendientes en bandeja"
                            value={formatInt(data?.inboxPending ?? 0)}
                            icon={Inbox}
                            to="/intercambios?tab=bandeja"
                            loading={loading}
                            highlight={!!data && data.inboxPending > 0}
                        />
                        <StatCard
                            label="Intercambios aceptados"
                            value={formatInt((data?.outgoing.accepted ?? 0) + (data?.incoming.accepted ?? 0))}
                            icon={CheckCheck}
                            loading={loading}
                        />
                        <StatCard
                            label="Borradores"
                            value={formatInt(data?.outgoing.draft ?? 0)}
                            icon={FileEdit}
                            to="/intercambios?estado=draft"
                            loading={loading}
                        />
                        <StatCard
                            label="Números en mi lotería"
                            value={formatInt(data?.lotteryCount ?? 0)}
                            icon={Ticket}
                            to="/mi-loteria"
                            loading={loading}
                        />
                    </section>

                    <section className="grid gap-4 lg:grid-cols-2">
                        {data?.lastExchange ? (
                            <LastExchangeCard exchange={data.lastExchange} />
                        ) : (
                            isNewUser && (
                                <EmptyState
                                    icon={ArrowLeftRight}
                                    title="Aún no tienes intercambios"
                                    description="Crea el primero eligiendo la administración con la que quieres intercambiar."
                                    action={
                                        <Button asChild>
                                            <Link to="/intercambios/nuevo">Crear intercambio</Link>
                                        </Button>
                                    }
                                />
                            )
                        )}
                        <InstructionsCard />
                    </section>
                </>
            )}

            <section className="space-y-3">
                <h2 className="text-base font-semibold">Acciones rápidas</h2>
                <div className="flex flex-wrap gap-2">
                    {QUICK_ACTIONS.map((a) => (
                        <Button key={a.label} asChild variant="outline">
                            <Link to={a.to}>
                                <a.icon /> {a.label}
                            </Link>
                        </Button>
                    ))}
                </div>
            </section>
        </>
    );
}
