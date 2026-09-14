import { pairDirection } from '../lottery/direction';

describe('pairDirection', () => {
    it('is "da" when only my outgoing exchange is live', () => {
        expect(pairDirection({ status: 'pending' }, null)).toBe('da');
        expect(pairDirection({ status: 'draft' }, { status: 'rejected' })).toBe('da');
    });

    it('is "recibe" when only the counterpart exchange is live', () => {
        expect(pairDirection(null, { status: 'accepted' })).toBe('recibe');
        expect(pairDirection({ status: 'cancelled' }, { status: 'pending' })).toBe('recibe');
    });

    it('is "ambos" when both are live', () => {
        expect(pairDirection({ status: 'accepted' }, { status: 'pending' })).toBe('ambos');
    });

    it('falls back to "da" when neither is live', () => {
        expect(pairDirection({ status: 'rejected' }, { status: 'cancelled' })).toBe('da');
    });
});
