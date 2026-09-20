import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ExchangeInput, ExchangeQuery, ExchangeUpdateInput } from '@anapal/shared';
import { exchangesApi } from '@/features/exchanges/api';
import { useAuth } from '@/features/auth/hooks';

export const exchangeKeys = {
    all: ['exchanges'] as const,
    list: (params: Partial<ExchangeQuery>) => ['exchanges', 'list', params] as const,
    inbox: ['exchanges', 'inbox'] as const,
    detail: (id: string) => ['exchanges', 'detail', id] as const,
    overlap: (to: string, numeros: string[]) => ['exchanges', 'overlap', to, numeros.join(',')] as const,
};

export function useExchanges(params: Partial<ExchangeQuery>, enabled = true) {
    const { status } = useAuth();
    return useQuery({
        queryKey: exchangeKeys.list(params),
        queryFn: () => exchangesApi.list(params),
        enabled: enabled && status === 'authenticated',
        placeholderData: keepPreviousData,
    });
}

export function useInbox(enabled = true) {
    const { status } = useAuth();
    return useQuery({
        queryKey: exchangeKeys.inbox,
        queryFn: exchangesApi.inbox,
        enabled: enabled && status === 'authenticated',
    });
}

export function useExchange(id: string | undefined) {
    return useQuery({
        queryKey: exchangeKeys.detail(id ?? ''),
        queryFn: () => exchangesApi.get(id!),
        enabled: !!id,
    });
}

/**
 * Which of `numeros` the receiver `to` already owns or already gives me (docs/03 §2). Advisory only; the
 * key is the sorted list so adding rows in any order hits the same cache entry.
 */
export function useExchangeOverlap(to: string | undefined, numeros: string[]) {
    const sorted = [...new Set(numeros)].sort();
    return useQuery({
        queryKey: exchangeKeys.overlap(to ?? '', sorted),
        queryFn: () => exchangesApi.overlap({ to: to!, numeros: sorted }),
        enabled: !!to && sorted.length > 0,
        staleTime: 30_000,
        placeholderData: keepPreviousData,
    });
}

/** Every exchange mutation touches the lists, the inbox badge and the dashboard counters. */
export function useInvalidateExchanges() {
    const queryClient = useQueryClient();
    return (id?: string) => {
        void queryClient.invalidateQueries({ queryKey: exchangeKeys.all });
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        void queryClient.invalidateQueries({ queryKey: ['control-list'] });
        if (id) void queryClient.invalidateQueries({ queryKey: exchangeKeys.detail(id) });
    };
}

function useExchangeMutation<TVars, TData>(mutationFn: (vars: TVars) => Promise<TData>) {
    const invalidate = useInvalidateExchanges();
    return useMutation({ mutationFn, onSuccess: () => invalidate() });
}

export const useCreateExchange = () => useExchangeMutation((body: ExchangeInput) => exchangesApi.create(body));
export const useUpdateExchange = () =>
    useExchangeMutation(({ id, body }: { id: string; body: ExchangeUpdateInput }) => exchangesApi.update(id, body));
export const useDeleteExchange = () => useExchangeMutation((id: string) => exchangesApi.remove(id));
export const useSendExchange = () => useExchangeMutation((id: string) => exchangesApi.send(id));
export const useCancelExchange = () => useExchangeMutation((id: string) => exchangesApi.cancel(id));
export const useAcceptExchange = () => useExchangeMutation((id: string) => exchangesApi.accept(id));
export const useRejectExchange = () =>
    useExchangeMutation(({ id, reason }: { id: string; reason?: string }) => exchangesApi.reject(id, reason));
