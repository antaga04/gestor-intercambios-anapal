import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, Scale } from 'lucide-react';
import type { ExchangeDetail } from '@anapal/shared';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { UserCard } from '@/components/common/UserCard';
import { EnvelopePanel } from '@/features/exchanges/components/EnvelopePanel';
import { ENVELOPE_STYLE, type EnvelopeKind } from '@/features/exchanges/envelopeStyle';
import { useExchange } from '@/features/exchanges/hooks';
import { useIncomingWarnings, useOutgoingWarnings } from '@/features/exchanges/warnings';
import { useAdminExchange } from '@/features/admin/hooks';
import { isAdminRole, useAuth } from '@/features/auth/hooks';
import { formatBilletes } from '@/lib/format';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

/** Loads an exchange; admins fall back to the admin endpoint (any campaign) when the normal one refuses. */
function useExchangeOrAdmin(id: string | undefined) {
    const { user } = useAuth();
    const own = useExchange(id);
    const admin = useAdminExchange(id, isAdminRole(user?.role) && own.isError);
    return {
        data: own.data ?? admin.data,
        isLoading: own.isLoading || admin.isLoading,
        isError: own.isError && (admin.isError || !isAdminRole(user?.role)),
    };
}

/**
 * One page per relationship: the envelope I give and the envelope I receive, side by side. Opening either
 * exchange of a pair lands here, so the two halves never look like two unrelated screens.
 */
export function ExchangeDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const isMobile = useIsMobile();

    const opened = useExchangeOrAdmin(id);
    const reverse = useExchangeOrAdmin(opened.data?.counterpartId);
    const exchange = opened.data;

    const isSender = !!exchange && exchange.from._id === user?._id;
    const isReceiver = !!exchange && exchange.to._id === user?._id;
    const isParty = isSender || isReceiver;

    // "out" is always what the viewer gives. Admins who are not a party see the opened one on the left.
    const outgoing: ExchangeDetail | undefined = !exchange ? undefined : isReceiver ? reverse.data : exchange;
    const incoming: ExchangeDetail | undefined = !exchange ? undefined : isReceiver ? exchange : reverse.data;
    const counterpart = !exchange ? undefined : isReceiver ? exchange.from : exchange.to;

    const outgoingNumeros = useMemo(() => outgoing?.rows.map((r) => r.numero) ?? [], [outgoing]);
    const outgoingWarnings = useOutgoingWarnings(isParty ? counterpart?._id : undefined, outgoingNumeros);
    const incomingWarnings = useIncomingWarnings(isParty ? outgoingNumeros : []);

    if (opened.isLoading) return <Skeleton className="h-96 w-full" />;
    if (opened.isError || !exchange || !counterpart) {
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

    const reverseLoading = !!exchange.counterpartId && reverse.isLoading;
    const openedKind: EnvelopeKind = isReceiver ? 'in' : 'out';

    const panels = {
        out: (
            <EnvelopePanel
                kind="out"
                exchange={outgoing}
                loading={openedKind !== 'out' && reverseLoading}
                counterpart={counterpart}
                viewerIsParty={isParty}
                warningsFor={isParty ? outgoingWarnings : undefined}
            />
        ),
        in: (
            <EnvelopePanel
                kind="in"
                exchange={incoming}
                loading={openedKind !== 'in' && reverseLoading}
                counterpart={counterpart}
                viewerIsParty={isParty}
                warningsFor={isParty ? incomingWarnings : undefined}
            />
        ),
    };

    return (
        <>
            <PageHeader
                title={isParty ? `Intercambio con ${counterpart.name}` : `${exchange.from.name} ⇄ ${exchange.to.name}`}
                description={
                    isParty
                        ? `Nº de receptor ${counterpart.receptorNumber} · ${counterpart.poblacion} (${counterpart.provincia})`
                        : 'Vista de administrador'
                }
                actions={
                    <Button asChild variant="outline">
                        <Link to="/intercambios">
                            <ArrowLeft /> Volver
                        </Link>
                    </Button>
                }
            />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <UserCard user={counterpart} />
                <Balance outgoing={outgoing} incoming={incoming} isParty={isParty} />
            </div>

            {isMobile ? (
                <Tabs defaultValue={openedKind}>
                    <TabsList className="grid w-full grid-cols-2">
                        {(['out', 'in'] as const).map((kind) => {
                            const Icon = ENVELOPE_STYLE[kind].icon;
                            const item = kind === 'out' ? outgoing : incoming;
                            return (
                                <TabsTrigger key={kind} value={kind} className="gap-1.5">
                                    <Icon className={cn('size-4', ENVELOPE_STYLE[kind].text)} />
                                    {isParty ? ENVELOPE_STYLE[kind].label : item ? item.from.name : '—'}
                                    {item && <StatusBadge status={item.status} className="ml-1 text-[11px]" />}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                    <TabsContent value="out">{panels.out}</TabsContent>
                    <TabsContent value="in">{panels.in}</TabsContent>
                </Tabs>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                    {panels.out}
                    {panels.in}
                </div>
            )}
        </>
    );
}

/** Both totals at a glance and who gives more — only meaningful once both envelopes exist. */
function Balance({
    outgoing,
    incoming,
    isParty,
}: {
    outgoing?: ExchangeDetail;
    incoming?: ExchangeDetail;
    isParty: boolean;
}) {
    const give = outgoing?.totalDecimos ?? 0;
    const get = incoming?.totalDecimos ?? 0;
    const diff = give - get;
    const OutIcon = ENVELOPE_STYLE.out.icon;
    const InIcon = ENVELOPE_STYLE.in.icon;

    return (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-card px-4 py-3 text-sm shadow-soft">
            <span className={cn('inline-flex items-center gap-1.5 font-medium', ENVELOPE_STYLE.out.text)}>
                <OutIcon className="size-4" /> {isParty ? 'Doy' : 'Ida'}{' '}
                <strong className="tabular-nums">{outgoing ? formatBilletes(give) : '—'}</strong>
                {outgoing && <span className="font-normal text-muted-foreground">billetes</span>}
            </span>
            <span className={cn('inline-flex items-center gap-1.5 font-medium', ENVELOPE_STYLE.in.text)}>
                <InIcon className="size-4" /> {isParty ? 'Recibo' : 'Vuelta'}{' '}
                <strong className="tabular-nums">{incoming ? formatBilletes(get) : '—'}</strong>
                {incoming && <span className="font-normal text-muted-foreground">billetes</span>}
            </span>
            {outgoing && incoming && (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Scale className="size-4" />
                    {diff === 0
                        ? 'Equilibrado'
                        : isParty
                          ? `${diff > 0 ? 'Doy' : 'Recibo'} ${formatBilletes(Math.abs(diff))} billetes más`
                          : `Diferencia de ${formatBilletes(Math.abs(diff))} billetes`}
                </span>
            )}
        </div>
    );
}
