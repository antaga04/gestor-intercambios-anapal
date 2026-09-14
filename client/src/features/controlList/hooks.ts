import { useQuery } from '@tanstack/react-query';
import { exchangesApi } from '@/features/exchanges/api';
import { useAuth } from '@/features/auth/hooks';
import { ApiClientError } from '@/lib/api';

export const controlListKeys = { all: ['control-list'] as const };

/** `data === null` when there is no active campaign. */
export function useControlList() {
    const { status } = useAuth();
    return useQuery({
        queryKey: controlListKeys.all,
        enabled: status === 'authenticated',
        staleTime: 30_000,
        queryFn: async () => {
            try {
                return await exchangesApi.controlList();
            } catch (err) {
                if (err instanceof ApiClientError && (err.status === 409 || err.status === 404)) return null;
                throw err;
            }
        },
    });
}
