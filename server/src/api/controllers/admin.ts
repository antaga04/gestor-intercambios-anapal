import type { Request, Response } from 'express';
import type {
    AdminControlListQuery,
    AdminResetPasswordInput,
    AdminUpdateUserInput,
    AdminUserExchangesQuery,
    AdminUserQuery,
    PasswordRequestQuery,
} from '@anapal/shared';
import { controlListToCsv } from '@anapal/shared';
import * as adminService from '@/api/services/admin';
import { getQuery } from '@/middlewares/validate';
import { asyncHandler } from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';

const id = (req: Request) => req.params.id as string;

export const stats = asyncHandler(async (req: Request, res: Response) => {
    const payload = await adminService.stats(req.campaign!);
    return sendSuccess(res, 200, { i18n: 'admin.stats', message: 'OK', payload });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
    const payload = await adminService.listUsers(getQuery<AdminUserQuery>(req), req.campaign!);
    return sendSuccess(res, 200, { i18n: 'admin.users', message: 'OK', payload });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
    const payload = await adminService.getUser(id(req));
    return sendSuccess(res, 200, { i18n: 'admin.user', message: 'OK', payload });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
    const payload = await adminService.updateUser(id(req), req.body as AdminUpdateUserInput, req.user!);
    return sendSuccess(res, 200, { i18n: 'admin.user_updated', message: 'User updated', payload });
});

export const setStatus = asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body as { status: 'active' | 'blocked' };
    const payload = await adminService.setStatus(id(req), status, req.user!);
    return sendSuccess(res, 200, { i18n: 'admin.status_updated', message: 'Status updated', payload });
});

export const setRole = asyncHandler(async (req: Request, res: Response) => {
    const { role } = req.body as { role: 'user' | 'admin' };
    const payload = await adminService.setRole(id(req), role, req.user!);
    return sendSuccess(res, 200, { i18n: 'admin.role_updated', message: 'Role updated', payload });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    await adminService.resetPassword(id(req), req.body as AdminResetPasswordInput, req.user!);
    return sendSuccess(res, 200, { i18n: 'admin.password_set', message: 'Temporary password set' });
});

export const revokeSessions = asyncHandler(async (req: Request, res: Response) => {
    await adminService.revokeSessions(id(req), req.user!);
    return sendSuccess(res, 200, { i18n: 'admin.sessions_revoked', message: 'Sessions revoked' });
});

export const passwordRequests = asyncHandler(async (req: Request, res: Response) => {
    const payload = await adminService.listPasswordRequests(getQuery<PasswordRequestQuery>(req));
    return sendSuccess(res, 200, { i18n: 'admin.requests', message: 'OK', payload });
});

export const userExchanges = asyncHandler(async (req: Request, res: Response) => {
    const payload = await adminService.userExchanges(id(req), getQuery<AdminUserExchangesQuery>(req), req.campaign!);
    return sendSuccess(res, 200, { i18n: 'admin.exchanges', message: 'OK', payload });
});

export const userControlList = asyncHandler(async (req: Request, res: Response) => {
    const { format } = getQuery<AdminControlListQuery>(req);
    const payload = await adminService.userControlList(id(req), req.campaign!);
    if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="lista-control-${id(req)}.csv"`);
        return res.send(controlListToCsv(payload));
    }
    return sendSuccess(res, 200, { i18n: 'exchange.control_list', message: 'OK', payload });
});

export const getExchange = asyncHandler(async (req: Request, res: Response) => {
    const payload = await adminService.getExchange(id(req), req.user!);
    return sendSuccess(res, 200, { i18n: 'exchange.detail', message: 'OK', payload });
});
