import type {
    ChangePasswordInput,
    MeUser,
    Paginated,
    PublicUser,
    UpdateProfileInput,
    UserDirectoryQuery,
} from '@anapal/shared';
import { request, requestWithCode } from '@/lib/api';

export const usersApi = {
    directory: (params: Partial<UserDirectoryQuery>) =>
        request<Paginated<PublicUser>>({ method: 'GET', url: '/users', params }),
    getPublic: (id: string) => request<PublicUser>({ method: 'GET', url: `/users/${id}` }),
    updateMe: (body: UpdateProfileInput) => requestWithCode<MeUser>({ method: 'PATCH', url: '/users/me', data: body }),
    changePassword: (body: ChangePasswordInput) =>
        requestWithCode<undefined>({ method: 'PATCH', url: '/users/me/password', data: body }),
};
