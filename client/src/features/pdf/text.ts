import type { PDFFont, PDFPage, RGB } from 'pdf-lib';
import { rgb } from 'pdf-lib';

export const COLORS = {
    text: rgb(0.1, 0.1, 0.1),
    muted: rgb(0.45, 0.45, 0.45),
    primary: rgb(1, 0.4, 0.05), // #ff660d
    line: rgb(0.8, 0.8, 0.8),
    zebra: rgb(0.965, 0.965, 0.965),
};

/**
 * The standard fonts only know WinAnsi: keep what they can encode (Spanish accents, º, ª, –, · are
 * fine) and replace anything else so a stray emoji or symbol never breaks a print job.
 */
export function safeText(font: PDFFont, text: string): string {
    const normalized = text.normalize('NFC').replace(/\s+/g, ' ').trim();
    try {
        font.encodeText(normalized);
        return normalized;
    } catch {
        return [...normalized]
            .map((ch) => {
                try {
                    font.encodeText(ch);
                    return ch;
                } catch {
                    return '?';
                }
            })
            .join('');
    }
}

/** Largest size ≤ `size` (down to `minSize`) at which `text` fits in `maxWidth`. */
export function fitSize(font: PDFFont, text: string, size: number, maxWidth: number, minSize = 6): number {
    let current = size;
    while (current > minSize && font.widthOfTextAtSize(text, current) > maxWidth) current -= 0.5;
    return current;
}

/** Cuts `text` with an ellipsis so it fits in `maxWidth` at `size`. */
export function truncate(font: PDFFont, rawText: string, size: number, maxWidth: number): string {
    const text = safeText(font, rawText);
    if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
    const ellipsis = '…';
    let end = text.length;
    while (end > 0 && font.widthOfTextAtSize(text.slice(0, end) + ellipsis, size) > maxWidth) end -= 1;
    return text.slice(0, end).trimEnd() + ellipsis;
}

/** Greedy word wrap; long words are split by characters. */
export function wrap(font: PDFFont, rawText: string, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const paragraph of rawText.split(/\r?\n/).map((p) => safeText(font, p))) {
        let line = '';
        for (const word of paragraph.split(' ')) {
            const candidate = line ? `${line} ${word}` : word;
            if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
                line = candidate;
                continue;
            }
            if (line) lines.push(line);
            line = word;
            while (font.widthOfTextAtSize(line, size) > maxWidth && line.length > 1) {
                let cut = line.length - 1;
                while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > maxWidth) cut -= 1;
                lines.push(line.slice(0, cut));
                line = line.slice(cut);
            }
        }
        lines.push(line);
    }
    return lines;
}

interface DrawOptions {
    font: PDFFont;
    size: number;
    color?: RGB;
    /** Shrink to fit instead of overflowing. */
    maxWidth?: number;
    align?: 'left' | 'right' | 'center';
}

/** Draws one line, shrinking it to `maxWidth` when given. Returns the size used. */
export function drawText(page: PDFPage, text: string, x: number, y: number, options: DrawOptions): number {
    const { font, color = COLORS.text, align = 'left' } = options;
    const safe = safeText(font, text);
    const size = options.maxWidth ? fitSize(font, safe, options.size, options.maxWidth) : options.size;
    const width = font.widthOfTextAtSize(safe, size);
    const startX = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
    page.drawText(safe, { x: startX, y, size, font, color });
    return size;
}
