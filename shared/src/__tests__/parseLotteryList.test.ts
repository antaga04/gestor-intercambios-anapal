import { parseLotteryList } from '../lottery/parseLotteryList';

describe('parseLotteryList', () => {
    it('parses plain numbers and pads them to 5 digits', () => {
        const { rows, issues } = parseLotteryList('12345\n7\n00042');
        expect(issues).toEqual([]);
        expect(rows.map((r) => r.numero)).toEqual(['12345', '00007', '00042']);
        expect(rows[0].series).toEqual([]);
    });

    it('parses ranges with any separator', () => {
        const { rows } = parseLotteryList('12345;40;74\n23456,1,10\n34567\t5\t5\n45678 80 90');
        expect(rows.map((r) => r.series)).toEqual([
            [{ from: 40, to: 74 }],
            [{ from: 1, to: 10 }],
            [{ from: 5, to: 5 }],
            [{ from: 80, to: 90 }],
        ]);
    });

    it('treats a single serie as a one-serie range', () => {
        expect(parseLotteryList('12345;40').rows[0].series).toEqual([{ from: 40, to: 40 }]);
    });

    it('ignores blank lines and comments', () => {
        const { rows, issues } = parseLotteryList('# mis números\n\n12345\n   \n');
        expect(rows).toHaveLength(1);
        expect(issues).toEqual([]);
    });

    it('merges repeated números and reports how many were merged', () => {
        const { rows, mergedCount } = parseLotteryList('12345;1;10\n12345;11;20\n12345');
        expect(rows).toHaveLength(1);
        expect(rows[0].series).toEqual([{ from: 1, to: 20 }]);
        expect(rows[0].lines).toEqual([1, 2, 3]);
        expect(mergedCount).toBe(2);
    });

    it('reports issues with the offending line', () => {
        const { rows, issues } = parseLotteryList('12345\nabcde\n23456;0;10\n34567;1;999\n45678;1;2;3');
        expect(rows.map((r) => r.numero)).toEqual(['12345']);
        expect(issues.map((i) => i.line)).toEqual([2, 3, 4, 5]);
        expect(issues[0].message).toMatch(/dígitos/);
        expect(issues[1].message).toMatch(/series/);
    });
});
