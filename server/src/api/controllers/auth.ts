import type { Request, Response } from 'express';
import type { EmailOnlyInput, LoginInput, RegisterInput, VerifyEmailInput } from '@anapal/shared';
import * as authService from '@/api/services/auth';
import * as session from '@/api/services/session';
import * as usersService from '@/api/services/users';
import { asyncHandler } from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';

export const register = asyncHandler(async (req: Request, res: Response) => {
    const { email, emailSent } = await authService.register(req.body as RegisterInput);
    return sendSuccess(res, 201, {
        i18n: emailSent ? 'auth.registered' : 'auth.registered_email_failed',
        message: emailSent ? 'User registered, verification email sent' : 'User registered, email failed',
        payload: { email, emailSent },
    });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body as VerifyEmailInput;
    const result = await authService.verifyEmail(token);
    return sendSuccess(res, 200, {
        i18n: result === 'verified' ? 'auth.verified' : 'auth.already_verified',
        message: result === 'verified' ? 'Email verified' : 'Email was already verified',
    });
});

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body as EmailOnlyInput;
    await authService.resendVerification(email);
    return sendSuccess(res, 200, { i18n: 'auth.verification_resent', message: 'If pending, email resent' });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.login(req.body as LoginInput);
    await session.startSession(req, res, { id: user._id.toString(), role: user.role });
    return sendSuccess(res, 200, {
        i18n: 'auth.login_success',
        message: 'Logged in',
        payload: authService.toMeUser(user),
    });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
    await session.refreshSession(req, res);
    return sendSuccess(res, 200, { i18n: 'auth.refreshed', message: 'Session refreshed' });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
    await session.endSession(req, res);
    return sendSuccess(res, 200, { i18n: 'auth.logout_success', message: 'Logged out' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.getMe(req.user!.id);
    return sendSuccess(res, 200, { i18n: 'auth.me', message: 'OK', payload: authService.toMeUser(user) });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body as EmailOnlyInput;
    await authService.forgotPassword(email);
    return sendSuccess(res, 200, { i18n: 'auth.forgot_password_received', message: 'Request received' });
});
