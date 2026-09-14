export interface ApiSuccess<T = undefined> {
    success: true;
    i18n: string;
    message: string;
    payload?: T;
}

export interface ApiError<E = unknown> {
    success: false;
    i18n: string;
    message: string;
    errors?: E;
}

export type ApiResponse<T = undefined, E = unknown> = ApiSuccess<T> | ApiError<E>;

export interface PaginationInfo {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface Paginated<T> {
    items: T[];
    pagination: PaginationInfo;
}
