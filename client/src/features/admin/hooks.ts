import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
    AdminResetPasswordInput,
    AdminUpdateUserInput,
    AdminUserExchangesQuery,
    AdminUserQuery,
    CreateCampaignBody,
    PasswordRequestQuery,
    UpdateCampaignBody,
} from '@anapal/shared';
import { adminApi } from '@/features/admin/api';
import { campaignKeys } from '@/features/campaigns/hooks';

export const adminKeys = {
    all: ['admin'] as const,
    campaigns: ['admin', 'campaigns'] as const,
    stats: (campaign?: string) => ['admin', 'stats', campaign ?? 'active'] as const,
    users: (params: unknown) => ['admin', 'users', params] as const,
    user: (id: string) => ['admin', 'user', id] as const,
    userExchanges: (id: string, params: unknown) => ['admin', 'user', id, 'exchanges', params] as const,
    userControlList: (id: string, campaign?: string) =>
        ['admin', 'user', id, 'control-list', campaign ?? 'active'] as const,
    requests: (params: unknown) => ['admin', 'requests', params] as const,
    exchange: (id: string) => ['admin', 'exchange', id] as const,
};

// ----- panel -----

export function useAdminStats(campaign?: string) {
    return useQuery({
        queryKey: adminKeys.stats(campaign),
        queryFn: () => adminApi.stats(campaign),
        staleTime: 30_000,
    });
}

// ----- users -----

export function useAdminUsers(params: Partial<AdminUserQuery> & { campaign?: string }) {
    return useQuery({
        queryKey: adminKeys.users(params),
        queryFn: () => adminApi.users(params),
        placeholderData: keepPreviousData,
    });
}

export function useAdminUser(id: string | undefined) {
    return useQuery({ queryKey: adminKeys.user(id ?? ''), queryFn: () => adminApi.user(id!), enabled: !!id });
}

export function useAdminUserExchanges(id: string | undefined, params: Partial<AdminUserExchangesQuery>) {
    return useQuery({
        queryKey: adminKeys.userExchanges(id ?? '', params),
        queryFn: () => adminApi.userExchanges(id!, params),
        enabled: !!id,
        placeholderData: keepPreviousData,
    });
}

export function useAdminUserControlList(id: string | undefined, campaign?: string) {
    return useQuery({
        queryKey: adminKeys.userControlList(id ?? '', campaign),
        queryFn: () => adminApi.userControlList(id!, { campaign }),
        enabled: !!id,
    });
}

/** Every user mutation refreshes the users list, the detail, the requests and the panel counters. */
function useInvalidateAdminUsers() {
    const queryClient = useQueryClient();
    return (id?: string) => {
        void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'requests'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        if (id) void queryClient.invalidateQueries({ queryKey: adminKeys.user(id) });
    };
}

function useUserMutation<TVars extends { id: string }, TData>(mutationFn: (vars: TVars) => Promise<TData>) {
    const invalidate = useInvalidateAdminUsers();
    return useMutation({ mutationFn, onSuccess: (_data, vars) => invalidate(vars.id) });
}

export const useUpdateAdminUser = () =>
    useUserMutation(({ id, body }: { id: string; body: AdminUpdateUserInput }) => adminApi.updateUser(id, body));
export const useSetUserStatus = () =>
    useUserMutation(({ id, status }: { id: string; status: 'active' | 'blocked' }) => adminApi.setStatus(id, status));
export const useSetUserRole = () =>
    useUserMutation(({ id, role }: { id: string; role: 'user' | 'admin' }) => adminApi.setRole(id, role));
export const useResetUserPassword = () =>
    useUserMutation(({ id, body }: { id: string; body: AdminResetPasswordInput }) => adminApi.resetPassword(id, body));
export const useRevokeUserSessions = () => useUserMutation(({ id }: { id: string }) => adminApi.revokeSessions(id));

// ----- password requests -----

export function usePasswordRequests(params: Partial<PasswordRequestQuery>) {
    return useQuery({
        queryKey: adminKeys.requests(params),
        queryFn: () => adminApi.passwordRequests(params),
        placeholderData: keepPreviousData,
    });
}

// ----- exchanges -----

export function useAdminExchange(id: string | undefined, enabled = true) {
    return useQuery({
        queryKey: adminKeys.exchange(id ?? ''),
        queryFn: () => adminApi.exchange(id!),
        enabled: enabled && !!id,
    });
}

// ----- campaigns -----

export function useAdminCampaigns() {
    return useQuery({ queryKey: adminKeys.campaigns, queryFn: adminApi.campaigns });
}

function useInvalidateCampaigns() {
    const queryClient = useQueryClient();
    return () => {
        void queryClient.invalidateQueries({ queryKey: adminKeys.campaigns });
        void queryClient.invalidateQueries({ queryKey: campaignKeys.active });
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    };
}

export function useCreateCampaign() {
    const invalidate = useInvalidateCampaigns();
    return useMutation({
        mutationFn: (body: CreateCampaignBody) => adminApi.createCampaign(body),
        onSuccess: invalidate,
    });
}

export function useUpdateCampaign() {
    const invalidate = useInvalidateCampaigns();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: UpdateCampaignBody }) => adminApi.updateCampaign(id, body),
        onSuccess: invalidate,
    });
}
