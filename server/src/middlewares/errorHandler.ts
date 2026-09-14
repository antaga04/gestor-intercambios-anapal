import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '@/utils/AppError';
import { sendError } from '@/utils/response';
import { env } from '@/config/env';

export function notFoundHandler(req: Request, res: Response) {
    return sendError(res, 404, {
        i18n: 'server.not_found_route',
        message: 'Route not found',
        errors: { route: req.originalUrl },
    });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof AppError) {
        return sendError(res, err.status, { i18n: err.i18n, message: err.message, errors: err.errors });
    }
    if (err instanceof ZodError) {
        return sendError(res, 400, {
            i18n: 'validation.failed',
            message: 'Validation failed',
            errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        });
    }
    if (err instanceof mongoose.Error.CastError) {
        return sendError(res, 400, { i18n: 'validation.invalid_id', message: 'Invalid identifier' });
    }
    if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
        return sendError(res, 409, { i18n: 'db.duplicate', message: 'Duplicate key' });
    }
    if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.parse.failed') {
        return sendError(res, 400, { i18n: 'validation.failed', message: 'Malformed JSON body' });
    }

    const requestId = res.getHeader('X-Request-Id');
    console.error(`[error] request ${String(requestId)}`, err);
    return sendError(res, 500, {
        i18n: 'server.error',
        message: 'Internal Server Error',
        errors: env.IS_PRODUCTION ? undefined : { message: (err as Error)?.message },
    });
}
