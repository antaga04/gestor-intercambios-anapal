import { Campaign } from '@/api/models/campaign';
import { Exchange } from '@/api/models/exchange';
import { LotteryNumber } from '@/api/models/lotteryNumber';
import { User } from '@/api/models/user';
import { hashPassword } from '@/utils/password';
import { LIMITS, type ExchangeStatus, type RowType, type SerieRange } from '@anapal/shared';

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

/** Numbers each admon holds in "Mi lotería". Pools are disjoint, so nothing given ever overlaps. */
const NUMBERS_PER_ADMON = 12;

// Deterministic PRNG (mulberry32): the same demo data on every run.
function rng(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const random = rng(20261222);
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const pick = <T>(list: T[]): T => list[between(0, list.length - 1)];
const daysAgo = (days: number, hour = 10) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(hour, between(0, 59), 0, 0);
    return date;
};

interface OwnedNumber {
    numero: string;
    series: SerieRange[];
}

/** One disjoint pool of numbers per admon: an exchange only makes sense for numbers the other side lacks. */
function buildPools(): OwnedNumber[][] {
    const taken = new Set<string>();
    return DEMO_ADMONS.map(() => {
        const pool: OwnedNumber[] = [];
        while (pool.length < NUMBERS_PER_ADMON) {
            const numero = String(between(0, 99999)).padStart(LIMITS.numeroLength, '0');
            if (taken.has(numero)) continue;
            taken.add(numero);
            const from = between(1, 150);
            pool.push({ numero, series: [{ from, to: Math.min(LIMITS.serieMax, from + between(9, 40)) }] });
        }
        return pool.sort((a, b) => a.numero.localeCompare(b.numero));
    });
}

/** A row of the given type for a number the sender owns, with series inside the ranges of "Mi lotería". */
function rowFor(owned: OwnedNumber, type: RowType) {
    const range = owned.series[0];
    const base = { numero: owned.numero, signed: random() < 0.35 };
    if (type === 'billete') {
        const quantity = between(1, 4);
        const serieFrom = between(range.from, range.to - quantity + 1);
        return { ...base, type, quantity, details: { serieFrom, serieTo: serieFrom + quantity - 1 } };
    }
    if (type === 'decimo') {
        return {
            ...base,
            type,
            quantity: 1,
            details: { serie: between(range.from, range.to), fraccion: between(1, LIMITS.fraccionMax) },
        };
    }
    const quantity = between(2, 4);
    const items: { serie: number; fraccion: number }[] = [];
    const seen = new Set<string>();
    while (items.length < quantity) {
        const item = { serie: between(range.from, range.to), fraccion: between(1, LIMITS.fraccionMax) };
        const key = `${item.serie}/${item.fraccion}`;
        if (seen.has(key)) continue;
        seen.add(key);
        items.push(item);
    }
    return { ...base, type, quantity, details: { items } };
}

/** `count` rows of distinct numbers from the sender's pool, mixing the three row types. */
function rowsFrom(pool: OwnedNumber[], count: number) {
    const shuffled = [...pool].sort(() => random() - 0.5).slice(0, count);
    const types: RowType[] = ['billete', 'billete', 'decimos', 'decimo'];
    return shuffled.map((owned, index) => rowFor(owned, index < types.length ? types[index] : pick(types)));
}

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

interface PlanItem {
    from: number;
    to: number;
    status: ExchangeStatus;
    rows: number;
    /** Days since it was sent; also drives created/responded dates. */
    age: number;
    seen?: boolean;
    note?: string;
    rejectReason?: string;
}

// user[0] (admon10001) is the admon most demos log in as. Every pair is a realistic situation:
//   0↔1 both pending · 0↔2 both accepted · 0→3 draft while 3→0 accepted · 4→0 and 7→0 waiting in the inbox
//   5→0 rejected by me · 0→5 cancelled by me · 0→6 one-way · 0↔7 mine accepted, theirs pending
const PLAN: PlanItem[] = [
    { from: 0, to: 1, status: 'pending', rows: 5, age: 2, seen: true, note: 'Los billetes van sellados.' },
    { from: 1, to: 0, status: 'pending', rows: 4, age: 3, seen: true },
    { from: 0, to: 2, status: 'accepted', rows: 6, age: 9 },
    { from: 2, to: 0, status: 'accepted', rows: 5, age: 8, note: 'Si te falta alguna serie, llámame.' },
    { from: 0, to: 3, status: 'draft', rows: 3, age: 1 },
    { from: 3, to: 0, status: 'accepted', rows: 4, age: 6 },
    { from: 4, to: 0, status: 'pending', rows: 3, age: 1, seen: false },
    { from: 7, to: 0, status: 'pending', rows: 6, age: 0, seen: false, note: '¿Puedes confirmar antes del viernes?' },
    { from: 5, to: 0, status: 'rejected', rows: 4, age: 12, rejectReason: 'Este año no cambiamos décimos sueltos.' },
    { from: 0, to: 5, status: 'cancelled', rows: 3, age: 12 },
    { from: 0, to: 6, status: 'pending', rows: 4, age: 4, seen: false },
    { from: 0, to: 7, status: 'accepted', rows: 5, age: 5 },
    // Activity between the other admons so the admin panel and stats have something to show.
    { from: 1, to: 2, status: 'accepted', rows: 4, age: 7 },
    { from: 2, to: 1, status: 'pending', rows: 3, age: 2, seen: true },
    { from: 3, to: 4, status: 'accepted', rows: 5, age: 10 },
    { from: 4, to: 3, status: 'accepted', rows: 5, age: 10 },
    { from: 5, to: 6, status: 'pending', rows: 2, age: 3, seen: false },
    { from: 6, to: 1, status: 'rejected', rows: 3, age: 15, rejectReason: 'Ya tenemos cerrado el cupo.' },
    { from: 8, to: 9, status: 'accepted', rows: 6, age: 11 },
    { from: 9, to: 8, status: 'accepted', rows: 6, age: 11 },
    { from: 8, to: 0, status: 'draft', rows: 2, age: 0 },
];

/**
 * Lottery lists and exchanges between the demo admons. Each admon owns a disjoint pool of numbers and only
 * ever gives numbers from its own pool, so no envelope carries a number its receiver already has and no
 * pair sends the same number both ways — the situation the client warns about (docs/03 §2).
 */
export async function seedDemoExchanges() {
    const campaign = await Campaign.findOne({ isActive: true });
    if (!campaign) {
        console.warn('[seed] no active campaign — skipping demo exchanges');
        return;
    }
    const users = await User.find({ receptorNumber: { $in: DEMO_ADMONS.map((a) => a.receptorNumber) } })
        .sort({ receptorNumber: 1 })
        .select('_id');
    if (users.length < DEMO_ADMONS.length) {
        console.warn('[seed] demo admons missing — skipping demo exchanges');
        return;
    }
    const ids = users.map((u) => u._id);

    await Exchange.deleteMany({ campaign: campaign._id, $or: [{ from: { $in: ids } }, { to: { $in: ids } }] });
    await LotteryNumber.deleteMany({ campaign: campaign._id, user: { $in: ids } });

    const pools = buildPools();
    await LotteryNumber.insertMany(
        pools.flatMap((pool, index) =>
            pool.map((owned) => ({
                user: ids[index],
                campaign: campaign._id,
                numero: owned.numero,
                series: owned.series,
                source: 'import' as const,
            })),
        ),
    );

    const created = new Map<string, string>();
    for (const item of PLAN) {
        const answered = item.status === 'accepted' || item.status === 'rejected';
        const sent = item.status !== 'draft';
        const doc = await Exchange.create({
            campaign: campaign._id,
            from: ids[item.from],
            to: ids[item.to],
            status: item.status,
            rows: rowsFrom(pools[item.from], item.rows),
            note: item.note,
            sentAt: sent ? daysAgo(item.age) : undefined,
            seenByReceiverAt: answered || item.seen ? daysAgo(item.age, 17) : undefined,
            respondedAt: answered ? daysAgo(Math.max(0, item.age - 1), 12) : undefined,
            rejectReason: item.rejectReason,
        });
        created.set(`${item.from}-${item.to}`, doc._id.toString());
    }
    // Link counterparts both ways.
    for (const [key, id] of created) {
        const [from, to] = key.split('-');
        const reverse = created.get(`${to}-${from}`);
        if (reverse) await Exchange.updateOne({ _id: id }, { $set: { counterpart: reverse } });
    }

    console.log(`[seed] ${PLAN.length} demo exchanges + ${pools.length * NUMBERS_PER_ADMON} lottery numbers ready`);
}
