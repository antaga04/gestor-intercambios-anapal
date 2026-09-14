import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateCampaignBody, UpdateCampaignBody } from '@anapal/shared';
import { adminApi } from '@/features/admin/api';
import { campaignKeys } from '@/features/campaigns/hooks';

export const adminKeys = { campaigns: ['admin', 'campaigns'] as const };

export function useAdminCampaigns() {
    return useQuery({ queryKey: adminKeys.campaigns, queryFn: adminApi.campaigns });
}

function useInvalidateCampaigns() {
    const queryClient = useQueryClient();
    return () => {
        void queryClient.invalidateQueries({ queryKey: adminKeys.campaigns });
        void queryClient.invalidateQueries({ queryKey: campaignKeys.active });
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
