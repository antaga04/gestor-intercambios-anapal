import { Types } from 'mongoose';
import { DECIMOS_PER_BILLETE, type LegacyExchange as LegacyExchangeDto } from '@anapal/shared';
import { LegacyExchange, type LegacyExchangeDocument } from '@/api/models/legacyExchange';

const toDecimos = (billetes: number) => Math.round(billetes * DECIMOS_PER_BILLETE);

export function toLegacyExchangeDto(doc: LegacyExchangeDocument): LegacyExchangeDto {
    let decimosOut = 0;
    let decimosIn = 0;
    for (const line of doc.lines) {
        if (line.tipo === 'Entrego') decimosOut += toDecimos(line.billetes);
        else decimosIn += toDecimos(line.billetes);
    }
    const counterpart = doc.counterpart!;
    return {
        _id: doc._id.toString(),
        counterpart: {
            name: counterpart.name,
            receptorNumber: counterpart.receptorNumber,
            poblacion: counterpart.poblacion ?? undefined,
            provincia: counterpart.provincia ?? undefined,
            userId: counterpart.user?.toString(),
        },
        estado: doc.estado,
        observaciones: doc.observaciones ?? undefined,
        fecha: doc.fecha.toISOString(),
        envelope: {
            delivered: doc.envelope?.delivered ?? false,
            received: doc.envelope?.received ?? false,
            checked: doc.envelope?.checked ?? false,
        },
        lines: doc.lines.map((line) => ({
            tipo: line.tipo,
            numero: line.numero ?? undefined,
            serie: line.serie ?? undefined,
            fraccion: line.fraccion ?? undefined,
            billetes: line.billetes,
            sellado: line.sellado,
            modo: line.modo,
            migrated: line.migrated,
        })),
        decimosOut,
        decimosIn,
        migrated: { out: doc.migrated?.out?.toString(), in: doc.migrated?.in?.toString() },
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

/** Everything the previous app stored for this user, newest first. Small per user (≤ ~60), no paging. */
export async function listForUser(userId: string): Promise<LegacyExchangeDto[]> {
    const docs = await LegacyExchange.find({ user: new Types.ObjectId(userId) }).sort({ fecha: -1, createdAt: -1 });
    return docs.map(toLegacyExchangeDto);
}

export function countForUser(userId: Types.ObjectId): Promise<number> {
    return LegacyExchange.countDocuments({ user: userId });
}
