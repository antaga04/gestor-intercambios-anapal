/**
 * Spanish text for every `i18n` code returned by the API.
 * Codes are added as endpoints are implemented; `resolveMessage` falls back to a generic string.
 */
export const MESSAGES_ES = {
    // server / infra
    'server.error': 'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
    'server.not_found_route': 'Ruta no encontrada.',
    'server.ok': 'OK',
    'validation.failed': 'Revisa los datos introducidos.',
    'validation.invalid_id': 'Identificador no válido.',
    'rate.limited': 'Demasiadas peticiones. Espera un momento e inténtalo de nuevo.',
    'db.duplicate': 'Ya existe un registro con esos datos.',

    // auth
    'auth.not_authenticated': 'Tienes que iniciar sesión.',
    'auth.forbidden': 'No tienes permisos para hacer esto.',
    'auth.invalid_credentials': 'Email o contraseña incorrectos.',
    'auth.email_not_verified': 'Tu cuenta aún no está verificada. Revisa tu correo.',
    'auth.blocked': 'Tu cuenta está bloqueada. Contacta con ANAPAL.',
    'auth.email_taken': 'Ya existe una cuenta con ese email.',
    'auth.receptor_taken': 'Ya existe una cuenta con ese nº de receptor.',
    'auth.token_invalid': 'El enlace no es válido.',
    'auth.token_expired': 'El enlace ha caducado. Solicita uno nuevo.',
    'auth.already_verified': 'Tu cuenta ya estaba verificada. Puedes iniciar sesión.',
    'auth.refresh_invalid': 'Tu sesión ha caducado. Inicia sesión de nuevo.',
    'auth.wrong_password': 'La contraseña actual no es correcta.',
    'auth.registered': 'Cuenta creada. Te hemos enviado un email para verificarla.',
    'auth.registered_email_failed': 'Cuenta creada, pero no pudimos enviar el email. Solicita el reenvío.',
    'auth.verified': 'Cuenta verificada. Ya puedes iniciar sesión.',
    'auth.verification_resent': 'Si la cuenta existe y está pendiente, te hemos reenviado el email.',
    'auth.login_success': 'Sesión iniciada.',
    'auth.logout_success': 'Sesión cerrada.',
    'auth.refreshed': 'Sesión renovada.',
    'auth.forgot_password_received': 'Solicitud recibida. Un administrador te asignará una contraseña temporal.',
    'auth.password_changed': 'Contraseña actualizada.',
    'auth.me': 'OK',

    // email
    'email.send_failed': 'No se pudo enviar el email. Inténtalo más tarde.',
    'email.daily_cap': 'Se ha alcanzado el límite diario de emails. Inténtalo mañana.',

    // user
    'user.not_found': 'Administración no encontrada.',
    'user.list': 'OK',
    'user.detail': 'OK',
    'user.profile_updated': 'Datos actualizados.',
    'user.status_updated': 'Estado actualizado.',
    'user.role_updated': 'Rol actualizado.',
    'user.password_reset': 'Contraseña temporal asignada.',
    'user.sessions_revoked': 'Sesiones cerradas.',
    'user.cannot_modify_superadmin': 'No se puede modificar la cuenta de superadministrador.',

    // campaign
    'campaign.none_active': 'No hay ninguna campaña activa.',
    'campaign.closed': 'El plazo de intercambio de esta campaña ha terminado.',
    'campaign.not_found': 'Campaña no encontrada.',
    'campaign.name_taken': 'Ya existe una campaña con ese nombre.',
    'campaign.must_keep_active': 'Debe haber siempre una campaña activa. Activa otra antes de desactivar esta.',
    'campaign.list': 'OK',
    'campaign.detail': 'OK',
    'campaign.created': 'Campaña creada.',
    'campaign.updated': 'Campaña actualizada.',
} as const satisfies Record<string, string>;

export type ApiCode = keyof typeof MESSAGES_ES;

const FALLBACK = 'Ha ocurrido un error.';

export function resolveMessage(code: string | undefined | null, fallback: string = FALLBACK): string {
    if (!code) return fallback;
    return (MESSAGES_ES as Record<string, string>)[code] ?? fallback;
}
