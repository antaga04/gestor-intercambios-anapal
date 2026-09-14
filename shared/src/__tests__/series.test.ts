import { countSeries, formatSeries, mergeSeries, normalizeSeries, seriesContains } from '../lottery/series';

describe('series ranges', () => {
    it('sorts and merges overlapping or adjacent ranges', () => {
        expect(
            normalizeSeries([
                { from: 4, to: 6 },
                { from: 1, to: 3 },
            ]),
        ).toEqual([{ from: 1, to: 6 }]);
        expect(
            normalizeSeries([
                { from: 1, to: 5 },
                { from: 3, to: 9 },
            ]),
        ).toEqual([{ from: 1, to: 9 }]);
        expect(
            normalizeSeries([
                { from: 1, to: 3 },
                { from: 10, to: 10 },
            ]),
        ).toEqual([
            { from: 1, to: 3 },
            { from: 10, to: 10 },
        ]);
    });

    it('flips inverted ranges', () => {
        expect(normalizeSeries([{ from: 74, to: 35 }])).toEqual([{ from: 35, to: 74 }]);
    });

    it('merges two lists', () => {
        expect(mergeSeries([{ from: 1, to: 10 }], [{ from: 11, to: 20 }])).toEqual([{ from: 1, to: 20 }]);
    });

    it('checks membership and counts', () => {
        const ranges = [{ from: 35, to: 74 }];
        expect(seriesContains(ranges, 35)).toBe(true);
        expect(seriesContains(ranges, 75)).toBe(false);
        expect(
            countSeries([
                { from: 1, to: 3 },
                { from: 10, to: 10 },
            ]),
        ).toBe(4);
    });

    it('works with objects that only expose from/to through getters (mongoose subdocs)', () => {
        const subdoc = Object.create({
            get from() {
                return 75;
            },
            get to() {
                return 90;
            },
        }) as { from: number; to: number };
        expect(normalizeSeries([{ from: 40, to: 74 }, subdoc])).toEqual([{ from: 40, to: 90 }]);
    });

    it('merges adjacent ranges into one', () => {
        expect(mergeSeries([{ from: 40, to: 74 }], [{ from: 75, to: 90 }])).toEqual([{ from: 40, to: 90 }]);
    });

    it('formats in Spanish style', () => {
        expect(
            formatSeries([
                { from: 35, to: 74 },
                { from: 80, to: 80 },
            ]),
        ).toBe('35–74, 80');
        expect(formatSeries([])).toBe('');
    });
});
