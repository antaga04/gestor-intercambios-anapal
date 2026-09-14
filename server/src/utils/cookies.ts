import type { CookieOptions, Response } from 'express';
import { env } from '@/config/env';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

/** The refresh cookie is only sent to /api/auth/* (refresh + logout). */
const REFRESH_COOKIE_PATH = '/api/auth';

function baseOptions(): CookieOptions {
    return {
        httpOnly: true,
        secure: env.IS_PRODUCTION,
        sameSite: 'lax',
        domain: env.COOKIE_DOMAIN,
    };
}

function parseTtlMs(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 15 * 60 * 1000;
    const n = Number(match[1]);
    const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 's' | 'm' | 'h' | 'd'];
    return n * unit;
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie(ACCESS_COOKIE, accessToken, { ...baseOptions(), path: '/', maxAge: parseTtlMs(env.ACCESS_TOKEN_TTL) });
    res.cookie(REFRESH_COOKIE, refreshToken, {
        ...baseOptions(),
        path: REFRESH_COOKIE_PATH,
        maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
    });
}

export function clearAuthCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, { ...baseOptions(), path: '/' });
    res.clearCookie(REFRESH_COOKIE, { ...baseOptions(), path: REFRESH_COOKIE_PATH });
}
