import { legacyLinesToRows, type LegacyLineInput } from '../lottery/legacyRows';

let seq = 0;
const line = (partial: Partial<LegacyLineInput>): LegacyLineInput => ({
    id: `l${++seq}`,
    numero: '12345',
    billetes: 1,
    sellado: true,
    modo: 'billete',
    ...partial,
});

describe('legacyLinesToRows', () => {
    it('maps a billete line and pads short números', () => {
        const { rows, skipped } = legacyLinesToRows([line({ numero: '64', billetes: 40 })]);
        expect(skipped).toEqual([]);
        expect(rows[0].row).toMatchObject({ numero: '00064', type: 'billete', quantity: 40, signed: true });
    });

    it('skips lines without a usable número, keeping the raw text in the reason', () => {
        const { rows, skipped } = legacyLinesToRows([
            line({ numero: null }),
            line({ numero: 'SALP' }),
            line({ numero: '5+5' }),
        ]);
        expect(rows).toEqual([]);
        expect(skipped.map((s) => s.reason)).toEqual([
            'sin número',
            'número no válido ("SALP")',
            'número no válido ("5+5")',
        ]);
    });

    it('maps a 0,1 décimo with its serie and fracción', () => {
        const { rows } = legacyLinesToRows([line({ modo: 'decimo', billetes: 0.1, serie: 12, fraccion: 4 })]);
        expect(rows[0].row).toMatchObject({ type: 'decimo', quantity: 1, details: { serie: 12, fraccion: 4 } });
    });

    it('keeps an out-of-range serie in the note instead of the details', () => {
        const { rows, skipped } = legacyLinesToRows([line({ modo: 'decimo', billetes: 0.1, serie: 205, fraccion: 4 })]);
        expect(skipped).toEqual([]);
        expect(rows[0].row).toMatchObject({ type: 'decimo', quantity: 1, note: 'Importado: serie 205, fracción 4' });
        expect(rows[0].row.details).toBeUndefined();
    });

    it('turns fractional "decimos" billetes into a décimos count', () => {
        const { rows } = legacyLinesToRows([line({ modo: 'decimos', billetes: 2.5 })]);
        expect(rows[0].row).toMatchObject({ type: 'decimos', quantity: 25 });
    });

    it('sums billete lines of the same número into one row', () => {
        const { rows } = legacyLinesToRows([line({ billetes: 15 }), line({ billetes: 10, sellado: false })]);
        expect(rows).toHaveLength(1);
        expect(rows[0].row).toMatchObject({ type: 'billete', quantity: 25, signed: false });
        expect(rows[0].lineIds).toHaveLength(2);
    });

    it('merges several concrete décimos of one número into a decimos row with items', () => {
        const { rows } = legacyLinesToRows([
            line({ numero: '84769', modo: 'decimo', billetes: 0.1, serie: 3, fraccion: 1 }),
            line({ numero: '84769', modo: 'decimo', billetes: 0.1, serie: 3, fraccion: 2 }),
        ]);
        expect(rows[0].row).toMatchObject({
            type: 'decimos',
            quantity: 2,
            details: {
                items: [
                    { serie: 3, fraccion: 1 },
                    { serie: 3, fraccion: 2 },
                ],
            },
        });
    });

    it('describes a mixed billete + décimo group in the note', () => {
        const { rows } = legacyLinesToRows([
            line({ numero: '61236', billetes: 1 }),
            line({ numero: '61236', modo: 'decimo', billetes: 0.1, serie: 2, fraccion: 4 }),
        ]);
        expect(rows[0].row).toMatchObject({
            type: 'decimos',
            quantity: 11,
            note: 'Importado: 1 billete + 1 décimo (serie 2, fracción 4)',
        });
        expect(rows[0].row.details).toBeUndefined();
    });

    it('reports rows the schema rejects', () => {
        const { rows, skipped } = legacyLinesToRows([line({ billetes: 200 })]);
        expect(rows).toEqual([]);
        expect(skipped).toHaveLength(1);
    });
});
