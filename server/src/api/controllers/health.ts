import type { Request, Response } from 'express';
import { isDatabaseConnected } from '@/config/db';
import { sendSuccess } from '@/utils/response';

export function healthCheck(_req: Request, res: Response) {
    return sendSuccess(res, 200, {
        i18n: 'server.ok',
        message: 'OK',
        payload: { db: isDatabaseConnected() ? 'connected' : 'disconnected', time: new Date().toISOString() },
    });
}
