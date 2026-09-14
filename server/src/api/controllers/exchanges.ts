import type { Request, Response } from 'express';
import type { ExchangeInput, ExchangeQuery, ExchangeUpdateInput } from '@anapal/shared';
import * as exchangesService from '@/api/services/exchanges';
import { getQuery } from '@/middlewares/validate';
import { asyncHandler } from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';

const scopeOf = (req: Request) => ({
    actor: { id: req.user!.id, role: req.user!.role },
    campaign: req.campaign!,
});

export const list = asyncHandler(async (req: Request, res: Response) => {
    const payload = await exchangesService.list(scopeOf(req), getQuery<ExchangeQuery>(req));
    return sendSuccess(res, 200, { i18n: 'exchange.list', message: 'OK', payload });
});

export const inbox = asyncHandler(async (req: Request, res: Response) => {
    const payload = await exchangesService.inbox(scopeOf(req));
    return sendSuccess(res, 200, { i18n: 'exchange.list', message: 'OK', payload });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
    const payload = await exchangesService.getOne(scopeOf(req), req.params.id as string);
    return sendSuccess(res, 200, { i18n: 'exchange.detail', message: 'OK', payload });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as ExchangeInput;
    const payload = await exchangesService.create(scopeOf(req), body);
    return sendSuccess(res, 201, {
        i18n: body.send ? 'exchange.sent' : 'exchange.created',
        message: 'Exchange created',
        payload,
    });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
    const payload = await exchangesService.update(
        scopeOf(req),
        req.params.id as string,
        req.body as ExchangeUpdateInput,
    );
    return sendSuccess(res, 200, {
        i18n:
            payload.status === 'pending' && payload.respondedAt === undefined
                ? 'exchange.updated_needs_acceptance'
                : 'exchange.updated',
        message: 'Exchange updated',
        payload,
    });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
    await exchangesService.remove(scopeOf(req), req.params.id as string);
    return sendSuccess(res, 200, { i18n: 'exchange.deleted', message: 'Exchange deleted' });
});

export const send = asyncHandler(async (req: Request, res: Response) => {
    const payload = await exchangesService.send(scopeOf(req), req.params.id as string);
    return sendSuccess(res, 200, { i18n: 'exchange.sent', message: 'Exchange sent', payload });
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
    const payload = await exchangesService.cancel(scopeOf(req), req.params.id as string);
    return sendSuccess(res, 200, { i18n: 'exchange.cancelled', message: 'Exchange cancelled', payload });
});

export const accept = asyncHandler(async (req: Request, res: Response) => {
    const payload = await exchangesService.respond(scopeOf(req), req.params.id as string, true);
    return sendSuccess(res, 200, { i18n: 'exchange.accepted', message: 'Exchange accepted', payload });
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body as { reason?: string };
    const payload = await exchangesService.respond(scopeOf(req), req.params.id as string, false, reason);
    return sendSuccess(res, 200, { i18n: 'exchange.rejected', message: 'Exchange rejected', payload });
});
