import { PageSizes, PDFDocument, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import type { ControlList, PublicUser } from '@anapal/shared';
import { EXCHANGE_STATUS_LABELS, formatBilletes, PAIR_DIRECTION_LABELS } from '@anapal/shared';
import { drawTable } from '@/features/pdf/table';
import { COLORS, drawText } from '@/features/pdf/text';
import { formatDate, formatInt } from '@/lib/format';

const MARGIN = 36;
const LANDSCAPE: [number, number] = [PageSizes.A4[1], PageSizes.A4[0]];
const [PAGE_W, PAGE_H] = LANDSCAPE;
const CONTENT_W = PAGE_W - MARGIN * 2;

function drawHeader(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }, me: PublicUser, campaignName: string) {
    let y = PAGE_H - MARGIN;
    drawText(page, 'LISTA DE CONTROL', MARGIN, y - 4, { font: fonts.bold, size: 16 });
    drawText(page, campaignName, PAGE_W - MARGIN, y - 4, {
        font: fonts.bold,
        size: 11,
        align: 'right',
        color: COLORS.primary,
    });
    y -= 18;
    drawText(page, `Nº de receptor ${me.receptorNumber} · ${me.name} · ${me.poblacion} (${me.provincia})`, MARGIN, y, {
        font: fonts.regular,
        size: 9,
        color: COLORS.muted,
        maxWidth: CONTENT_W - 120,
    });
    drawText(page, formatDate(new Date()), PAGE_W - MARGIN, y, {
        font: fonts.regular,
        size: 9,
        align: 'right',
        color: COLORS.muted,
    });
    y -= 10;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: COLORS.primary });
    return y - 12;
}

/** A4 landscape table of the control list with its totals. */
export async function controlListPdf(list: ControlList, me: PublicUser, campaignName: string): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    doc.setTitle(`Lista de control · ${me.receptorNumber}`);
    const fonts = {
        regular: await doc.embedFont(StandardFonts.Helvetica),
        bold: await doc.embedFont(StandardFonts.HelveticaBold),
    };
    const page = doc.addPage(LANDSCAPE);
    let y = drawHeader(page, fonts, me, campaignName);

    const { totals } = list;
    const summary = [
        `Sobres a enviar: ${formatInt(totals.envelopesToSend)}`,
        `Sobres a recibir: ${formatInt(totals.envelopesToReceive)}`,
        `Billetes que doy: ${formatBilletes(totals.decimosOut)}`,
        `Billetes que recibo: ${formatBilletes(totals.decimosIn)}`,
        totals.drafts ? `Borradores sin enviar: ${formatInt(totals.drafts)}` : '',
    ]
        .filter(Boolean)
        .join('   ·   ');
    drawText(page, summary, MARGIN, y, { font: fonts.bold, size: 10 });
    y -= 12;

    const fixed = 70 + 110 + 90 + 80 + 70 + 80 + 70 + 60;
    const columns = [
        { header: 'Nº receptor', width: 70 },
        { header: 'Administración', width: CONTENT_W - fixed },
        { header: 'Población', width: 110 },
        { header: 'Provincia', width: 90 },
        { header: 'Doy (billetes)', width: 80, align: 'right' as const },
        { header: 'Estado', width: 70 },
        { header: 'Recibo (billetes)', width: 80, align: 'right' as const },
        { header: 'Estado', width: 70 },
        { header: 'Dirección', width: 60, align: 'center' as const },
    ];
    const rows = list.rows.map((row) => [
        row.counterpart.receptorNumber,
        row.counterpart.name,
        row.counterpart.poblacion,
        row.counterpart.provincia,
        row.gives ? formatBilletes(row.gives.decimos) : '—',
        row.gives ? EXCHANGE_STATUS_LABELS[row.gives.status] : '',
        row.receives ? formatBilletes(row.receives.decimos) : '—',
        row.receives ? EXCHANGE_STATUS_LABELS[row.receives.status] : '',
        PAIR_DIRECTION_LABELS[row.direction],
    ]);

    drawTable({
        doc,
        cursor: { page, y },
        x: MARGIN,
        columns,
        rows,
        theme: { font: fonts.regular, bold: fonts.bold, size: 9, rowHeight: 16, margin: MARGIN },
        pageSize: LANDSCAPE,
        onNewPage: (p) => drawHeader(p, fonts, me, campaignName),
    });

    return doc.save();
}
