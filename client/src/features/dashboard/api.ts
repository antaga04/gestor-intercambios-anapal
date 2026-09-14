import type { DashboardPayload } from '@anapal/shared';
import { request } from '@/lib/api';

export const dashboardApi = {
    get: () => request<DashboardPayload>({ method: 'GET', url: '/dashboard' }),
};
