import type { Campaign, CreateCampaignBody, UpdateCampaignBody } from '@anapal/shared';
import { request, requestWithCode } from '@/lib/api';

export const adminApi = {
    campaigns: () => request<Campaign[]>({ method: 'GET', url: '/admin/campaigns' }),
    createCampaign: (body: CreateCampaignBody) =>
        requestWithCode<Campaign>({ method: 'POST', url: '/admin/campaigns', data: body }),
    updateCampaign: (id: string, body: UpdateCampaignBody) =>
        requestWithCode<Campaign>({ method: 'PATCH', url: `/admin/campaigns/${id}`, data: body }),
};
