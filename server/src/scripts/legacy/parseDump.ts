import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

/**
 * Minimal reader for the `COPY <table> (cols) FROM stdin;` blocks of a `pg_dumpall` text dump
 * (what Supabase's "Backups" download is). Only the tables the import needs are kept.
 */

export interface OldAuthUser {
    id: string;
    email: string;
    encrypted_password: string | null;
    email_confirmed_at: string | null;
    last_sign_in_at: string | null;
    created_at: string;
    updated_at: string;
    banned_until: string | null;
    deleted_at: string | null;
}

export interface OldProfile {
    id: string;
    role: 'user' | 'admin';
    excluido: boolean;
}

export interface OldRemitente {
    id: string;
    user_id: string;
    nombre: string | null;
    receptor: string | null;
    ciudad: string | null;
    provincia: string | null;
    updated_at: string;
}

export interface OldIntercambio {
    id: string;
    user_id: string;
    administracion: string;
    receptor: string | null;
    ciudad: string | null;
    provincia: string | null;
    estado: 'En edición' | 'Pendiente de ensobrado' | 'Ensobrado';
    observaciones: string | null;
    fecha: string;
    sobre_entregado: boolean;
    sobre_recibido: boolean;
    recepcionado: boolean;
    created_at: string;
    updated_at: string;
}

export interface OldOperacion {
    id: string;
    intercambio_id: string;
    user_id: string;
    tipo: 'Entrego' | 'Recibo';
    numero: string | null;
    serie: string | null;
    fraccion: string | null;
    cantidad: string;
    created_at: string;
    sellado: boolean;
    modo: 'billete' | 'decimo' | 'decimos';
}

export interface OldDatabase {
    users: OldAuthUser[];
    profiles: OldProfile[];
    remitentes: OldRemitente[];
    intercambios: OldIntercambio[];
    operaciones: OldOperacion[];
}

type Raw = Record<string, string | null>;

const TABLES = {
    'auth.users': 'users',
    'public.profiles': 'profiles',
    'public.remitente': 'remitentes',
    'public.intercambios': 'intercambios',
    'public.operaciones': 'operaciones',
} as const;

function unescapeCopy(value: string): string | null {
    if (value === '\\N') return null;
    return value.replace(
        /\\(.)/g,
        (_, c: string) => ({ t: '\t', n: '\n', r: '\r', b: '\b', f: '\f', v: '\v' })[c] ?? c,
    );
}

function readCopyBlocks(text: string): Map<string, Raw[]> {
    const lines = text.split('\n');
    const blocks = new Map<string, Raw[]>();
    for (let i = 0; i < lines.length; i++) {
        const match = /^COPY (\S+) \((.*)\) FROM stdin;$/.exec(lines[i]);
        if (!match) continue;
        const columns = match[2].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const rows: Raw[] = [];
        for (i++; i < lines.length && lines[i] !== '\\.'; i++) {
            const values = lines[i].split('\t').map(unescapeCopy);
            rows.push(Object.fromEntries(columns.map((column, index) => [column, values[index] ?? null])));
        }
        blocks.set(match[1], rows);
    }
    return blocks;
}

const bool = (v: string | null) => v === 't';

export function parseDump(path: string): OldDatabase {
    const buffer = readFileSync(path);
    const text = (path.endsWith('.gz') ? gunzipSync(buffer) : buffer).toString('utf8');
    const blocks = readCopyBlocks(text);
    const missing = Object.keys(TABLES).filter((t) => !blocks.has(t));
    if (missing.length) throw new Error(`Dump is missing tables: ${missing.join(', ')}`);

    const rows = (table: keyof typeof TABLES) => blocks.get(table) as Raw[];
    return {
        users: rows('auth.users').map((r) => ({
            id: r.id!,
            email: r.email!,
            encrypted_password: r.encrypted_password,
            email_confirmed_at: r.email_confirmed_at,
            last_sign_in_at: r.last_sign_in_at,
            created_at: r.created_at!,
            updated_at: r.updated_at!,
            banned_until: r.banned_until,
            deleted_at: r.deleted_at,
        })),
        profiles: rows('public.profiles').map((r) => ({
            id: r.id!,
            role: r.role === 'admin' ? 'admin' : 'user',
            excluido: bool(r.excluido),
        })),
        remitentes: rows('public.remitente').map((r) => ({
            id: r.id!,
            user_id: r.user_id!,
            nombre: r.nombre,
            receptor: r.receptor,
            ciudad: r.ciudad,
            provincia: r.provincia,
            updated_at: r.updated_at!,
        })),
        intercambios: rows('public.intercambios').map((r) => ({
            id: r.id!,
            user_id: r.user_id!,
            administracion: r.administracion ?? '',
            receptor: r.receptor,
            ciudad: r.ciudad,
            provincia: r.provincia,
            estado: r.estado as OldIntercambio['estado'],
            observaciones: r.observaciones,
            fecha: r.fecha!,
            sobre_entregado: bool(r.sobre_entregado),
            sobre_recibido: bool(r.sobre_recibido),
            recepcionado: bool(r.recepcionado),
            created_at: r.created_at!,
            updated_at: r.updated_at!,
        })),
        operaciones: rows('public.operaciones').map((r) => ({
            id: r.id!,
            intercambio_id: r.intercambio_id!,
            user_id: r.user_id!,
            tipo: r.tipo as OldOperacion['tipo'],
            numero: r.numero,
            serie: r.serie,
            fraccion: r.fraccion,
            cantidad: r.cantidad ?? '0',
            created_at: r.created_at!,
            sellado: bool(r.sellado),
            modo: (r.modo ?? 'billete') as OldOperacion['modo'],
        })),
    };
}

/** "2026-07-17 19:04:14.293001+00" → Date. Postgres keeps microseconds; JS only needs milliseconds. */
export function pgDate(value: string): Date {
    const iso = value
        .replace(' ', 'T')
        .replace(/(\.\d{3})\d+/, '$1')
        .replace(/\+00$/, 'Z');
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) throw new Error(`Cannot parse date "${value}"`);
    return date;
}
