import { useState } from 'react';
import { ClipboardList, FileDown, FileSpreadsheet, Loader2, Mails } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/features/auth/hooks';
import { useActiveCampaign } from '@/features/campaigns/hooks';
import { ControlListTable } from '@/features/controlList/components/ControlListTable';
import { ControlListTotals } from '@/features/controlList/components/ControlListTotals';
import { useControlList } from '@/features/controlList/hooks';
import { useControlListDownloads, useExchangePdf } from '@/features/pdf/hooks';
import { formatInt } from '@/lib/format';

export function ControlListPage() {
    const { user } = useAuth();
    const { data: campaign } = useActiveCampaign();
    const { data: list, isLoading } = useControlList();
    const downloads = useControlListDownloads();
    const envelopes = useExchangePdf();
    const [onlyEnvelopes, setOnlyEnvelopes] = useState(false);

    const campaignName = campaign?.name ?? 'campaña';
    const hasRows = !!list && list.rows.length > 0;

    return (
        <>
            <PageHeader
                title="Lista de control"
                description="Con quién intercambias, cuántos sobres envías y cuántos recibes en esta campaña."
                actions={
                    <>
                        <Button
                            variant="outline"
                            disabled={!hasRows || downloads.busy}
                            onClick={() => list && user && void downloads.pdf(list, user, campaignName)}
                        >
                            {downloads.busy ? <Loader2 className="animate-spin" /> : <FileDown />} Descargar PDF
                        </Button>
                        <Button
                            variant="outline"
                            disabled={!hasRows}
                            onClick={() => list && downloads.csv(list, campaignName)}
                        >
                            <FileSpreadsheet /> Descargar CSV
                        </Button>
                    </>
                }
            />

            <ControlListTotals totals={list?.totals} loading={isLoading} />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
                <div className="space-y-1">
                    <p className="text-sm font-medium">Sobres para imprimir</p>
                    <p className="text-xs text-muted-foreground">
                        Un único PDF con los sobres pendientes y aceptados, ordenados por nº de receptor.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Switch id="only-envelopes" checked={onlyEnvelopes} onCheckedChange={setOnlyEnvelopes} />
                        <Label htmlFor="only-envelopes">Solo sobres</Label>
                    </div>
                    <Button
                        disabled={!list || list.totals.envelopesToSend === 0 || envelopes.busy}
                        onClick={() => void envelopes.downloadAll({ onlyEnvelopes, campaignName })}
                    >
                        {envelopes.busy ? <Loader2 className="animate-spin" /> : <Mails />} Descargar todos los sobres
                        {list && list.totals.envelopesToSend > 0 && ` (${formatInt(list.totals.envelopesToSend)})`}
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <Skeleton className="h-64 w-full" />
            ) : !hasRows ? (
                <EmptyState
                    icon={ClipboardList}
                    title="Todavía no hay intercambios que controlar"
                    description="Aquí verás una fila por administración con la que intercambias, con lo que das y lo que recibes."
                />
            ) : (
                <ControlListTable rows={list.rows} />
            )}
        </>
    );
}
