import { describeRowDetails, rowSeries, validateRow, type RowInput } from '../lottery/rows';

const codes = (row: RowInput) => validateRow(row).map((i) => i.code);

describe('validateRow', () => {
    it('accepts a valid billete range', () => {
        expect(
            codes({ numero: '12345', type: 'billete', quantity: 35, details: { serieFrom: 40, serieTo: 74 } }),
        ).toEqual([]);
    });

    it('rejects a range whose size does not match the quantity', () => {
        expect(
            codes({ numero: '12345', type: 'billete', quantity: 2, details: { serieFrom: 40, serieTo: 74 } }),
        ).toEqual(['row.series_count_mismatch']);
    });

    it('rejects half-filled and inverted ranges', () => {
        expect(codes({ numero: '12345', type: 'billete', quantity: 1, details: { serieFrom: 40 } })).toEqual([
            'row.series_incomplete',
        ]);
        expect(
            codes({ numero: '12345', type: 'billete', quantity: 1, details: { serieFrom: 74, serieTo: 40 } }),
        ).toEqual(['row.series_order']);
    });

    it('allows a billete without series', () => {
        expect(codes({ numero: '12345', type: 'billete', quantity: 3 })).toEqual([]);
    });

    it('checks número and quantity', () => {
        expect(codes({ numero: '123', type: 'billete', quantity: 1 })).toEqual(['row.numero_invalid']);
        expect(codes({ numero: '12345', type: 'billete', quantity: 0 })).toEqual(['row.quantity_out_of_range']);
        expect(codes({ numero: '12345', type: 'decimo', quantity: 2 })).toEqual(['row.quantity_out_of_range']);
        expect(codes({ numero: '12345', type: 'decimos', quantity: 1 })).toEqual(['row.quantity_out_of_range']);
    });

    it('validates a single décimo', () => {
        expect(codes({ numero: '00007', type: 'decimo', quantity: 1, details: { serie: 3, fraccion: 7 } })).toEqual([]);
        expect(codes({ numero: '00007', type: 'decimo', quantity: 1, details: { serie: 3 } })).toEqual([
            'row.decimo_incomplete',
        ]);
        expect(codes({ numero: '00007', type: 'decimo', quantity: 1, details: { serie: 3, fraccion: 11 } })).toEqual([
            'row.fraccion_invalid',
        ]);
    });

    it('validates several décimos', () => {
        const items = [
            { serie: 10, fraccion: 1 },
            { serie: 10, fraccion: 2 },
            { serie: 12, fraccion: 9 },
        ];
        expect(codes({ numero: '54321', type: 'decimos', quantity: 3, details: { items } })).toEqual([]);
        expect(codes({ numero: '54321', type: 'decimos', quantity: 2, details: { items } })).toEqual([
            'row.items_count_mismatch',
        ]);
        expect(
            codes({
                numero: '54321',
                type: 'decimos',
                quantity: 2,
                details: { items: [items[0], { ...items[0] }] },
            }),
        ).toEqual(['row.items_duplicate']);
        expect(codes({ numero: '54321', type: 'decimos', quantity: 4 })).toEqual([]);
    });
});

describe('rowSeries', () => {
    it('expands a billete range', () => {
        expect(
            rowSeries({ numero: '12345', type: 'billete', quantity: 3, details: { serieFrom: 40, serieTo: 42 } }),
        ).toEqual([40, 41, 42]);
    });
    it('returns the décimo serie and dedupes items', () => {
        expect(rowSeries({ numero: '1', type: 'decimo', quantity: 1, details: { serie: 3, fraccion: 7 } })).toEqual([
            3,
        ]);
        expect(
            rowSeries({
                numero: '1',
                type: 'decimos',
                quantity: 2,
                details: {
                    items: [
                        { serie: 10, fraccion: 1 },
                        { serie: 10, fraccion: 2 },
                    ],
                },
            }),
        ).toEqual([10]);
    });
    it('is empty when the series are unknown', () => {
        expect(rowSeries({ numero: '12345', type: 'billete', quantity: 3 })).toEqual([]);
    });
});

describe('describeRowDetails', () => {
    it('describes each type', () => {
        expect(
            describeRowDetails({ numero: '1', type: 'billete', quantity: 2, details: { serieFrom: 40, serieTo: 41 } }),
        ).toBe('Series 40–41');
        expect(
            describeRowDetails({ numero: '1', type: 'billete', quantity: 1, details: { serieFrom: 40, serieTo: 40 } }),
        ).toBe('Serie 40');
        expect(
            describeRowDetails({ numero: '1', type: 'decimo', quantity: 1, details: { serie: 3, fraccion: 7 } }),
        ).toBe('Serie 3 · fracción 7');
        expect(
            describeRowDetails({
                numero: '1',
                type: 'decimos',
                quantity: 2,
                details: {
                    items: [
                        { serie: 10, fraccion: 1 },
                        { serie: 12, fraccion: 9 },
                    ],
                },
            }),
        ).toBe('10/1, 12/9');
        expect(describeRowDetails({ numero: '1', type: 'billete', quantity: 1 })).toBe('Series sin especificar');
    });
});
