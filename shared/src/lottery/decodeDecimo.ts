import type { CampaignBarcode } from '../types/campaign';

export interface DecimoDecodificado {
    numero: string; // 5 digits
    serie: string; // "1".."192"
    fraccion: string; // "1".."10"
    jornada: string; // draw number within the year
    dia: 'Jueves' | 'Sábado' | null;
}

/**
 * Decodes the 20-digit barcode printed on a décimo (docs/03 §4). Kept verbatim from the
 * reference implementation: separators and noise are stripped, extra digits are ignored.
 */
export function decodeDecimo(raw: string): DecimoDecodificado | null {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 20) return null;
    const d = digits.slice(0, 20);

    const numero = d.slice(11, 16);
    if (!/^\d{5}$/.test(numero)) return null;

    const dia = d[0] === '6' ? 'Jueves' : d[0] === '5' ? 'Sábado' : null;

    return {
        numero,
        serie: String(Number(d.slice(7, 10))),
        fraccion: String(Number(d.slice(5, 7))),
        jornada: String(Number(d.slice(1, 4))),
        dia,
    };
}

export const DAY_DIGIT_LABEL: Record<CampaignBarcode['dayDigit'], NonNullable<DecimoDecodificado['dia']>> = {
    '6': 'Jueves',
    '5': 'Sábado',
};

/**
 * Whether a scan belongs to the draw the campaign expects. A mismatch is only a warning
 * (`scan.campaign_mismatch`): the décimo can still be added.
 */
export function scanMatchesCampaign(scan: DecimoDecodificado, barcode: CampaignBarcode | null | undefined): boolean {
    if (!barcode) return true;
    if (scan.dia !== DAY_DIGIT_LABEL[barcode.dayDigit]) return false;
    return String(Number(barcode.jornada)) === scan.jornada;
}

/** "12345 · serie 3 · fracción 7", used by toasts so the user can verify the read. */
export const describeScan = (scan: DecimoDecodificado) =>
    `${scan.numero} · serie ${scan.serie} · fracción ${scan.fraccion}`;
