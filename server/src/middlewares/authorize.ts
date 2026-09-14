import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Role } from '@anapal/shared';
import { AppError } from '@/utils/AppError';

/** `superadmin` passes every check; `admin` passes checks that list `admin`. Requires `authenticate` first. */
export function authorize(...roles: Role[]): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction) => {
        const role = req.user?.role;
        if (!role) return next(new AppError(401, 'auth.not_authenticated', 'Not authenticated'));
        if (role === 'superadmin' || roles.includes(role)) return next();
        return next(new AppError(403, 'auth.forbidden', 'Forbidden'));
    };
}

export const isAdmin = (role: Role | undefined) => role === 'admin' || role === 'superadmin';
