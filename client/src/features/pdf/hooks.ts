import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ControlList, ExchangeDetail, ExchangeSummary, PublicUser } from '@anapal/shared';
import { controlListToCsv, LIMITS } from '@anapal/shared';
import { exchangesApi } from '@/features/exchanges/api';
import { exchangeKeys } from '@/features/exchanges/hooks';
import { downloadCsv, downloadPdf, slugify } from '@/features/pdf/download';
import type { PdfPreview } from '@/features/pdf/PdfPreviewDialog';
import { ApiClientError } from '@/lib/api';

const errorMessage = (err: unknown, fallback: string) =>
    err instanceof ApiClientError ? err.message : err instanceof Error && err.message ? err.message : fallback;

/** pdf-lib is loaded on demand: most sessions never print. */
const loadPdf = () => import('@/features/pdf/exchangePdf');

/** Outgoing exchanges whose envelope will travel (pending + accepted), across every page. */
export async function fetchOutgoingToPrint(): Promise<ExchangeSummary[]> {
    const items: ExchangeSummary[] = [];
    for (const status of ['pending', 'accepted'] as const) {
        let page = 1;
        for (;;) {
            const result = await exchangesApi.list({ direction: 'out', status, page, limit: LIMITS.pageSizeMax });
            items.push(...result.items);
            if (!result.pagination.hasNextPage) break;
            page += 1;
        }
    }
    return items;
}

/** Generates, previews and downloads exchange PDFs; `preview` feeds `PdfPreviewDialog`. */
export function useExchangePdf() {
    const queryClient = useQueryClient();
    const [preview, setPreview] = useState<PdfPreview | null>(null);
    const [busy, setBusy] = useState(false);

    const getDetail = useCallback(
        (id: string) =>
            queryClient.fetchQuery({ queryKey: exchangeKeys.detail(id), queryFn: () => exchangesApi.get(id) }),
        [queryClient],
    );

    const build = useCallback(
        async (exchange: ExchangeSummary | ExchangeDetail) => {
            const [{ exchangePdf, exchangePdfFilename }, detail] = await Promise.all([
                loadPdf(),
                'rows' in exchange ? Promise.resolve(exchange) : getDetail(exchange._id),
            ]);
            return { bytes: await exchangePdf(detail), filename: exchangePdfFilename(detail), detail };
        },
        [getDetail],
    );

    const previewExchange = useCallback(
        async (exchange: ExchangeSummary | ExchangeDetail) => {
            const title = `Sobre para ${exchange.to.receptorNumber} · ${exchange.to.name}`;
            setPreview({ title, filename: '', bytes: null });
            try {
                const { bytes, filename } = await build(exchange);
                setPreview((current) => (current?.title === title ? { title, filename, bytes } : current));
            } catch (err) {
                setPreview(null);
                toast.error(errorMessage(err, 'No se pudo generar el PDF.'));
            }
        },
        [build],
    );

    const downloadExchange = useCallback(
        async (exchange: ExchangeSummary | ExchangeDetail) => {
            setBusy(true);
            try {
                const { bytes, filename } = await build(exchange);
                downloadPdf(bytes, filename);
            } catch (err) {
                toast.error(errorMessage(err, 'No se pudo generar el PDF.'));
            } finally {
                setBusy(false);
            }
        },
        [build],
    );

    /** One PDF with every outgoing pending/accepted envelope of the campaign. */
    const downloadAll = useCallback(
        async ({ onlyEnvelopes, campaignName }: { onlyEnvelopes: boolean; campaignName: string }) => {
            setBusy(true);
            try {
                const summaries = await fetchOutgoingToPrint();
                if (summaries.length === 0) {
                    toast.info('No tienes sobres pendientes ni aceptados que imprimir.');
                    return;
                }
                const { mergeExchangePdfs } = await loadPdf();
                // Envelopes only need sender/receiver; sheets need the rows, so fetch details just for those.
                const exchanges = onlyEnvelopes ? summaries : await Promise.all(summaries.map((e) => getDetail(e._id)));
                const bytes = await mergeExchangePdfs(exchanges, { onlyEnvelopes });
                downloadPdf(bytes, `sobres-${slugify(campaignName)}.pdf`);
                toast.success(`${summaries.length} ${summaries.length === 1 ? 'sobre' : 'sobres'} en un PDF.`);
            } catch (err) {
                toast.error(errorMessage(err, 'No se pudieron generar los sobres.'));
            } finally {
                setBusy(false);
            }
        },
        [getDetail],
    );

    return { preview, closePreview: () => setPreview(null), previewExchange, downloadExchange, downloadAll, busy };
}

/** Downloads of the control list as PDF or CSV. */
export function useControlListDownloads() {
    const [busy, setBusy] = useState(false);

    const pdf = useCallback(async (list: ControlList, me: PublicUser, campaignName: string) => {
        setBusy(true);
        try {
            const { controlListPdf } = await import('@/features/pdf/controlListPdf');
            downloadPdf(await controlListPdf(list, me, campaignName), `lista-control-${slugify(campaignName)}.pdf`);
        } catch (err) {
            toast.error(errorMessage(err, 'No se pudo generar el PDF.'));
        } finally {
            setBusy(false);
        }
    }, []);

    const csv = useCallback((list: ControlList, campaignName: string) => {
        downloadCsv(controlListToCsv(list), `lista-control-${slugify(campaignName)}.csv`);
    }, []);

    return { pdf, csv, busy };
}
