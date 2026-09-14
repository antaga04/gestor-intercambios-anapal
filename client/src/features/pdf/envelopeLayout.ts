/**
 * Where text goes on `/sobre-template.pdf` (200 × 270 mm, 567 × 765.36 pt, origin bottom-left).
 * Calibrated against the template's boxes: `x` is the left edge of the text, `y` its baseline,
 * `maxWidth` the room inside the box before the text is shrunk. Re-measure if the template changes.
 */
export interface TextSlot {
    x: number;
    y: number;
    size: number;
    maxWidth: number;
}

export interface EnvelopeBlockLayout {
    receptorNumber: TextSlot;
    poblacion: TextSlot;
    provincia: TextSlot;
}

export const ENVELOPE_LAYOUT: { destinatario: EnvelopeBlockLayout; remitente: EnvelopeBlockLayout } = {
    destinatario: {
        receptorNumber: { x: 190, y: 498, size: 16, maxWidth: 325 },
        poblacion: { x: 146, y: 455, size: 14, maxWidth: 370 },
        provincia: { x: 142, y: 409, size: 14, maxWidth: 374 },
    },
    remitente: {
        receptorNumber: { x: 411, y: 136, size: 11, maxWidth: 106 },
        poblacion: { x: 379, y: 103, size: 10, maxWidth: 138 },
        provincia: { x: 375, y: 69, size: 10, maxWidth: 142 },
    },
};

export const ENVELOPE_TEMPLATE_URL = '/sobre-template.pdf';
