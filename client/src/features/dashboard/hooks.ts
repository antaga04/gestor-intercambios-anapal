import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/features/dashboard/api';
import { ApiClientError } from '@/lib/api';
import { useAuth } from '@/features/auth/hooks';

export const dashboardKeys = { all: ['dashboard'] as const };

/** `data === null` when there is no active campaign yet. */
export function useDashboard() {
    const { status } = useAuth();
    return useQuery({
        queryKey: dashboardKeys.all,
        enabled: status === 'authenticated',
        staleTime: 30_000,
        queryFn: async () => {
            try {
                return await dashboardApi.get();
            } catch (err) {
                if (err instanceof ApiClientError && (err.status === 409 || err.status === 404)) return null;
                throw err;
            }
        },
    });
}
