import type {
    ControlList,
    ExchangeDetail,
    ExchangeInput,
    ExchangeQuery,
    ExchangeSummary,
    ExchangeUpdateInput,
    Paginated,
} from '@anapal/shared';
import { request, requestWithCode } from '@/lib/api';

export const exchangesApi = {
    list: (params: Partial<ExchangeQuery>) =>
        request<Paginated<ExchangeSummary>>({ method: 'GET', url: '/exchanges', params }),
    inbox: () => request<ExchangeSummary[]>({ method: 'GET', url: '/exchanges/inbox' }),
    controlList: () => request<ControlList>({ method: 'GET', url: '/exchanges/control-list' }),
    get: (id: string) => request<ExchangeDetail>({ method: 'GET', url: `/exchanges/${id}` }),
    create: (body: ExchangeInput) => requestWithCode<ExchangeDetail>({ method: 'POST', url: '/exchanges', data: body }),
    update: (id: string, body: ExchangeUpdateInput) =>
        requestWithCode<ExchangeDetail>({ method: 'PUT', url: `/exchanges/${id}`, data: body }),
    remove: (id: string) => requestWithCode<undefined>({ method: 'DELETE', url: `/exchanges/${id}` }),
    send: (id: string) => requestWithCode<ExchangeDetail>({ method: 'POST', url: `/exchanges/${id}/send` }),
    cancel: (id: string) => requestWithCode<ExchangeDetail>({ method: 'POST', url: `/exchanges/${id}/cancel` }),
    accept: (id: string) => requestWithCode<ExchangeDetail>({ method: 'POST', url: `/exchanges/${id}/accept` }),
    reject: (id: string, reason?: string) =>
        requestWithCode<ExchangeDetail>({ method: 'POST', url: `/exchanges/${id}/reject`, data: { reason } }),
};
