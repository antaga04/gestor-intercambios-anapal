import type { Request, Response } from 'express';
import type { ChangePasswordInput, UpdateProfileInput, UserDirectoryQuery } from '@anapal/shared';
import * as usersService from '@/api/services/users';
import { toMeUser } from '@/api/services/auth';
import { getQuery } from '@/middlewares/validate';
import { asyncHandler } from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';

export const directory = asyncHandler(async (req: Request, res: Response) => {
    const payload = await usersService.directory(req.user!.id, getQuery<UserDirectoryQuery>(req));
    return sendSuccess(res, 200, { i18n: 'user.list', message: 'OK', payload });
});

export const getPublic = asyncHandler(async (req: Request, res: Response) => {
    const payload = await usersService.getPublic(req.params.id as string);
    return sendSuccess(res, 200, { i18n: 'user.detail', message: 'OK', payload });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.updateProfile(req.user!.id, req.body as UpdateProfileInput);
    return sendSuccess(res, 200, { i18n: 'user.profile_updated', message: 'Profile updated', payload: toMeUser(user) });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
    await usersService.changePassword(req.user!.id, req.user!.family, req.body as ChangePasswordInput);
    return sendSuccess(res, 200, { i18n: 'auth.password_changed', message: 'Password changed' });
});
