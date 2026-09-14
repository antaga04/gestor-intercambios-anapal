export const ROLES = ['user', 'admin', 'superadmin'] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUS = ['pending', 'active', 'blocked'] as const;
export type UserStatus = (typeof USER_STATUS)[number];

export const EXCHANGE_STATUS = ['draft', 'pending', 'accepted', 'rejected', 'cancelled'] as const;
export type ExchangeStatus = (typeof EXCHANGE_STATUS)[number];

/** Statuses that count as "live" when computing the direction of a pair. */
export const LIVE_EXCHANGE_STATUS: readonly ExchangeStatus[] = ['draft', 'pending', 'accepted'];

export const ROW_TYPES = ['billete', 'decimo', 'decimos'] as const;
export type RowType = (typeof ROW_TYPES)[number];

export const LOTTERY_SOURCE = ['import', 'manual'] as const;
export type LotterySource = (typeof LOTTERY_SOURCE)[number];

export const DECIMOS_PER_BILLETE = 10;

export const LIMITS = {
    numeroLength: 5,
    serieMin: 1,
    serieMax: 192,
    fraccionMin: 1,
    fraccionMax: 10,
    /** Max billetes of one número: one per serie. */
    billetesMax: 192,
    /** Max décimos of one número in a "decimos" row: everything except a full set would be 1920, keep a sane cap. */
    decimosMax: 1919,
    rowsPerExchange: 500,
    lotteryNumbersPerUser: 5000,
    lotteryImportChunk: 1000,
    noteMax: 1000,
    rowNoteMax: 200,
    rejectReasonMax: 500,
    passwordMin: 8,
    passwordMax: 72,
    adminTempPasswordMin: 10,
    pageSizeDefault: 20,
    pageSizeMax: 100,
} as const;

export const PROVINCIAS = [
    'Álava',
    'Albacete',
    'Alicante',
    'Almería',
    'Asturias',
    'Ávila',
    'Badajoz',
    'Barcelona',
    'Burgos',
    'Cáceres',
    'Cádiz',
    'Cantabria',
    'Castellón',
    'Ceuta',
    'Ciudad Real',
    'Córdoba',
    'Cuenca',
    'Girona',
    'Granada',
    'Guadalajara',
    'Gipuzkoa',
    'Huelva',
    'Huesca',
    'Illes Balears',
    'Jaén',
    'A Coruña',
    'La Rioja',
    'Las Palmas',
    'León',
    'Lleida',
    'Lugo',
    'Madrid',
    'Málaga',
    'Melilla',
    'Murcia',
    'Navarra',
    'Ourense',
    'Palencia',
    'Pontevedra',
    'Salamanca',
    'Santa Cruz de Tenerife',
    'Segovia',
    'Sevilla',
    'Soria',
    'Tarragona',
    'Teruel',
    'Toledo',
    'Valencia',
    'Valladolid',
    'Bizkaia',
    'Zamora',
    'Zaragoza',
] as const;
