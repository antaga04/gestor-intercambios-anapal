import { PDFDocument } from 'pdf-lib';
import type { ExchangeDetail, ExchangeSummary } from '@anapal/shared';
import { compareReceptor } from '@anapal/shared';
import { appendEnvelope } from '@/features/pdf/envelopePdf';
import { appendSheet } from '@/features/pdf/sheetPdf';

export interface ExchangePdfOptions {
    /** Skip the "Hoja de intercambio" and print only envelopes. */
    onlyEnvelopes?: boolean;
}

async function appendExchange(
    doc: PDFDocument,
    exchange: ExchangeSummary | ExchangeDetail,
    options: ExchangePdfOptions,
) {
    await appendEnvelope(doc, exchange.from, exchange.to);
    if (options.onlyEnvelopes) return;
    if (!('rows' in exchange)) throw new Error('Se necesita el detalle del intercambio para la hoja');
    await appendSheet(doc, exchange);
}

/** Envelope + sheet of one exchange. */
export async function exchangePdf(exchange: ExchangeDetail, options: ExchangePdfOptions = {}): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    doc.setTitle(`Sobre ${exchange.from.receptorNumber} → ${exchange.to.receptorNumber}`);
    await appendExchange(doc, exchange, options);
    return doc.save();
}

/**
 * All the given exchanges in one document, ordered by the receiver's receptor number.
 * Summaries are enough with `onlyEnvelopes`; sheets need details (rows).
 */
export async function mergeExchangePdfs(
    exchanges: (ExchangeSummary | ExchangeDetail)[],
    options: ExchangePdfOptions = {},
): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    doc.setTitle('Sobres de intercambio');
    const ordered = [...exchanges].sort((a, b) => compareReceptor(a.to.receptorNumber, b.to.receptorNumber));
    for (const exchange of ordered) await appendExchange(doc, exchange, options);
    return doc.save();
}

export const exchangePdfFilename = (exchange: ExchangeDetail) =>
    `sobre-${exchange.to.receptorNumber}-${exchange.from.receptorNumber}.pdf`;
