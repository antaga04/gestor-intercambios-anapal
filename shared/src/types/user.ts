import type { Role, UserStatus } from '../constants';

/** What other admons can see. Printed on envelopes. */
export interface PublicUser {
    _id: string;
    receptorNumber: string;
    name: string;
    poblacion: string;
    provincia: string;
    address?: string;
    phone?: string;
    contactName?: string;
}

export interface MeUser extends PublicUser {
    email: string;
    role: Role;
    status: UserStatus;
    mustChangePassword: boolean;
    createdAt: string;
}

export interface AdminUser extends MeUser {
    lastLoginAt?: string;
    lastSeenAt?: string;
    verificationEmailsSent: number;
    updatedAt: string;
}
