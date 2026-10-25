import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import type { ApiError, ApiSuccess } from '@anapal/shared';
import { t } from '@/lib/messages';

export const HAS_SESSION_KEY = 'hasSession';

export class ApiClientError extends Error {
    readonly status: number;
    readonly code: string;
    readonly errors?: unknown;

    constructor(status: number, code: string, message: string, errors?: unknown) {
        super(message);
        this.name = 'ApiClientError';
        this.status = status;
        this.code = code;
        this.errors = errors;
    }

    /** Field-level zod issues from a 400 `validation.failed`. */
    get fieldErrors(): { path: string; message: string }[] {
        return Array.isArray(this.errors) ? (this.errors as { path: string; message: string }[]) : [];
    }
}

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

const NO_REFRESH_PATHS = ['/auth/refresh', '/auth/login', '/auth/logout', '/auth/register'];

let refreshPromise: Promise<void> | null = null;

function refreshOnce(): Promise<void> {
    if (!refreshPromise) {
        refreshPromise = api
            .post('/auth/refresh')
            .then(() => undefined)
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
}

export function clearSession() {
    try {
        localStorage.removeItem(HAS_SESSION_KEY);
    } catch {
        /* ignore */
    }
}

function toClientError(error: AxiosError<ApiError>): ApiClientError {
    const data = error.response?.data;
    const status = error.response?.status ?? 0;
    if (data && typeof data === 'object' && 'i18n' in data) {
        return new ApiClientError(status, data.i18n, t(data.i18n, data.message), data.errors);
    }
    return new ApiClientError(status, 'server.error', t('server.error'));
}

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiError>) => {
        const config = error.config as RetriableConfig | undefined;
        const status = error.response?.status;
        const path = config?.url ?? '';
        const canRefresh =
            status === 401 && config && !config._retried && !NO_REFRESH_PATHS.some((p) => path.startsWith(p));

        if (canRefresh) {
            config._retried = true;
            try {
                await refreshOnce();
                return api.request(config);
            } catch {
                clearSession();
                if (!window.location.pathname.startsWith('/login')) {
                    window.location.assign('/login?expired=1');
                }
            }
        }
        throw toClientError(error);
    },
);

/** Unwraps the API envelope: returns `payload`. */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
    const { data } = await api.request<ApiSuccess<T>>(config);
    return data.payload as T;
}

/** Same as `request` but also returns the success `i18n` code (for toasts). */
export async function requestWithCode<T>(config: AxiosRequestConfig): Promise<{ payload: T; code: string }> {
    const { data } = await api.request<ApiSuccess<T>>(config);
    return { payload: data.payload as T, code: data.i18n };
}
