import type { AnyBulkWriteOperation, Types } from 'mongoose';
import {
    LIMITS,
    mergeSeries,
    normalizeSeries,
    seriesContains,
    type LotteryCheckResult,
    type LotteryImportInput,
    type LotteryImportResult,
    type LotteryNumberDto,
    type LotteryNumberInput,
    type SerieRange,
} from '@anapal/shared';
import { LotteryNumber, type LotteryNumberDocument } from '@/api/models/lotteryNumber';
import { AppError } from '@/utils/AppError';

interface Scope {
    user: string | Types.ObjectId;
    campaign: Types.ObjectId;
}

export async function list(scope: Scope): Promise<LotteryNumberDto[]> {
    const items = await LotteryNumber.find(scope).sort({ numero: 1 });
    return items.map(toDto);
}

export async function count(scope: Scope): Promise<number> {
    return LotteryNumber.countDocuments(scope);
}

/**
 * Upserts a batch, merging `series` into whatever the user already had for each número.
 * With `replace: true` the campaign list is wiped first (used by "reemplazar lista" on import).
 */
export async function importRows(scope: Scope, input: LotteryImportInput): Promise<LotteryImportResult> {
    if (input.replace) await LotteryNumber.deleteMany(scope);

    const numeros = input.rows.map((r) => r.numero);
    const existing = await LotteryNumber.find({ ...scope, numero: { $in: numeros } })
        .select('numero series')
        .lean();
    const existingByNumero = new Map(existing.map((doc) => [doc.numero, doc]));

    const total = await LotteryNumber.countDocuments(scope);
    const newOnes = input.rows.filter((r) => !existingByNumero.has(r.numero)).length;
    if (total + newOnes > LIMITS.lotteryNumbersPerUser) {
        throw new AppError(400, 'lottery.limit_reached', `Max ${LIMITS.lotteryNumbersPerUser} numbers per campaign`);
    }

    const operations: AnyBulkWriteOperation[] = input.rows.map((row) => {
        const current = existingByNumero.get(row.numero);
        const series = current ? mergeSeries(current.series, row.series ?? []) : normalizeSeries(row.series ?? []);
        return {
            updateOne: {
                filter: { ...scope, numero: row.numero },
                update: { $set: { series, source: 'import' as const }, $setOnInsert: { ...scope, numero: row.numero } },
                upsert: true,
            },
        };
    });

    const result = await LotteryNumber.bulkWrite(operations, { ordered: false });
    return {
        inserted: result.upsertedCount,
        updated: result.modifiedCount,
        total: await LotteryNumber.countDocuments(scope),
    };
}

export async function addOne(scope: Scope, input: LotteryNumberInput): Promise<LotteryNumberDto> {
    const existing = await LotteryNumber.findOne({ ...scope, numero: input.numero }).lean();
    const series = existing ? mergeSeries(existing.series, input.series ?? []) : normalizeSeries(input.series ?? []);

    if (!existing && (await LotteryNumber.countDocuments(scope)) >= LIMITS.lotteryNumbersPerUser) {
        throw new AppError(400, 'lottery.limit_reached', `Max ${LIMITS.lotteryNumbersPerUser} numbers per campaign`);
    }

    const doc = await LotteryNumber.findOneAndUpdate(
        { ...scope, numero: input.numero },
        { $set: { series }, $setOnInsert: { ...scope, numero: input.numero, source: 'manual' as const } },
        { upsert: true, new: true, runValidators: true },
    );
    return toDto(doc);
}

export async function remove(scope: Scope, id: string): Promise<void> {
    const result = await LotteryNumber.deleteOne({ ...scope, _id: id });
    if (result.deletedCount === 0) throw new AppError(404, 'lottery.not_found', 'Lottery number not found');
}

export async function clear(scope: Scope): Promise<number> {
    const result = await LotteryNumber.deleteMany(scope);
    return result.deletedCount;
}

export async function check(scope: Scope, numero: string): Promise<LotteryCheckResult> {
    const doc = await LotteryNumber.findOne({ ...scope, numero }).select('series');
    return { owned: !!doc, series: doc ? doc.series.map(toRange) : [] };
}

const toRange = (r: { from: number; to: number }): SerieRange => ({ from: r.from, to: r.to });

function toDto(doc: LotteryNumberDocument): LotteryNumberDto {
    return {
        _id: doc._id.toString(),
        numero: doc.numero,
        series: doc.series.map(toRange),
        source: doc.source,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

export { seriesContains };
