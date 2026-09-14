/**
 * Spanish text for every `i18n` code returned by the API.
 * Codes are added as endpoints are implemented; `resolveMessage` falls back to a generic string.
 */
export const MESSAGES_ES = {
    'server.error': 'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
    'server.not_found_route': 'Ruta no encontrada.',
    'server.ok': 'OK',
    'validation.failed': 'Revisa los datos introducidos.',
    'validation.invalid_id': 'Identificador no válido.',
    'rate.limited': 'Demasiadas peticiones. Espera un momento e inténtalo de nuevo.',
    'db.duplicate': 'Ya existe un registro con esos datos.',
} as const satisfies Record<string, string>;

export type ApiCode = keyof typeof MESSAGES_ES;

const FALLBACK = 'Ha ocurrido un error.';

export function resolveMessage(code: string | undefined | null, fallback: string = FALLBACK): string {
    if (!code) return fallback;
    return (MESSAGES_ES as Record<string, string>)[code] ?? fallback;
}
