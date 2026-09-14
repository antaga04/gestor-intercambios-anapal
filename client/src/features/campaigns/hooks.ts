import { useQuery } from '@tanstack/react-query';
import { campaignsApi } from '@/features/campaigns/api';
import { ApiClientError } from '@/lib/api';

export const campaignKeys = {
    active: ['campaign', 'active'] as const,
    list: ['campaign', 'list'] as const,
};

/** Active campaign; `data === null` when there is none (404 is not an error here). */
export function useActiveCampaign() {
    return useQuery({
        queryKey: campaignKeys.active,
        queryFn: async () => {
            try {
                return await campaignsApi.active();
            } catch (err) {
                if (err instanceof ApiClientError && err.status === 404) return null;
                throw err;
            }
        },
        staleTime: 5 * 60_000,
    });
}

export const isCampaignClosed = (campaign: { exchangeDeadline: string }) =>
    new Date(campaign.exchangeDeadline).getTime() < Date.now();
