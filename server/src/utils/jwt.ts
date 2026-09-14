import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '@anapal/shared';
import { env } from '@/config/env';
import { AppError } from '@/utils/AppError';

type Ttl = SignOptions['expiresIn'];

export interface AccessTokenPayload {
    sub: string;
    role: Role;
    family: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL as Ttl });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
    const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as jwt.JwtPayload;
    return { sub: String(decoded.sub), role: decoded.role as Role, family: String(decoded.family) };
}

interface EmailTokenPayload {
    sub: string;
    purpose: 'verify-email';
}

export function signEmailVerificationToken(userId: string): string {
    const payload: EmailTokenPayload = { sub: userId, purpose: 'verify-email' };
    return jwt.sign(payload, env.EMAIL_CONFIRMATION_SECRET, { expiresIn: env.EMAIL_CONFIRMATION_TTL as Ttl });
}

/** Throws AppError with `auth.token_expired` / `auth.token_invalid`. */
export function verifyEmailVerificationToken(token: string): string {
    try {
        const decoded = jwt.verify(token, env.EMAIL_CONFIRMATION_SECRET) as jwt.JwtPayload & EmailTokenPayload;
        if (decoded.purpose !== 'verify-email' || !decoded.sub) {
            throw new AppError(400, 'auth.token_invalid', 'Invalid token purpose');
        }
        return decoded.sub;
    } catch (err) {
        if (err instanceof AppError) throw err;
        if (err instanceof jwt.TokenExpiredError) throw new AppError(400, 'auth.token_expired', 'Token expired');
        throw new AppError(400, 'auth.token_invalid', 'Invalid token');
    }
}
