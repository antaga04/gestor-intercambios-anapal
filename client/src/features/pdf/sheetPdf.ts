import { PageSizes, StandardFonts, type PDFDocument, type PDFFont, type PDFPage } from 'pdf-lib';
import type { ExchangeDetail, ExchangeRow, PublicUser } from '@anapal/shared';
import { describeRowDetails, formatBilletes, ROW_TYPE_LABELS } from '@anapal/shared';
import { drawTable } from '@/features/pdf/table';
import { COLORS, drawText, wrap } from '@/features/pdf/text';
import { formatDate, formatInt } from '@/lib/format';

const MARGIN = 40;
const [PAGE_W, PAGE_H] = PageSizes.A4;
const CONTENT_W = PAGE_W - MARGIN * 2;

interface Fonts {
    regular: PDFFont;
    bold: PDFFont;
}

function drawPartyBlock(
    page: PDFPage,
    fonts: Fonts,
    title: string,
    user: PublicUser,
    x: number,
    top: number,
    width: number,
) {
    let y = top;
    drawText(page, title, x, y, { font: fonts.bold, size: 9, color: COLORS.primary });
    y -= 14;
    drawText(page, `Nº de receptor ${user.receptorNumber}`, x, y, { font: fonts.bold, size: 12, maxWidth: width });
    y -= 14;
    drawText(page, user.name, x, y, { font: fonts.regular, size: 10, maxWidth: width });
    y -= 12;
    drawText(page, `${user.poblacion} (${user.provincia})`, x, y, { font: fonts.regular, size: 10, maxWidth: width });
    y -= 12;
    const extra = [user.address, user.phone, user.contactName].filter(Boolean).join(' · ');
    if (extra) {
        drawText(page, extra, x, y, { font: fonts.regular, size: 9, color: COLORS.muted, maxWidth: width });
        y -= 12;
    }
    return y;
}

function drawSheetHeader(page: PDFPage, fonts: Fonts, exchange: ExchangeDetail, continued: boolean): number {
    let y = PAGE_H - MARGIN;
    drawText(page, 'HOJA DE INTERCAMBIO', MARGIN, y - 4, { font: fonts.bold, size: 16 });
    drawText(page, exchange.campaign.name, PAGE_W - MARGIN, y - 4, {
        font: fonts.bold,
        size: 11,
        align: 'right',
        color: COLORS.primary,
    });
    y -= 18;
    drawText(page, `Fecha ${formatDate(new Date())}`, PAGE_W - MARGIN, y, {
        font: fonts.regular,
        size: 9,
        align: 'right',
        color: COLORS.muted,
    });
    drawText(page, 'Intercambios ANAPAL', MARGIN, y, { font: fonts.regular, size: 9, color: COLORS.muted });
    y -= 10;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: COLORS.primary });
    if (continued) {
        y -= 16;
        drawText(
            page,
            `Sobre de ${exchange.from.receptorNumber} para ${exchange.to.receptorNumber} (continuación)`,
            MARGIN,
            y,
            {
                font: fonts.regular,
                size: 9,
                color: COLORS.muted,
            },
        );
        return y - 10;
    }
    y -= 22;
    const half = (CONTENT_W - 20) / 2;
    const leftBottom = drawPartyBlock(page, fonts, 'REMITENTE', exchange.from, MARGIN, y, half);
    const rightBottom = drawPartyBlock(page, fonts, 'DESTINATARIO', exchange.to, MARGIN + half + 20, y, half);
    return Math.min(leftBottom, rightBottom) - 10;
}

const quantityLabel = (row: ExchangeRow) =>
    row.type === 'billete'
        ? `${formatInt(row.quantity)} ${row.quantity === 1 ? 'billete' : 'billetes'}`
        : `${formatInt(row.quantity)} ${row.quantity === 1 ? 'décimo' : 'décimos'}`;

/** Appends the "Hoja de intercambio" page(s) for `exchange` to `doc`. */
export async function appendSheet(doc: PDFDocument, exchange: ExchangeDetail): Promise<void> {
    const fonts: Fonts = {
        regular: await doc.embedFont(StandardFonts.Helvetica),
        bold: await doc.embedFont(StandardFonts.HelveticaBold),
    };
    let page = doc.addPage(PageSizes.A4);
    let y = drawSheetHeader(page, fonts, exchange, false);

    const columns = [
        { header: 'Número', width: 62 },
        { header: 'Tipo', width: 82 },
        { header: 'Cantidad', width: 78, align: 'right' as const },
        { header: 'Series / fracciones', width: CONTENT_W - 62 - 82 - 78 - 56 },
        { header: 'Firmado', width: 56, align: 'center' as const },
    ];
    const rows = exchange.rows.map((row) => [
        row.numero,
        ROW_TYPE_LABELS[row.type],
        quantityLabel(row),
        describeRowDetails(row) + (row.note ? ` — ${row.note}` : ''),
        row.signed ? 'Sí' : '',
    ]);

    const cursor = drawTable({
        doc,
        cursor: { page, y },
        x: MARGIN,
        columns,
        rows,
        theme: { font: fonts.regular, bold: fonts.bold, size: 9, rowHeight: 16, margin: MARGIN + 90 },
        pageSize: PageSizes.A4,
        onNewPage: (p) => drawSheetHeader(p, fonts, exchange, true),
    });
    page = cursor.page;
    y = cursor.y - 18;

    const signed = exchange.rows.filter((r) => r.signed).length;
    const totals = `${formatInt(exchange.rows.length)} ${exchange.rows.length === 1 ? 'fila' : 'filas'} · ${formatInt(exchange.totalDecimos)} décimos · ${formatBilletes(exchange.totalDecimos)} billetes${signed ? ` · ${formatInt(signed)} ${signed === 1 ? 'firmado' : 'firmados'}` : ''}`;
    drawText(page, totals, PAGE_W - MARGIN, y, { font: fonts.bold, size: 10, align: 'right' });
    y -= 22;

    if (exchange.note) {
        drawText(page, 'Nota', MARGIN, y, { font: fonts.bold, size: 9, color: COLORS.primary });
        y -= 12;
        for (const line of wrap(fonts.regular, exchange.note, 9, CONTENT_W).slice(0, 6)) {
            drawText(page, line, MARGIN, y, { font: fonts.regular, size: 9 });
            y -= 11;
        }
        y -= 8;
    }

    const signatureY = Math.min(y - 40, MARGIN + 50);
    const half = (CONTENT_W - 40) / 2;
    for (const [label, x] of [
        ['Firma y sello del remitente', MARGIN],
        ['Firma y sello del destinatario', MARGIN + half + 40],
    ] as const) {
        page.drawLine({
            start: { x, y: signatureY },
            end: { x: x + half, y: signatureY },
            thickness: 0.6,
            color: COLORS.muted,
        });
        drawText(page, label, x, signatureY - 11, { font: fonts.regular, size: 8, color: COLORS.muted });
    }
}
