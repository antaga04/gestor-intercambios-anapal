import { createHash } from 'node:crypto';
import { ipKeyGenerator, rateLimit, type Options } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { ACCESS_COOKIE } from '@/utils/cookies';
import { verifyAccessToken } from '@/utils/jwt';
import { sendError } from '@/utils/response';

/** Authenticated users are limited per user, guests per IP (+ user agent). */
function keyGenerator(req: Request): string {
    const token = req.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (token) {
        try {
            return `USER-${verifyAccessToken(token).sub}`;
        } catch {
            // fall through to guest key
        }
    }
    const ip = ipKeyGenerator(req.ip ?? '');
    const ua = req.get('user-agent') ?? '';
    return `GUEST-${createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 32)}`;
}

function handler(_req: Request, res: Response) {
    return sendError(res, 429, { i18n: 'rate.limited', message: 'Too many requests' });
}

function createLimiter(windowMs: number, limit: number, extra: Partial<Options> = {}) {
    return rateLimit({
        windowMs,
        limit,
        keyGenerator,
        handler,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        ...extra,
    });
}

const MIN = 60_000;

export const generalLimiter = createLimiter(1 * MIN, 120);
// Only failed attempts count: several admons may share a computer, and a successful login is not abuse.
export const authLimiter = createLimiter(15 * MIN, 10, { skipSuccessfulRequests: true });
export const resendLimiter = createLimiter(60 * MIN, 3);
export const refreshLimiter = createLimiter(1 * MIN, 20);
export const importLimiter = createLimiter(10 * MIN, 20);
export const adminLimiter = createLimiter(1 * MIN, 300);
