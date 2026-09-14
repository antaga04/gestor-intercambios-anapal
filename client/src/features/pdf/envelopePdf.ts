import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib';
import type { PublicUser } from '@anapal/shared';
import { ENVELOPE_LAYOUT, ENVELOPE_TEMPLATE_URL, type EnvelopeBlockLayout } from '@/features/pdf/envelopeLayout';
import { drawText } from '@/features/pdf/text';

let templatePromise: Promise<ArrayBuffer> | null = null;

/** The envelope template, fetched once per session. */
export function loadEnvelopeTemplate(): Promise<ArrayBuffer> {
    templatePromise ??= fetch(ENVELOPE_TEMPLATE_URL).then((res) => {
        if (!res.ok) {
            templatePromise = null;
            throw new Error(`No se pudo cargar la plantilla del sobre (${res.status})`);
        }
        return res.arrayBuffer();
    });
    return templatePromise;
}

function drawBlock(
    page: import('pdf-lib').PDFPage,
    font: PDFFont,
    layout: EnvelopeBlockLayout,
    user: Pick<PublicUser, 'receptorNumber' | 'poblacion' | 'provincia'>,
) {
    drawText(page, user.receptorNumber, layout.receptorNumber.x, layout.receptorNumber.y, {
        font,
        size: layout.receptorNumber.size,
        maxWidth: layout.receptorNumber.maxWidth,
    });
    drawText(page, user.poblacion, layout.poblacion.x, layout.poblacion.y, {
        font,
        size: layout.poblacion.size,
        maxWidth: layout.poblacion.maxWidth,
    });
    drawText(page, user.provincia, layout.provincia.x, layout.provincia.y, {
        font,
        size: layout.provincia.size,
        maxWidth: layout.provincia.maxWidth,
    });
}

/** Appends one envelope page (template + DESTINATARIO / REMITENTE) to `doc`. */
export async function appendEnvelope(doc: PDFDocument, from: PublicUser, to: PublicUser): Promise<void> {
    const template = await PDFDocument.load(await loadEnvelopeTemplate());
    const [page] = await doc.copyPages(template, [0]);
    doc.addPage(page);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    drawBlock(page, bold, ENVELOPE_LAYOUT.destinatario, to);
    drawBlock(page, bold, ENVELOPE_LAYOUT.remitente, from);
}
