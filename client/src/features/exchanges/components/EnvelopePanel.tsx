import { Link } from 'react-router-dom';
import { AlertTriangle, MessageSquare, Plus } from 'lucide-react';
import { exchangeTotalDecimos, type ExchangeDetail, type PublicUser } from '@anapal/shared';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ExchangeActions } from '@/features/exchanges/components/ExchangeActions';
import { ExchangeTotals } from '@/features/exchanges/components/ExchangeTotals';
import { RowTable } from '@/features/exchanges/components/RowTable';
import { ENVELOPE_STYLE, type EnvelopeKind } from '@/features/exchanges/envelopeStyle';
import { draftFromRow, draftToRow } from '@/features/exchanges/rowDraft';
import { countWarnedRows, type RowWarningsFn } from '@/features/exchanges/warnings';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface EnvelopePanelProps {
    kind: EnvelopeKind;
    /** The envelope in this direction, or `undefined` when it does not exist (yet). */
    exchange?: ExchangeDetail;
    loading?: boolean;
    /** The other admon (from the viewer's point of view). */
    counterpart: PublicUser;
    /** Admins who are not a party see sender names instead of "Doy / Recibo". */
    viewerIsParty: boolean;
    warningsFor?: RowWarningsFn;
    className?: string;
}

export function EnvelopePanel({
    kind,
    exchange,
    loading,
    counterpart,
    viewerIsParty,
    warningsFor,
    className,
}: EnvelopePanelProps) {
    const style = ENVELOPE_STYLE[kind];
    const Icon = style.icon;
    const title = viewerIsParty ? style.label : exchange ? `De ${exchange.from.name}` : '—';
    const subtitle = viewerIsParty
        ? kind === 'out'
            ? `Mi sobre para ${counterpart.name}`
            : `El sobre de ${counterpart.name} para mí`
        : exchange
          ? `Sobre para ${exchange.to.name}`
          : '';

    return (
        <Card className={cn('gap-0 overflow-hidden border-t-4 py-0', style.border, className)}>
            <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-4">
                <div className="flex min-w-0 items-center gap-3">
                    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', style.iconBox)}>
                        <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <h2 className={cn('font-heading text-lg leading-tight font-bold', style.text)}>{title}</h2>
                        <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
                    </div>
                </div>
                {exchange && <StatusBadge status={exchange.status} className="text-sm" />}
            </div>

            {loading ? (
                <div className="space-y-3 px-5 pb-5">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            ) : exchange ? (
                <EnvelopeBody kind={kind} exchange={exchange} viewerIsParty={viewerIsParty} warningsFor={warningsFor} />
            ) : (
                <EnvelopeEmpty kind={kind} counterpart={counterpart} viewerIsParty={viewerIsParty} />
            )}
        </Card>
    );
}

function EnvelopeBody({
    kind,
    exchange,
    viewerIsParty,
    warningsFor,
}: {
    kind: EnvelopeKind;
    exchange: ExchangeDetail;
    viewerIsParty: boolean;
    warningsFor?: RowWarningsFn;
}) {
    const rows = exchange.rows.map(draftFromRow);
    const decimos = exchangeTotalDecimos(rows.map(draftToRow));
    const warnedRows = warningsFor ? countWarnedRows(rows, warningsFor) : 0;
    const timeline = [
        exchange.sentAt && `Enviado el ${formatDateTime(exchange.sentAt)}`,
        exchange.respondedAt && `Respondido el ${formatDateTime(exchange.respondedAt)}`,
        kind === 'out' &&
            viewerIsParty &&
            exchange.status !== 'draft' &&
            (exchange.seenByReceiverAt
                ? `Visto el ${formatDateTime(exchange.seenByReceiverAt)}`
                : 'Todavía no lo han visto'),
        exchange.status === 'draft' && 'Borrador: la otra administración aún no lo ve',
    ].filter(Boolean) as string[];

    return (
        <div className="space-y-4 border-t px-5 py-4">
            {timeline.length > 0 && <p className="text-xs text-muted-foreground">{timeline.join(' · ')}</p>}

            {exchange.status === 'rejected' && (
                <Alert variant="destructive">
                    <MessageSquare />
                    <AlertTitle>Rechazado</AlertTitle>
                    <AlertDescription>
                        {exchange.rejectReason ? `Motivo: ${exchange.rejectReason}` : 'No se indicó ningún motivo.'}
                        {kind === 'out' && viewerIsParty && ' Puedes modificarlo y volver a enviarlo.'}
                    </AlertDescription>
                </Alert>
            )}

            {warnedRows > 0 && (
                <p className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="size-4 shrink-0" />
                    {warnedRows === 1 ? 'Un número con aviso' : `${warnedRows} números con aviso`} — pasa el ratón por
                    el icono para ver el motivo.
                </p>
            )}

            {rows.length > 0 ? (
                <RowTable rows={rows} compact warningsFor={warningsFor} />
            ) : (
                <p className="text-sm text-muted-foreground">Este sobre todavía no tiene números.</p>
            )}

            <ExchangeTotals rowCount={rows.length} decimos={decimos} signedCount={exchange.signedRowCount} />

            {exchange.note && (
                <blockquote className="rounded-lg border-l-4 border-border bg-muted/40 px-4 py-3 text-sm whitespace-pre-line text-muted-foreground">
                    {exchange.note}
                </blockquote>
            )}

            <ExchangeActions exchange={exchange} variant="buttons" />
        </div>
    );
}

function EnvelopeEmpty({
    kind,
    counterpart,
    viewerIsParty,
}: {
    kind: EnvelopeKind;
    counterpart: PublicUser;
    viewerIsParty: boolean;
}) {
    if (kind === 'out' && viewerIsParty) {
        return (
            <div className="space-y-3 border-t px-5 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                    Todavía no le envías nada a {counterpart.name}. Un intercambio suele ir en los dos sentidos.
                </p>
                <Button asChild size="sm">
                    <Link to={`/intercambios/nuevo?para=${counterpart._id}`}>
                        <Plus /> Preparar mi sobre
                    </Link>
                </Button>
            </div>
        );
    }
    return (
        <div className="border-t px-5 py-6 text-center text-sm text-muted-foreground">
            {viewerIsParty
                ? `${counterpart.name} todavía no te envía ningún sobre. Cuando lo haga aparecerá aquí.`
                : 'No hay sobre en este sentido.'}
        </div>
    );
}
