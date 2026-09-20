import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { seriesContains, type LotteryImportInput, type LotteryNumberInput } from '@anapal/shared';
import { lotteryApi } from '@/features/lottery/api';
import { useAuth } from '@/features/auth/hooks';
import { ApiClientError } from '@/lib/api';

export const lotteryKeys = { all: ['lottery'] as const };

export function useLottery() {
    const { status } = useAuth();
    return useQuery({
        queryKey: lotteryKeys.all,
        enabled: status === 'authenticated',
        staleTime: 60_000,
        queryFn: async () => {
            try {
                return await lotteryApi.list();
            } catch (err) {
                if (err instanceof ApiClientError && err.status === 409) return [];
                throw err;
            }
        },
    });
}

function useLotteryMutation<TVars, TData>(mutationFn: (vars: TVars) => Promise<TData>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: lotteryKeys.all });
            void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });
}

export const useImportLottery = () => useLotteryMutation((body: LotteryImportInput) => lotteryApi.import(body));
export const useAddLotteryNumber = () => useLotteryMutation((body: LotteryNumberInput) => lotteryApi.add(body));
export const useRemoveLotteryNumber = () => useLotteryMutation((id: string) => lotteryApi.remove(id));
export const useClearLottery = () => useLotteryMutation(() => lotteryApi.clear());

export type LotteryWarning = 'numero_not_owned' | 'serie_not_owned';

/**
 * Local check against the cached list — the same rule the server applies, without a round trip.
 * Returns `null` when the user has no list (no list, no check). Texts live in `features/exchanges/warnings`.
 */
export function useLotteryCheck() {
    const { data } = useLottery();
    const list = data ?? [];

    return (numero: string, series: number[] = []): LotteryWarning | null => {
        if (list.length === 0) return null;
        const owned = list.find((item) => item.numero === numero);
        if (!owned) return 'numero_not_owned';
        if (owned.series.length === 0 || series.length === 0) return null;
        return series.every((serie) => seriesContains(owned.series, serie)) ? null : 'serie_not_owned';
    };
}
