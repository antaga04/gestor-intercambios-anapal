import { describeScanEvent, mergeScanIntoRow, validateRow, type ScanRow } from '../lottery/rows';

const empty = (type: ScanRow['type']): ScanRow => ({ numero: '', type, quantity: 1, items: [] });
const scan = (numero: string, serie: number, fraccion = 1) => ({
    numero,
    serie: String(serie),
    fraccion: String(fraccion),
});

describe('mergeScanIntoRow · billete', () => {
    it('first scan starts the range, second closes it in either order', () => {
        const a = mergeScanIntoRow(empty('billete'), scan('12345', 74, 3));
        expect(a.event).toBe('series_start');
        expect(a.row).toMatchObject({ numero: '12345', serieFrom: 74, serieTo: undefined, quantity: 1 });
        expect(describeScanEvent(a.event, a.row)).toContain('Serie inicial 74');

        const b = mergeScanIntoRow(a.row, scan('12345', 35, 9));
        expect(b.event).toBe('series_end');
        expect(b.row).toMatchObject({ serieFrom: 35, serieTo: 74, quantity: 40 });
        expect(describeScanEvent(b.event, b.row)).toBe('Rango 35–74 · 40 billetes');
        expect(validateRow({ ...b.row, details: { serieFrom: 35, serieTo: 74 } })).toEqual([]);

        const c = mergeScanIntoRow(empty('billete'), scan('12345', 35));
        const d = mergeScanIntoRow(c.row, scan('12345', 74));
        expect(d.row).toMatchObject({ serieFrom: 35, serieTo: 74, quantity: 40 });
    });

    it('the same serie twice is a single billete', () => {
        const a = mergeScanIntoRow(empty('billete'), scan('12345', 35, 1));
        const b = mergeScanIntoRow(a.row, scan('12345', 35, 8));
        expect(b.event).toBe('series_end');
        expect(b.row).toMatchObject({ serieFrom: 35, serieTo: 35, quantity: 1 });
        expect(describeScanEvent(b.event, b.row)).toBe('Serie 35 · 1 billete');
    });

    it('a third scan restarts the range', () => {
        const row = { ...empty('billete'), numero: '12345', serieFrom: 35, serieTo: 74, quantity: 40 };
        const r = mergeScanIntoRow(row, scan('12345', 100));
        expect(r.event).toBe('series_start');
        expect(r.row).toMatchObject({ serieFrom: 100, serieTo: undefined, quantity: 1 });
    });

    it('starts the range on a row whose número was typed by hand', () => {
        const row = { ...empty('billete'), numero: '12345', quantity: 5 };
        const r = mergeScanIntoRow(row, scan('12345', 10));
        expect(r.event).toBe('series_start');
        expect(r.row).toMatchObject({ serieFrom: 10, quantity: 1 });
    });
});

describe('mergeScanIntoRow · decimo', () => {
    it('sets serie and fracción, a second scan overwrites', () => {
        const a = mergeScanIntoRow(empty('decimo'), scan('00007', 3, 7));
        expect(a.event).toBe('set');
        expect(a.row).toMatchObject({ numero: '00007', serie: 3, fraccion: 7, quantity: 1 });
        expect(describeScanEvent(a.event, a.row)).toBe('Serie 3 · fracción 7');
        const b = mergeScanIntoRow(a.row, scan('00007', 4, 1));
        expect(b.row).toMatchObject({ serie: 4, fraccion: 1 });
    });
});

describe('mergeScanIntoRow · decimos', () => {
    it('appends unique pairs and keeps quantity in sync', () => {
        const a = mergeScanIntoRow(empty('decimos'), scan('12345', 3, 7));
        expect(a.event).toBe('appended');
        expect(a.row).toMatchObject({ items: [{ serie: 3, fraccion: 7 }], quantity: 1 });
        const b = mergeScanIntoRow(a.row, scan('12345', 3, 8));
        expect(b.row).toMatchObject({
            items: [
                { serie: 3, fraccion: 7 },
                { serie: 3, fraccion: 8 },
            ],
            quantity: 2,
        });
        expect(describeScanEvent(b.event, b.row)).toBe('Décimo añadido (2)');
    });

    it('rejects a duplicate décimo without touching the row', () => {
        const a = mergeScanIntoRow(empty('decimos'), scan('12345', 3, 7));
        const b = mergeScanIntoRow(a.row, scan('12345', 3, 7));
        expect(b.event).toBe('duplicate');
        expect(b.row).toBe(a.row);
    });
});

describe('mergeScanIntoRow · new número', () => {
    it('returns a fresh row of the same type with the scan applied', () => {
        const row = { ...empty('billete'), numero: '12345', serieFrom: 35, serieTo: 74, quantity: 40 };
        const r = mergeScanIntoRow(row, scan('99999', 12));
        expect(r.event).toBe('new_row');
        expect(r.row).toMatchObject({
            numero: '99999',
            type: 'billete',
            serieFrom: 12,
            serieTo: undefined,
            quantity: 1,
        });
        expect(describeScanEvent(r.event, r.row)).toBe('Nuevo número detectado: 99999');
    });

    it('drops the old items when the type is decimos', () => {
        const row = { ...empty('decimos'), numero: '12345', items: [{ serie: 1, fraccion: 1 }], quantity: 1 };
        const r = mergeScanIntoRow(row, scan('99999', 2, 2));
        expect(r.event).toBe('new_row');
        expect(r.row.items).toEqual([{ serie: 2, fraccion: 2 }]);
    });

    it('keeps extra properties of the row object (client drafts carry key/signed)', () => {
        const row = { ...empty('decimo'), key: 'abc', signed: true };
        const r = mergeScanIntoRow(row, scan('12345', 1, 1));
        expect(r.row).toMatchObject({ key: 'abc', signed: true, numero: '12345' });
    });
});
