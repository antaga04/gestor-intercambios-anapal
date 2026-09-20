import type { Request, Response } from 'express';
import * as legacyService from '@/api/services/legacy';
import { asyncHandler } from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';

export const list = asyncHandler(async (req: Request, res: Response) => {
    const payload = await legacyService.listForUser(req.user!.id);
    return sendSuccess(res, 200, { i18n: 'legacy.list', message: 'OK', payload });
});
