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

    // exchange
    'exchange.list': 'OK',
    'exchange.detail': 'OK',
    'exchange.not_found': 'Intercambio no encontrado.',
    'exchange.forbidden': 'No participas en este intercambio.',
    'exchange.not_owner': 'Solo quien envía el intercambio puede modificarlo.',
    'exchange.not_receiver': 'Solo quien lo recibe puede aceptarlo o rechazarlo.',
    'exchange.self': 'No puedes intercambiar contigo mismo.',
    'exchange.exists': 'Ya tienes un intercambio con esa administración en esta campaña.',
    'exchange.duplicate_numero': 'Hay números repetidos en el intercambio.',
    'exchange.no_rows': 'Añade al menos un número antes de enviar.',
    'exchange.invalid_transition': 'No se puede hacer esa acción con el estado actual del intercambio.',
    'exchange.created': 'Intercambio creado.',
    'exchange.updated': 'Intercambio actualizado.',
    'exchange.updated_needs_acceptance': 'Intercambio actualizado. La otra administración deberá aceptarlo de nuevo.',
    'exchange.deleted': 'Intercambio eliminado.',
    'exchange.sent': 'Intercambio enviado.',
    'exchange.cancelled': 'Intercambio cancelado.',
    'exchange.accepted': 'Intercambio aceptado.',
    'exchange.rejected': 'Intercambio rechazado.',

    // lottery
    'lottery.list': 'OK',
    'lottery.not_found': 'Ese número no está en tu lista.',
    'lottery.imported': 'Lista de lotería actualizada.',
    'lottery.added': 'Número añadido a tu lotería.',
    'lottery.removed': 'Número eliminado de tu lotería.',
    'lottery.cleared': 'Se ha vaciado tu lista de lotería.',
    'lottery.limit_reached': 'Has alcanzado el máximo de números guardados.',
    'lottery.checked': 'OK',

    // dashboard
    'dashboard.ok': 'OK',

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

    // scanning (client-side codes, kept here so toasts share one dictionary)
    'scan.unreadable': 'No se ha podido leer el código. Inténtalo de nuevo.',
    'scan.campaign_mismatch': 'Este décimo no parece ser del sorteo de esta campaña.',
    'scan.finish_row_first': 'Completa o corrige la fila actual antes de escanear otro número.',
    'scan.duplicate': 'Ya has escaneado este décimo.',
    'scan.camera_unavailable': 'No se ha podido acceder a la cámara. Revisa los permisos del navegador.',
    'scan.camera_unsupported': 'Este navegador no permite escanear con la cámara.',
} as const satisfies Record<string, string>;

export type ApiCode = keyof typeof MESSAGES_ES;

const FALLBACK = 'Ha ocurrido un error.';

export function resolveMessage(code: string | undefined | null, fallback: string = FALLBACK): string {
    if (!code) return fallback;
    return (MESSAGES_ES as Record<string, string>)[code] ?? fallback;
}
