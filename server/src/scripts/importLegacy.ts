/**
 * Imports the data of the previous app (Supabase, `intercambio-anapal`) into the current model.
 *
 *   pnpm import-legacy -- <path/to/db_cluster.backup[.gz]> [--dry-run]
 *
 * What it does (docs/02 "Migración"):
 *   1. `auth.users` + `profiles` + `remitente` → `users`. bcrypt hashes are kept, so people log in with the
 *      same password. Accounts without a `remitente` get placeholder profile data and a 6-digit receptor number.
 *   2. Every `intercambios` record (with its `operaciones`) → `legacyexchanges`, verbatim, read-only history.
 *   3. When the counterpart's receptor number belongs to an imported user, an `exchanges` document is built
 *      per direction. The giver's own record ("Entrego" lines) wins; the receiver's "Recibo" lines are only used
 *      when the giver has no record. Lines without a valid número cannot become rows and stay in the history.
 *
 * Idempotent: users are matched by legacy id / email, history by legacy id, exchanges by (campaign, from, to).
 * Re-running never overwrites what is already there. `--dry-run` prints the report without writing anything.
 */
import mongoose, { Types } from 'mongoose';
import { LIMITS, legacyLinesToRows, type ExchangeStatus, type LegacyLineInput } from '@anapal/shared';
import { connectToDatabase } from '@/config/db';
import { Campaign } from '@/api/models/campaign';
import { Exchange } from '@/api/models/exchange';
import { LegacyExchange } from '@/api/models/legacyExchange';
import { User } from '@/api/models/user';
import {
    parseDump,
    pgDate,
    type OldDatabase,
    type OldIntercambio,
    type OldOperacion,
} from '@/scripts/legacy/parseDump';

const PLACEHOLDER = { name: 'Administración (completar datos)', poblacion: 'Pendiente', provincia: 'Pendiente' };
/** 6-digit numbers never collide with the real 5-digit receptor numbers. */
const PLACEHOLDER_RECEPTOR_START = 900001;

type Source = 'primary' | 'secondary';

/** 'En edición' was the default state of the old app, so it only means "not marked as done". */
function statusFor(estado: OldIntercambio['estado'], source: Source): ExchangeStatus {
    if (estado !== 'En edición') return 'accepted';
    // The giver's unfinished record stays private; the receiver's own record is something they already know about.
    return source === 'primary' ? 'draft' : 'pending';
}

const normalizeReceptor = (value: string | null | undefined) => (value ?? '').trim().replace(/^0+(?=\d)/, '');
const clean = (value: string | null | undefined, max: number) => (value ?? '').trim().slice(0, max);
const orPlaceholder = (value: string, fallback: string) => (value.length >= 2 ? value : fallback);

interface Report {
    dryRun: boolean;
    users: {
        created: number;
        existing: number;
        placeholderProfile: string[];
        placeholderReceptor: string[];
        skipped: string[];
    };
    legacy: { created: number; existing: number; unmatchedCounterparts: number; selfReferences: number };
    exchanges: {
        created: number;
        existing: number;
        fromReceiverRecord: number;
        emptyPairs: number;
        skippedLines: Record<string, number>;
        byStatus: Record<string, number>;
    };
}

function toLine(op: OldOperacion): LegacyLineInput {
    const int = (v: string | null) => (v && /^\d+$/.test(v.trim()) ? Number(v.trim()) : null);
    return {
        id: op.id,
        numero: op.numero,
        serie: int(op.serie),
        fraccion: int(op.fraccion),
        billetes: Number(op.cantidad),
        sellado: op.sellado,
        modo: op.modo,
    };
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const path = args.find((a) => !a.startsWith('--'));
    if (!path) throw new Error('Usage: pnpm import-legacy -- <dump.backup[.gz]> [--dry-run]');

    const db = parseDump(path);
    console.log(
        `[import] dump: ${db.users.length} users, ${db.remitentes.length} remitentes, ${db.intercambios.length} intercambios, ${db.operaciones.length} operaciones`,
    );

    await connectToDatabase();
    const campaign = await Campaign.findOne({ isActive: true });
    if (!campaign) throw new Error('No active campaign — run `pnpm seed` first');
    console.log(`[import] campaign: ${campaign.name}${dryRun ? ' (dry run, nothing will be written)' : ''}`);

    const report: Report = {
        dryRun,
        users: { created: 0, existing: 0, placeholderProfile: [], placeholderReceptor: [], skipped: [] },
        legacy: { created: 0, existing: 0, unmatchedCounterparts: 0, selfReferences: 0 },
        exchanges: { created: 0, existing: 0, fromReceiverRecord: 0, emptyPairs: 0, skippedLines: {}, byStatus: {} },
    };

    const userIds = await importUsers(db, report, dryRun);
    const receptorOwners = resolveReceptorOwners(db, userIds);
    await importHistory(db, campaign._id, userIds, receptorOwners, report, dryRun);
    await importExchanges(db, campaign._id, userIds, receptorOwners, report, dryRun);

    printReport(report);
}

/** Old `auth.users.id` → current `users._id`. Existing accounts (same email or legacy id) are reused, never changed. */
async function importUsers(db: OldDatabase, report: Report, dryRun: boolean): Promise<Map<string, Types.ObjectId>> {
    const ids = new Map<string, Types.ObjectId>();
    const profiles = new Map(db.profiles.map((p) => [p.id, p]));
    const remitentes = new Map(db.remitentes.map((r) => [r.user_id, r]));

    // Two old accounts may claim the same receptor number: the most recently updated remitente keeps it.
    const receptorWinner = new Map<string, string>();
    for (const r of [...db.remitentes].sort((a, b) => a.updated_at.localeCompare(b.updated_at))) {
        if (r.receptor) receptorWinner.set(normalizeReceptor(r.receptor), r.user_id);
    }

    const existing = await User.find({
        $or: [
            { email: { $in: db.users.map((u) => u.email.trim().toLowerCase()) } },
            { legacyId: { $in: db.users.map((u) => u.id) } },
        ],
    }).select('email legacyId receptorNumber');
    const byEmail = new Map(existing.map((u) => [u.email, u]));
    const byLegacyId = new Map(existing.filter((u) => u.legacyId).map((u) => [u.legacyId!, u]));
    const takenReceptors = new Set(
        (await User.find({}).select('receptorNumber')).map((u) => normalizeReceptor(u.receptorNumber)),
    );
    const seenEmails = new Set<string>();
    let nextPlaceholder = PLACEHOLDER_RECEPTOR_START;
    const placeholderReceptor = () => {
        while (takenReceptors.has(String(nextPlaceholder))) nextPlaceholder++;
        const value = String(nextPlaceholder++);
        takenReceptors.add(value);
        return value;
    };

    for (const old of [...db.users].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
        const email = old.email.trim().toLowerCase();
        const found = byLegacyId.get(old.id) ?? byEmail.get(email);
        if (found) {
            ids.set(old.id, found._id);
            report.users.existing++;
            continue;
        }
        if (seenEmails.has(email) || old.deleted_at || !old.encrypted_password) {
            report.users.skipped.push(
                `${email} (${old.deleted_at ? 'deleted' : !old.encrypted_password ? 'no password' : 'duplicate email'})`,
            );
            continue;
        }
        seenEmails.add(email);

        const remitente = remitentes.get(old.id);
        const receptor = normalizeReceptor(remitente?.receptor);
        let receptorNumber: string;
        if (!remitente) {
            receptorNumber = placeholderReceptor();
            report.users.placeholderProfile.push(email);
        } else if (!receptor || receptorWinner.get(receptor) !== old.id || takenReceptors.has(receptor)) {
            receptorNumber = placeholderReceptor();
            report.users.placeholderReceptor.push(`${email} (wanted ${remitente.receptor})`);
        } else {
            receptorNumber = remitente.receptor!.trim();
            takenReceptors.add(receptor);
        }

        const _id = new Types.ObjectId();
        const user = new User({
            _id,
            email,
            passwordHash: old.encrypted_password,
            role: profiles.get(old.id)?.role === 'admin' ? 'admin' : 'user',
            status: old.banned_until ? 'blocked' : 'active',
            receptorNumber,
            name: orPlaceholder(clean(remitente?.nombre, 80), PLACEHOLDER.name),
            poblacion: orPlaceholder(clean(remitente?.ciudad, 80), PLACEHOLDER.poblacion),
            provincia: orPlaceholder(clean(remitente?.provincia, 60), PLACEHOLDER.provincia),
            mustChangePassword: false,
            lastLoginAt: old.last_sign_in_at ? pgDate(old.last_sign_in_at) : undefined,
            legacyId: old.id,
            createdAt: pgDate(old.created_at),
            updatedAt: pgDate(old.updated_at),
        });
        if (!dryRun) await user.save({ timestamps: false });
        ids.set(old.id, _id);
        report.users.created++;
    }
    return ids;
}

/** Receptor number (normalised) → old user id, only for accounts that were actually imported/mapped. */
function resolveReceptorOwners(db: OldDatabase, userIds: Map<string, Types.ObjectId>): Map<string, string> {
    const owners = new Map<string, string>();
    for (const r of [...db.remitentes].sort((a, b) => a.updated_at.localeCompare(b.updated_at))) {
        const key = normalizeReceptor(r.receptor);
        if (key && userIds.has(r.user_id)) owners.set(key, r.user_id);
    }
    return owners;
}

function linesOf(db: OldDatabase): Map<string, OldOperacion[]> {
    const map = new Map<string, OldOperacion[]>();
    for (const op of [...db.operaciones].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
        const list = map.get(op.intercambio_id);
        if (list) list.push(op);
        else map.set(op.intercambio_id, [op]);
    }
    return map;
}

async function importHistory(
    db: OldDatabase,
    campaign: Types.ObjectId,
    userIds: Map<string, Types.ObjectId>,
    receptorOwners: Map<string, string>,
    report: Report,
    dryRun: boolean,
) {
    const lines = linesOf(db);
    const existing = new Set((await LegacyExchange.find({}).select('legacyId')).map((d) => d.legacyId));

    for (const old of db.intercambios) {
        const user = userIds.get(old.user_id);
        if (!user) continue; // owner was skipped
        const counterpartOld = receptorOwners.get(normalizeReceptor(old.receptor));
        if (!counterpartOld) report.legacy.unmatchedCounterparts++;
        else if (counterpartOld === old.user_id) report.legacy.selfReferences++;
        if (existing.has(old.id)) {
            report.legacy.existing++;
            continue;
        }
        const doc = new LegacyExchange({
            legacyId: old.id,
            user,
            campaign,
            counterpart: {
                name: clean(old.administracion, 120) || '—',
                receptorNumber: (old.receptor ?? '').trim() || '—',
                poblacion: clean(old.ciudad, 80) || undefined,
                provincia: clean(old.provincia, 60) || undefined,
                user: counterpartOld && counterpartOld !== old.user_id ? userIds.get(counterpartOld) : undefined,
            },
            estado: old.estado,
            observaciones: clean(old.observaciones, 2000) || undefined,
            fecha: new Date(`${old.fecha}T12:00:00Z`),
            envelope: { delivered: old.sobre_entregado, received: old.sobre_recibido, checked: old.recepcionado },
            lines: (lines.get(old.id) ?? []).map((op) => {
                const line = toLine(op);
                return {
                    legacyId: op.id,
                    tipo: op.tipo,
                    numero: (op.numero ?? '').trim() || undefined,
                    serie: line.serie ?? undefined,
                    fraccion: line.fraccion ?? undefined,
                    billetes: line.billetes,
                    sellado: op.sellado,
                    modo: op.modo,
                    migrated: false,
                };
            }),
            createdAt: pgDate(old.created_at),
            updatedAt: pgDate(old.updated_at),
        });
        if (!dryRun) await doc.save({ timestamps: false });
        report.legacy.created++;
    }
}

interface Pair {
    giver: string;
    receiver: string;
    /** The giver's own record about the receiver. */
    primary?: OldIntercambio;
    /** The receiver's record about the giver. */
    secondary?: OldIntercambio;
}

async function importExchanges(
    db: OldDatabase,
    campaign: Types.ObjectId,
    userIds: Map<string, Types.ObjectId>,
    receptorOwners: Map<string, string>,
    report: Report,
    dryRun: boolean,
) {
    const lines = linesOf(db);
    const pairs = new Map<string, Pair>();
    const pairOf = (giver: string, receiver: string) => {
        const key = `${giver}->${receiver}`;
        let pair = pairs.get(key);
        if (!pair) pairs.set(key, (pair = { giver, receiver }));
        return pair;
    };
    for (const old of db.intercambios) {
        const counterpart = receptorOwners.get(normalizeReceptor(old.receptor));
        if (!counterpart || counterpart === old.user_id || !userIds.has(old.user_id)) continue;
        pairOf(old.user_id, counterpart).primary = old;
        pairOf(counterpart, old.user_id).secondary = old;
    }

    const created = new Map<string, Types.ObjectId>(); // "giver->receiver" → exchange id
    const migratedLines = new Set<string>();
    const legacyLinks: { legacyId: string; field: 'out' | 'in'; exchange: Types.ObjectId }[] = [];

    for (const pair of pairs.values()) {
        const from = userIds.get(pair.giver)!;
        const to = userIds.get(pair.receiver)!;

        const candidates: { source: Source; record: OldIntercambio; tipo: OldOperacion['tipo'] }[] = [];
        if (pair.primary) candidates.push({ source: 'primary', record: pair.primary, tipo: 'Entrego' });
        if (pair.secondary) candidates.push({ source: 'secondary', record: pair.secondary, tipo: 'Recibo' });

        const countSkipped = (conversion: ReturnType<typeof legacyLinesToRows>) => {
            for (const skipped of conversion.skipped) {
                report.exchanges.skippedLines[skipped.reason] =
                    (report.exchanges.skippedLines[skipped.reason] ?? 0) + 1;
            }
        };
        const conversions = candidates.map((candidate) => {
            const own = (lines.get(candidate.record.id) ?? []).filter((op) => op.tipo === candidate.tipo);
            return { ...candidate, conversion: legacyLinesToRows(own.map(toLine)) };
        });
        const chosen = conversions.find((c) => c.conversion.rows.length > 0);
        if (!chosen) {
            // Nothing usable on either side (typically "Recibo: 5 billetes" with no número): history only.
            conversions.forEach((c) => countSkipped(c.conversion));
            report.exchanges.emptyPairs++;
            continue;
        }
        countSkipped(chosen.conversion);

        const existing = await Exchange.findOne({ campaign, from, to }).select('_id');
        if (existing) {
            report.exchanges.existing++;
            created.set(`${pair.giver}->${pair.receiver}`, existing._id);
            continue;
        }

        const { record, source, conversion } = chosen;
        const status = statusFor(record.estado, source);
        const createdAt = pgDate(record.created_at);
        const updatedAt = pgDate(record.updated_at);
        const exchange = new Exchange({
            campaign,
            from,
            to,
            status,
            rows: conversion.rows.slice(0, LIMITS.rowsPerExchange).map((r) => r.row),
            sentAt: status === 'draft' ? undefined : createdAt,
            respondedAt: status === 'accepted' ? updatedAt : undefined,
            // Accepted ones and the receiver's own records are nothing new to the receiver.
            seenByReceiverAt: status === 'accepted' || source === 'secondary' ? updatedAt : undefined,
            legacy: { id: record.id, skippedLines: conversion.skipped.length },
            createdAt,
            updatedAt,
        });
        if (!dryRun) await exchange.save({ timestamps: false });

        created.set(`${pair.giver}->${pair.receiver}`, exchange._id);
        for (const row of conversion.rows) for (const id of row.lineIds) migratedLines.add(id);
        report.exchanges.byStatus[status] = (report.exchanges.byStatus[status] ?? 0) + 1;
        if (source === 'secondary') report.exchanges.fromReceiverRecord++;
        report.exchanges.created++;

        if (pair.primary) legacyLinks.push({ legacyId: pair.primary.id, field: 'out', exchange: exchange._id });
        if (pair.secondary) legacyLinks.push({ legacyId: pair.secondary.id, field: 'in', exchange: exchange._id });
    }

    if (dryRun) return;

    // Link both directions of a pair.
    for (const [key, id] of created) {
        const [giver, receiver] = key.split('->');
        const reverse = created.get(`${receiver}->${giver}`);
        if (reverse) await Exchange.updateOne({ _id: id, counterpart: null }, { $set: { counterpart: reverse } });
    }

    // Point the history at the exchanges built from it and flag the lines that became rows.
    for (const link of legacyLinks) {
        await LegacyExchange.updateOne(
            { legacyId: link.legacyId },
            { $set: { [`migrated.${link.field}`]: link.exchange } },
        );
    }
    if (migratedLines.size) {
        await LegacyExchange.updateMany(
            { 'lines.legacyId': { $in: [...migratedLines] } },
            { $set: { 'lines.$[line].migrated': true } },
            { arrayFilters: [{ 'line.legacyId': { $in: [...migratedLines] } }] },
        );
    }
}

function printReport(report: Report) {
    const { users, legacy, exchanges } = report;
    const list = (items: string[]) => (items.length ? `\n      - ${items.join('\n      - ')}` : ' none');
    console.log(`
[import] ${report.dryRun ? 'DRY RUN — ' : ''}report
  users:      created ${users.created}, already existed ${users.existing}, skipped ${users.skipped.length}
    without remitente (placeholder profile + receptor, fix in Admin › Usuarios):${list(users.placeholderProfile)}
    receptor number taken by another account (placeholder receptor):${list(users.placeholderReceptor)}
    skipped:${list(users.skipped)}
  history:    created ${legacy.created}, already existed ${legacy.existing}
    counterpart not registered: ${legacy.unmatchedCounterparts}, pointing to self: ${legacy.selfReferences}
  exchanges:  created ${exchanges.created} (${exchanges.fromReceiverRecord} from the receiver's record), already existed ${exchanges.existing}, pairs without convertible lines ${exchanges.emptyPairs}
    by status: ${JSON.stringify(exchanges.byStatus)}
    lines kept only in history: ${JSON.stringify(exchanges.skippedLines, null, 2).replace(/\n/g, '\n    ')}
`);
}

main()
    .then(() => mongoose.disconnect())
    .then(() => {
        console.log('[import] done');
        process.exit(0);
    })
    .catch((err) => {
        console.error('[import] failed:', err);
        process.exit(1);
    });
