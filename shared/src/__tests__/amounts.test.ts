import { exchangeTotalDecimos, formatBilletes, rowAmountDecimos, toBilletes } from '../lottery/amounts';

describe('amounts', () => {
    it('counts billetes as 10 décimos', () => {
        expect(rowAmountDecimos({ type: 'billete', quantity: 2 })).toBe(20);
        expect(rowAmountDecimos({ type: 'decimo', quantity: 1 })).toBe(1);
        expect(rowAmountDecimos({ type: 'decimos', quantity: 3 })).toBe(3);
    });

    it('sums an exchange', () => {
        expect(
            exchangeTotalDecimos([
                { type: 'billete', quantity: 2 },
                { type: 'decimo', quantity: 1 },
                { type: 'decimos', quantity: 3 },
            ]),
        ).toBe(24);
    });

    it('formats in billetes with Spanish comma', () => {
        expect(toBilletes(24)).toBe(2.4);
        expect(formatBilletes(24)).toBe('2,4');
        expect(formatBilletes(10)).toBe('1,0');
        expect(formatBilletes(1)).toBe('0,1');
    });
});
