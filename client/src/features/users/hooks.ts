import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { UserDirectoryQuery } from '@anapal/shared';
import { usersApi } from '@/features/users/api';

export const userKeys = {
    directory: (params: Partial<UserDirectoryQuery>) => ['users', 'directory', params] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
};

export function useUserDirectory(params: Partial<UserDirectoryQuery>, enabled = true) {
    return useQuery({
        queryKey: userKeys.directory(params),
        queryFn: () => usersApi.directory(params),
        enabled,
        placeholderData: keepPreviousData,
    });
}

export function usePublicUser(id: string | undefined) {
    return useQuery({
        queryKey: userKeys.detail(id ?? ''),
        queryFn: () => usersApi.getPublic(id!),
        enabled: !!id,
        staleTime: 5 * 60_000,
    });
}
