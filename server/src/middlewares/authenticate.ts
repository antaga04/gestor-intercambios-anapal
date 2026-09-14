import type { NextFunction, Request, Response } from 'express';
import type { UserStatus } from '@anapal/shared';
import { User } from '@/api/models/user';
import { ACCESS_COOKIE } from '@/utils/cookies';
import { verifyAccessToken } from '@/utils/jwt';
import { AppError } from '@/utils/AppError';

const STATUS_CACHE_TTL_MS = 60_000;
const statusCache = new Map<string, { status: UserStatus; at: number }>();

/** Cheap status re-check so blocked users are cut off within a minute even with a valid access token. */
async function getUserStatus(id: string): Promise<UserStatus | null> {
    const cached = statusCache.get(id);
    if (cached && Date.now() - cached.at < STATUS_CACHE_TTL_MS) return cached.status;
    const user = await User.findById(id).select('status').lean();
    if (!user) return null;
    statusCache.set(id, { status: user.status, at: Date.now() });
    return user.status;
}

export function invalidateUserStatusCache(id: string) {
    statusCache.delete(id);
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
    const token = req.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (!token) return next(new AppError(401, 'auth.not_authenticated', 'Not authenticated'));

    let payload;
    try {
        payload = verifyAccessToken(token);
    } catch {
        return next(new AppError(401, 'auth.not_authenticated', 'Invalid or expired access token'));
    }

    const status = await getUserStatus(payload.sub);
    if (status !== 'active') {
        return next(
            new AppError(
                status === 'blocked' ? 403 : 401,
                status === 'blocked' ? 'auth.blocked' : 'auth.not_authenticated',
                'User not active',
            ),
        );
    }

    req.user = { id: payload.sub, role: payload.role, family: payload.family };
    next();
}
