import type {
    LotteryCheckResult,
    LotteryImportInput,
    LotteryImportResult,
    LotteryNumberDto,
    LotteryNumberInput,
} from '@anapal/shared';
import { request, requestWithCode } from '@/lib/api';

export const lotteryApi = {
    list: () => request<LotteryNumberDto[]>({ method: 'GET', url: '/lottery' }),
    import: (body: LotteryImportInput) =>
        requestWithCode<LotteryImportResult>({ method: 'POST', url: '/lottery/import', data: body }),
    add: (body: LotteryNumberInput) =>
        requestWithCode<LotteryNumberDto>({ method: 'POST', url: '/lottery', data: body }),
    remove: (id: string) => requestWithCode<undefined>({ method: 'DELETE', url: `/lottery/${id}` }),
    clear: () => requestWithCode<{ deleted: number }>({ method: 'DELETE', url: '/lottery' }),
    check: (numero: string) =>
        request<LotteryCheckResult>({ method: 'GET', url: '/lottery/check', params: { numero } }),
};
