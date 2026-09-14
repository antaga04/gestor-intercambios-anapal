import { Campaign } from '@/api/models/campaign';
import { Exchange } from '@/api/models/exchange';
import { LotteryNumber } from '@/api/models/lotteryNumber';
import { User } from '@/api/models/user';
import { hashPassword } from '@/utils/password';
import type { ExchangeStatus } from '@anapal/shared';

const DEMO_PASSWORD = 'Demo1234';

const DEMO_ADMONS = [
    { receptorNumber: '10001', name: 'Administración nº 1', poblacion: 'Alcalá de Henares', provincia: 'Madrid' },
    { receptorNumber: '10002', name: 'La Bruja de Oro', poblacion: 'Sort', provincia: 'Lleida' },
    { receptorNumber: '10003', name: 'Doña Manolita', poblacion: 'Madrid', provincia: 'Madrid' },
    { receptorNumber: '10004', name: 'Administración nº 4', poblacion: 'Sevilla', provincia: 'Sevilla' },
    { receptorNumber: '10005', name: 'El Gato Negro', poblacion: 'Valencia', provincia: 'Valencia' },
    { receptorNumber: '10006', name: 'Administración nº 6', poblacion: 'Bilbao', provincia: 'Bizkaia' },
    { receptorNumber: '10007', name: 'La Pajarita', poblacion: 'Zaragoza', provincia: 'Zaragoza' },
    { receptorNumber: '10008', name: 'Administración nº 8', poblacion: 'A Coruña', provincia: 'A Coruña' },
    { receptorNumber: '10009', name: 'El Buen Augurio', poblacion: 'Málaga', provincia: 'Málaga' },
    { receptorNumber: '10010', name: 'Administración nº 10', poblacion: 'Palma', provincia: 'Illes Balears' },
];

export async function seedDemoUsers() {
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    for (const admon of DEMO_ADMONS) {
        const email = `admon${admon.receptorNumber}@example.com`;
        await User.findOneAndUpdate(
            { email },
            {
                $set: { passwordHash, status: 'active', role: 'user' },
                $setOnInsert: { email, ...admon, phone: '900 000 000', contactName: 'Demo' },
            },
            { upsert: true },
        );
    }
    console.log(`[seed] ${DEMO_ADMONS.length} demo admons ready (password: ${DEMO_PASSWORD})`);
}

/** A few exchanges in every status between the demo admons, plus a small lottery list. */
export async function seedDemoExchanges() {
    const campaign = await Campaign.findOne({ isActive: true });
    if (!campaign) {
        console.warn('[seed] no active campaign — skipping demo exchanges');
        return;
    }
    const users = await User.find({ receptorNumber: { $in: DEMO_ADMONS.map((a) => a.receptorNumber) } })
        .sort({ receptorNumber: 1 })
        .select('_id');
    if (users.length < 6) return;

    await Exchange.deleteMany({ campaign: campaign._id, from: { $in: users.map((u) => u._id) } });

    const rows = (numero: string) => [
        { numero, type: 'billete' as const, quantity: 2, details: { serieFrom: 40, serieTo: 41 }, signed: true },
        { numero: '00007', type: 'decimo' as const, quantity: 1, details: { serie: 3, fraccion: 7 }, signed: false },
        {
            numero: '54321',
            type: 'decimos' as const,
            quantity: 3,
            details: {
                items: [
                    { serie: 10, fraccion: 1 },
                    { serie: 10, fraccion: 2 },
                    { serie: 12, fraccion: 9 },
                ],
            },
            signed: false,
        },
    ];

    // user[0] is the admon most demos log in as: give to 1,2,3 and receive from 2,4,5.
    const plan: { from: number; to: number; status: ExchangeStatus; numero: string }[] = [
        { from: 0, to: 1, status: 'pending', numero: '12345' },
        { from: 0, to: 2, status: 'accepted', numero: '23456' },
        { from: 0, to: 3, status: 'draft', numero: '34567' },
        { from: 1, to: 0, status: 'pending', numero: '45678' },
        { from: 3, to: 0, status: 'accepted', numero: '56789' },
        { from: 4, to: 0, status: 'rejected', numero: '67890' },
    ];

    const created = new Map<string, string>();
    for (const p of plan) {
        const doc = await Exchange.create({
            campaign: campaign._id,
            from: users[p.from]._id,
            to: users[p.to]._id,
            status: p.status,
            rows: rows(p.numero),
            sentAt: p.status === 'draft' ? undefined : new Date(),
            respondedAt: ['accepted', 'rejected'].includes(p.status) ? new Date() : undefined,
        });
        created.set(`${p.from}-${p.to}`, doc._id.toString());
    }
    // Link counterparts both ways (0↔1 and 0↔3 are bidirectional).
    for (const [key, id] of created) {
        const [from, to] = key.split('-');
        const reverse = created.get(`${to}-${from}`);
        if (reverse) await Exchange.updateOne({ _id: id }, { $set: { counterpart: reverse } });
    }

    await LotteryNumber.deleteMany({ campaign: campaign._id, user: users[0]._id });
    await LotteryNumber.insertMany(
        ['12345', '23456', '34567', '00007', '54321'].map((numero) => ({
            user: users[0]._id,
            campaign: campaign._id,
            numero,
            series: [{ from: 1, to: 60 }],
            source: 'import' as const,
        })),
    );

    console.log(`[seed] ${plan.length} demo exchanges + lottery list ready`);
}
