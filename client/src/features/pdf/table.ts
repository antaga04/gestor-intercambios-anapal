import type { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import { COLORS, truncate } from '@/features/pdf/text';

export interface TableColumn {
    header: string;
    width: number;
    align?: 'left' | 'right' | 'center';
}

export interface TableTheme {
    font: PDFFont;
    bold: PDFFont;
    size: number;
    rowHeight: number;
    margin: number;
}

export interface TableCursor {
    page: PDFPage;
    y: number;
}

interface DrawTableOptions {
    doc: PDFDocument;
    cursor: TableCursor;
    x: number;
    columns: TableColumn[];
    rows: string[][];
    theme: TableTheme;
    /** Called on every new page so the caller can repeat its header. Returns the y to start at. */
    onNewPage?: (page: PDFPage) => number;
    pageSize: [number, number];
}

const CELL_PAD = 4;

function drawRow(
    page: PDFPage,
    x: number,
    y: number,
    cells: string[],
    columns: TableColumn[],
    font: PDFFont,
    size: number,
    rowHeight: number,
) {
    let cx = x;
    cells.forEach((cell, i) => {
        const col = columns[i];
        const text = truncate(font, cell, size, col.width - CELL_PAD * 2);
        const width = font.widthOfTextAtSize(text, size);
        const tx =
            col.align === 'right'
                ? cx + col.width - CELL_PAD - width
                : col.align === 'center'
                  ? cx + (col.width - width) / 2
                  : cx + CELL_PAD;
        page.drawText(text, { x: tx, y: y + (rowHeight - size) / 2 + 1, size, font, color: COLORS.text });
        cx += col.width;
    });
}

/**
 * Draws a simple grid table (single-line cells, truncated with an ellipsis), adding pages as
 * needed and repeating the header row. Returns the cursor after the last row.
 */
export function drawTable({
    doc,
    cursor,
    x,
    columns,
    rows,
    theme,
    onNewPage,
    pageSize,
}: DrawTableOptions): TableCursor {
    const { font, bold, size, rowHeight, margin } = theme;
    const totalWidth = columns.reduce((acc, c) => acc + c.width, 0);
    let { page, y } = cursor;

    const header = () => {
        y -= rowHeight;
        page.drawRectangle({ x, y, width: totalWidth, height: rowHeight, color: COLORS.primary, opacity: 0.12 });
        drawRow(
            page,
            x,
            y,
            columns.map((c) => c.header),
            columns,
            bold,
            size,
            rowHeight,
        );
        page.drawLine({ start: { x, y }, end: { x: x + totalWidth, y }, thickness: 0.8, color: COLORS.primary });
    };

    header();
    rows.forEach((cells, index) => {
        if (y - rowHeight < margin) {
            page = doc.addPage(pageSize);
            y = onNewPage ? onNewPage(page) : pageSize[1] - margin;
            header();
        }
        y -= rowHeight;
        if (index % 2 === 1) page.drawRectangle({ x, y, width: totalWidth, height: rowHeight, color: COLORS.zebra });
        drawRow(page, x, y, cells, columns, font, size, rowHeight);
        page.drawLine({ start: { x, y }, end: { x: x + totalWidth, y }, thickness: 0.3, color: COLORS.line });
    });

    return { page, y };
}
