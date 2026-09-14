import type { Campaign } from '@anapal/shared';
import { request } from '@/lib/api';

export const campaignsApi = {
    active: () => request<Campaign>({ method: 'GET', url: '/campaigns/active' }),
    list: () => request<Campaign[]>({ method: 'GET', url: '/campaigns' }),
};
