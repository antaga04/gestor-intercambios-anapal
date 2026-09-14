import type { Response } from 'express';
import type { ApiError, ApiSuccess } from '@anapal/shared';

export function sendSuccess<T>(res: Response, status: number, partial: Omit<ApiSuccess<T>, 'success'>) {
    return res.status(status).json({ success: true, ...partial } satisfies ApiSuccess<T>);
}

export function sendError<E>(res: Response, status: number, partial: Omit<ApiError<E>, 'success'>) {
    return res.status(status).json({ success: false, ...partial } satisfies ApiError<E>);
}
