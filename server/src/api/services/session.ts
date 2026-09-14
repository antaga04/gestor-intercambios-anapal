import type { Request, Response } from 'express';
import type { Role } from '@anapal/shared';
import { RefreshToken } from '@/api/models/refreshToken';
import { User } from '@/api/models/user';
import { env } from '@/config/env';
import { AppError } from '@/utils/AppError';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from '@/utils/cookies';
import { signAccessToken } from '@/utils/jwt';
import { generateRefreshToken, hashRefreshToken, newTokenFamily, refreshTokenExpiry } from '@/utils/tokens';

const LAST_SEEN_THROTTLE_MS = 5 * 60_000;

interface SessionUser {
    id: string;
    role: Role;
}

function clientMeta(req: Request) {
    return { createdByIp: req.ip, userAgent: (req.get('user-agent') ?? '').slice(0, 300) };
}

/** Creates a brand-new session (new family) and sets both cookies. */
export async function startSession(req: Request, res: Response, user: SessionUser) {
    const family = newTokenFamily();
    const raw = generateRefreshToken();
    await RefreshToken.create({
        user: user.id,
        tokenHash: hashRefreshToken(raw),
        family,
        expiresAt: refreshTokenExpiry(),
        ...clientMeta(req),
    });
    const accessToken = signAccessToken({ sub: user.id, role: user.role, family });
    setAuthCookies(res, accessToken, raw);
}

/**
 * Rotates the refresh token presented in the cookie. Reuse of an already-rotated token revokes the whole
 * family (someone replayed an old cookie).
 */
export async function refreshSession(req: Request, res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!raw) {
        clearAuthCookies(res);
        throw new AppError(401, 'auth.refresh_invalid', 'Missing refresh token');
    }
    const tokenHash = hashRefreshToken(raw);
    const stored = await RefreshToken.findOne({ tokenHash });

    if (!stored || stored.expiresAt.getTime() < Date.now()) {
        clearAuthCookies(res);
        throw new AppError(401, 'auth.refresh_invalid', 'Refresh token not found or expired');
    }
    if (stored.revokedAt) {
        await RefreshToken.updateMany({ family: stored.family, revokedAt: null }, { $set: { revokedAt: new Date() } });
        clearAuthCookies(res);
        throw new AppError(401, 'auth.refresh_invalid', 'Refresh token reuse detected; family revoked');
    }

    const user = await User.findById(stored.user).select('role status lastSeenAt');
    if (!user || user.status !== 'active') {
        await RefreshToken.updateMany({ family: stored.family, revokedAt: null }, { $set: { revokedAt: new Date() } });
        clearAuthCookies(res);
        throw new AppError(401, 'auth.refresh_invalid', 'User not active');
    }

    const nextRaw = generateRefreshToken();
    const nextHash = hashRefreshToken(nextRaw);
    stored.revokedAt = new Date();
    stored.replacedByTokenHash = nextHash;
    await stored.save();
    await RefreshToken.create({
        user: user._id,
        tokenHash: nextHash,
        family: stored.family,
        expiresAt: refreshTokenExpiry(),
        ...clientMeta(req),
    });

    if (!user.lastSeenAt || Date.now() - user.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
        await User.updateOne({ _id: user._id }, { $set: { lastSeenAt: new Date() } });
    }

    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role, family: stored.family });
    setAuthCookies(res, accessToken, nextRaw);
}

/** Revokes the presented refresh token (whole family) and clears cookies. Never throws. */
export async function endSession(req: Request, res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (raw) {
        const stored = await RefreshToken.findOne({ tokenHash: hashRefreshToken(raw) }).select('family');
        if (stored) {
            await RefreshToken.updateMany(
                { family: stored.family, revokedAt: null },
                { $set: { revokedAt: new Date() } },
            );
        }
    }
    clearAuthCookies(res);
}

export async function revokeAllSessions(userId: string, exceptFamily?: string) {
    const filter: Record<string, unknown> = { user: userId, revokedAt: null };
    if (exceptFamily) filter.family = { $ne: exceptFamily };
    await RefreshToken.updateMany(filter, { $set: { revokedAt: new Date() } });
}

export const isProduction = env.IS_PRODUCTION;
