import type { ExchangeStatus, ExchangeSummary, PublicUser } from '../index';
import { buildControlList, compareReceptor, controlListToCsv } from '../lottery/controlList';

const user = (id: string, receptorNumber: string, name = `Admon ${id}`): PublicUser => ({
    _id: id,
    receptorNumber,
    name,
    poblacion: 'Madrid',
    provincia: 'Madrid',
});

const ME = user('me', '28001');
const A = user('a', '28100');
const B = user('b', '8050');
const C = user('c', '28002');

let seq = 0;
const exchange = (from: PublicUser, to: PublicUser, status: ExchangeStatus, totalDecimos: number): ExchangeSummary => ({
    _id: `x${++seq}`,
    status,
    totalDecimos,
    rowCount: 1,
    signedRowCount: 0,
    from,
    to,
    direction: 'da',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
});

describe('buildControlList', () => {
    it('groups by counterpart, computes the direction and sorts by receptor number', () => {
        const list = buildControlList(
            [
                exchange(ME, A, 'pending', 240), // I give A
                exchange(B, ME, 'accepted', 100), // B gives me
                exchange(ME, C, 'accepted', 30), // both with C
                exchange(C, ME, 'pending', 50),
            ],
            ME._id,
        );
        expect(list.rows.map((r) => r.counterpart._id)).toEqual(['b', 'c', 'a']);
        expect(list.rows.map((r) => r.direction)).toEqual(['recibe', 'ambos', 'da']);
        expect(list.rows[1]).toMatchObject({
            gives: { status: 'accepted', decimos: 30 },
            receives: { status: 'pending', decimos: 50 },
        });
    });

    it('totals only pending/accepted envelopes and counts outgoing drafts separately', () => {
        const list = buildControlList(
            [
                exchange(ME, A, 'pending', 240),
                exchange(ME, B, 'draft', 10),
                exchange(ME, C, 'accepted', 30),
                exchange(C, ME, 'pending', 50),
                exchange(A, ME, 'accepted', 20),
            ],
            ME._id,
        );
        expect(list.totals).toEqual({
            envelopesToSend: 2,
            envelopesToReceive: 2,
            decimosOut: 270,
            decimosIn: 70,
            drafts: 1,
        });
        expect(list.rows.find((r) => r.counterpart._id === 'b')).toMatchObject({ direction: 'da', receives: null });
    });

    it('ignores rejected/cancelled exchanges, incoming drafts and exchanges I am not part of', () => {
        const list = buildControlList(
            [
                exchange(ME, A, 'rejected', 240),
                exchange(ME, B, 'cancelled', 10),
                exchange(C, ME, 'draft', 30),
                exchange(A, B, 'accepted', 99),
            ],
            ME._id,
        );
        expect(list.rows).toEqual([]);
        expect(list.totals).toEqual({
            envelopesToSend: 0,
            envelopesToReceive: 0,
            decimosOut: 0,
            decimosIn: 0,
            drafts: 0,
        });
    });

    it('keeps the counterpart when one side is live and the other is not', () => {
        const list = buildControlList([exchange(ME, A, 'rejected', 240), exchange(A, ME, 'pending', 20)], ME._id);
        expect(list.rows).toHaveLength(1);
        expect(list.rows[0]).toMatchObject({ direction: 'recibe', gives: null, receives: { decimos: 20 } });
    });
});

describe('compareReceptor', () => {
    it('orders numerically even though receptor numbers are strings', () => {
        expect(['10', '9', '100', '28001'].sort(compareReceptor)).toEqual(['9', '10', '100', '28001']);
    });
});

describe('controlListToCsv', () => {
    it('writes a BOM, `;` separators, Spanish decimals and totals', () => {
        const list = buildControlList([exchange(ME, A, 'pending', 24), exchange(B, ME, 'accepted', 100)], ME._id);
        const csv = controlListToCsv(list);
        expect(csv.startsWith('﻿')).toBe(true);
        const lines = csv.slice(1).split('\r\n');
        expect(lines[0]).toBe(
            'Nº receptor;Administración;Población;Provincia;Doy (billetes);Estado doy;Recibo (billetes);Estado recibo;Dirección',
        );
        expect(lines[1]).toBe('8050;Admon b;Madrid;Madrid;;;10,0;Aceptado;Recibo');
        expect(lines[2]).toBe('28100;Admon a;Madrid;Madrid;2,4;Pendiente;;;Doy');
        expect(lines).toContain('Billetes que doy;2,4');
        expect(lines).toContain('Sobres a recibir;1');
    });

    it('quotes cells containing the separator or quotes', () => {
        const tricky = { ...A, name: 'Lotería "La Suerte"; Centro' };
        const csv = controlListToCsv(buildControlList([exchange(ME, tricky, 'pending', 10)], ME._id));
        expect(csv).toContain('"Lotería ""La Suerte""; Centro"');
    });
});
