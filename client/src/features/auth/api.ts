import type { EmailOnlyInput, LoginInput, MeUser, RegisterInput } from '@anapal/shared';
import { request, requestWithCode } from '@/lib/api';

export const authApi = {
    me: () => request<MeUser>({ method: 'GET', url: '/auth/me' }),
    login: (body: LoginInput) => request<MeUser>({ method: 'POST', url: '/auth/login', data: body }),
    logout: () => request<undefined>({ method: 'POST', url: '/auth/logout' }),
    register: (body: RegisterInput) =>
        requestWithCode<{ email: string; emailSent: boolean }>({ method: 'POST', url: '/auth/register', data: body }),
    verifyEmail: (token: string) =>
        requestWithCode<undefined>({ method: 'POST', url: '/auth/verify-email', data: { token } }),
    resendVerification: (body: EmailOnlyInput) =>
        requestWithCode<undefined>({ method: 'POST', url: '/auth/resend-verification', data: body }),
    forgotPassword: (body: EmailOnlyInput) =>
        requestWithCode<undefined>({ method: 'POST', url: '/auth/forgot-password', data: body }),
};
