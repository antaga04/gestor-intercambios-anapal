import type { ExchangeStatus, PairDirection, Role, UserStatus } from '@anapal/shared';

export const STATUS_LABELS: Record<ExchangeStatus, string> = {
    draft: 'Borrador',
    pending: 'Pendiente',
    accepted: 'Aceptado',
    rejected: 'Rechazado',
    cancelled: 'Cancelado',
};

export const DIRECTION_LABELS: Record<PairDirection, string> = {
    da: 'Doy',
    recibe: 'Recibo',
    ambos: 'Ambos',
};

export const statusLabel = (status: ExchangeStatus) => STATUS_LABELS[status];
export const directionLabel = (direction: PairDirection) => DIRECTION_LABELS[direction];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
    pending: 'Pendiente de verificar',
    active: 'Activo',
    blocked: 'Bloqueado',
};

export const ROLE_LABELS: Record<Role, string> = {
    user: 'Usuario',
    admin: 'Administrador',
    superadmin: 'Superadmin',
};
