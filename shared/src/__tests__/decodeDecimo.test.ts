import { decodeDecimo, describeScan, scanMatchesCampaign } from '../lottery/decodeDecimo';

// day 6 (Jueves) · jornada 102 · x · fracción 07 · serie 035 · x · número 12345 · 4 trailing digits
const JUEVES = '6102' + '0' + '07' + '035' + '0' + '12345' + '9876';
// day 5 (Sábado) · jornada 001 · fracción 10 · serie 192 · número 00007
const SABADO = '5001' + '1' + '10' + '192' + '3' + '00007' + '0000';

describe('decodeDecimo', () => {
    it('decodes a clean 20-digit code', () => {
        expect(decodeDecimo(JUEVES)).toEqual({
            numero: '12345',
            serie: '35',
            fraccion: '7',
            jornada: '102',
            dia: 'Jueves',
        });
        expect(decodeDecimo(SABADO)).toEqual({
            numero: '00007',
            serie: '192',
            fraccion: '10',
            jornada: '1',
            dia: 'Sábado',
        });
    });

    it('strips separators and non-digit noise', () => {
        expect(decodeDecimo('6102-0-07-035-0-12345-9876')).toEqual(decodeDecimo(JUEVES));
        expect(decodeDecimo(`  ${JUEVES}\n`)).toEqual(decodeDecimo(JUEVES));
        expect(decodeDecimo('abc' + JUEVES.split('').join(' '))).toEqual(decodeDecimo(JUEVES));
    });

    it('ignores digits beyond the 20th', () => {
        expect(decodeDecimo(JUEVES + '123456')).toEqual(decodeDecimo(JUEVES));
    });

    it('returns null when fewer than 20 digits are present', () => {
        expect(decodeDecimo(JUEVES.slice(0, 19))).toBeNull();
        expect(decodeDecimo('')).toBeNull();
        expect(decodeDecimo('12345')).toBeNull();
    });

    it('returns a null day for unknown day digits', () => {
        expect(decodeDecimo('7' + JUEVES.slice(1))?.dia).toBeNull();
    });
});

describe('scanMatchesCampaign', () => {
    const scan = decodeDecimo(JUEVES)!;

    it('always matches when the campaign has no barcode configured', () => {
        expect(scanMatchesCampaign(scan, undefined)).toBe(true);
        expect(scanMatchesCampaign(scan, null)).toBe(true);
    });

    it('compares day and jornada, tolerating leading zeros', () => {
        expect(scanMatchesCampaign(scan, { dayDigit: '6', jornada: '102' })).toBe(true);
        expect(scanMatchesCampaign(scan, { dayDigit: '6', jornada: '0102' })).toBe(true);
        expect(scanMatchesCampaign(scan, { dayDigit: '5', jornada: '102' })).toBe(false);
        expect(scanMatchesCampaign(scan, { dayDigit: '6', jornada: '103' })).toBe(false);
    });
});

describe('describeScan', () => {
    it('formats número, serie and fracción', () => {
        expect(describeScan(decodeDecimo(JUEVES)!)).toBe('12345 · serie 35 · fracción 7');
    });
});
