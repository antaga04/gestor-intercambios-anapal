import type { RowType } from '../constants';

/** Estados of the previous app (Supabase), kept verbatim. */
export const LEGACY_ESTADOS = ['En edición', 'Pendiente de ensobrado', 'Ensobrado'] as const;
export type LegacyEstado = (typeof LEGACY_ESTADOS)[number];

export const LEGACY_LINE_TIPOS = ['Entrego', 'Recibo'] as const;
export type LegacyLineTipo = (typeof LEGACY_LINE_TIPOS)[number];

/** One `operaciones` row of the previous app. `billetes` may be fractional (0,1 = one décimo). */
export interface LegacyLine {
    tipo: LegacyLineTipo;
    /** Raw text the user typed: a 5-digit número, free text such as "SALP", or nothing. */
    numero?: string;
    serie?: number;
    fraccion?: number;
    billetes: number;
    sellado: boolean;
    modo: RowType;
    /** Set when the line became a row of a migrated exchange. */
    migrated: boolean;
}

/**
 * One `intercambios` record of the previous app: the relationship of `user` with a counterpart typed by hand.
 * Read-only history shown under "Histórico"; what could be converted also lives in `exchanges`.
 */
export interface LegacyExchange {
    _id: string;
    counterpart: {
        name: string;
        receptorNumber: string;
        poblacion?: string;
        provincia?: string;
        /** The registered admon with that receptor number, when there is one. */
        userId?: string;
    };
    estado: LegacyEstado;
    observaciones?: string;
    fecha: string;
    /** Physical envelope checks of the previous app (sobre entregado / recibido / recepcionado). */
    envelope: { delivered: boolean; received: boolean; checked: boolean };
    lines: LegacyLine[];
    /** Décimos summed from the lines, by direction. */
    decimosOut: number;
    decimosIn: number;
    /** Exchanges of the current model built from this record: what I give / what I receive. */
    migrated: { out?: string; in?: string };
    createdAt: string;
    updatedAt: string;
}
