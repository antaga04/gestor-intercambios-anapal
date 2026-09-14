import type { Request, Response } from 'express';
import type { LotteryCheckQuery, LotteryImportInput, LotteryNumberInput } from '@anapal/shared';
import * as lotteryService from '@/api/services/lottery';
import { getQuery } from '@/middlewares/validate';
import { asyncHandler } from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';

const scopeOf = (req: Request) => ({ user: req.user!.id, campaign: req.campaign!._id });

export const list = asyncHandler(async (req: Request, res: Response) => {
    const payload = await lotteryService.list(scopeOf(req));
    return sendSuccess(res, 200, { i18n: 'lottery.list', message: 'OK', payload });
});

export const importRows = asyncHandler(async (req: Request, res: Response) => {
    const payload = await lotteryService.importRows(scopeOf(req), req.body as LotteryImportInput);
    return sendSuccess(res, 200, { i18n: 'lottery.imported', message: 'Lottery list imported', payload });
});

export const addOne = asyncHandler(async (req: Request, res: Response) => {
    const payload = await lotteryService.addOne(scopeOf(req), req.body as LotteryNumberInput);
    return sendSuccess(res, 201, { i18n: 'lottery.added', message: 'Lottery number added', payload });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
    await lotteryService.remove(scopeOf(req), req.params.id as string);
    return sendSuccess(res, 200, { i18n: 'lottery.removed', message: 'Lottery number removed' });
});

export const clear = asyncHandler(async (req: Request, res: Response) => {
    const deleted = await lotteryService.clear(scopeOf(req));
    return sendSuccess(res, 200, { i18n: 'lottery.cleared', message: 'Lottery list cleared', payload: { deleted } });
});

export const check = asyncHandler(async (req: Request, res: Response) => {
    const { numero } = getQuery<LotteryCheckQuery>(req);
    const payload = await lotteryService.check(scopeOf(req), numero);
    return sendSuccess(res, 200, { i18n: 'lottery.checked', message: 'OK', payload });
});
