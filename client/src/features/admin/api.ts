import type {
    AdminControlListQuery,
    AdminResetPasswordInput,
    AdminStats,
    AdminUpdateUserInput,
    AdminUser,
    AdminUserExchangesQuery,
    AdminUserQuery,
    AdminUserRow,
    Campaign,
    ControlList,
    CreateCampaignBody,
    ExchangeDetail,
    ExchangeSummary,
    Paginated,
    PasswordRequestQuery,
    PasswordRequestRow,
    UpdateCampaignBody,
} from '@anapal/shared';
import { request, requestWithCode } from '@/lib/api';

export const adminApi = {
    stats: (campaign?: string) => request<AdminStats>({ method: 'GET', url: '/admin/stats', params: { campaign } }),

    users: (params: Partial<AdminUserQuery> & { campaign?: string }) =>
        request<Paginated<AdminUserRow>>({ method: 'GET', url: '/admin/users', params }),
    user: (id: string) => request<AdminUser>({ method: 'GET', url: `/admin/users/${id}` }),
    updateUser: (id: string, body: AdminUpdateUserInput) =>
        requestWithCode<AdminUser>({ method: 'PATCH', url: `/admin/users/${id}`, data: body }),
    setStatus: (id: string, status: 'active' | 'blocked') =>
        requestWithCode<AdminUser>({ method: 'PATCH', url: `/admin/users/${id}/status`, data: { status } }),
    setRole: (id: string, role: 'user' | 'admin') =>
        requestWithCode<AdminUser>({ method: 'PATCH', url: `/admin/users/${id}/role`, data: { role } }),
    resetPassword: (id: string, body: AdminResetPasswordInput) =>
        requestWithCode<undefined>({ method: 'POST', url: `/admin/users/${id}/reset-password`, data: body }),
    revokeSessions: (id: string) =>
        requestWithCode<undefined>({ method: 'POST', url: `/admin/users/${id}/revoke-sessions` }),
    userExchanges: (id: string, params: Partial<AdminUserExchangesQuery>) =>
        request<Paginated<ExchangeSummary>>({ method: 'GET', url: `/admin/users/${id}/exchanges`, params }),
    userControlList: (id: string, params: Partial<AdminControlListQuery> = {}) =>
        request<ControlList>({ method: 'GET', url: `/admin/users/${id}/control-list`, params }),

    passwordRequests: (params: Partial<PasswordRequestQuery>) =>
        request<Paginated<PasswordRequestRow>>({ method: 'GET', url: '/admin/password-requests', params }),

    exchange: (id: string) => request<ExchangeDetail>({ method: 'GET', url: `/admin/exchanges/${id}` }),

    campaigns: () => request<Campaign[]>({ method: 'GET', url: '/admin/campaigns' }),
    createCampaign: (body: CreateCampaignBody) =>
        requestWithCode<Campaign>({ method: 'POST', url: '/admin/campaigns', data: body }),
    updateCampaign: (id: string, body: UpdateCampaignBody) =>
        requestWithCode<Campaign>({ method: 'PATCH', url: `/admin/campaigns/${id}`, data: body }),
};
