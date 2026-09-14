import type { Request, Response } from 'express';
import { getDashboard } from '@/api/services/dashboard';
import { asyncHandler } from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';

export const dashboard = asyncHandler(async (req: Request, res: Response) => {
    const payload = await getDashboard(req.user!, req.campaign!);
    return sendSuccess(res, 200, { i18n: 'dashboard.ok', message: 'OK', payload });
});
