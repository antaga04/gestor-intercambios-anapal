import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks';
import { legacyApi } from '@/features/legacy/api';

export const legacyKeys = { all: ['legacy'] as const };

/** Records imported from the previous app. Read-only, so it can stay fresh for a long time. */
export function useLegacyExchanges() {
    const { status } = useAuth();
    return useQuery({
        queryKey: legacyKeys.all,
        enabled: status === 'authenticated',
        staleTime: 5 * 60_000,
        queryFn: legacyApi.list,
    });
}
