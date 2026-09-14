import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { env } from '@/config/env';

export function generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(raw: string): string {
    return createHmac('sha256', env.REFRESH_TOKEN_SECRET).update(raw).digest('hex');
}

export function newTokenFamily(): string {
    return randomUUID();
}

export function refreshTokenExpiry(): Date {
    return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
