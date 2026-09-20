import type { LegacyExchange } from '@anapal/shared';
import { request } from '@/lib/api';

export const legacyApi = {
    list: () => request<LegacyExchange[]>({ method: 'GET', url: '/legacy' }),
};
