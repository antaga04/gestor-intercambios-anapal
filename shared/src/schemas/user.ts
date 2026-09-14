import { z } from 'zod';
import { profileFieldsSchema, receptorNumberSchema } from './auth';
import { paginationQuerySchema } from './common';
import { ROLES, USER_STATUS } from '../constants';

export const updateProfileSchema = profileFieldsSchema.partial().strict();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const userDirectoryQuerySchema = paginationQuerySchema.extend({
    q: z.string().trim().max(80).optional(),
    provincia: z.string().trim().max(60).optional(),
});
export type UserDirectoryQuery = z.infer<typeof userDirectoryQuerySchema>;

// ----- admin -----

export const adminUserQuerySchema = paginationQuerySchema.extend({
    q: z.string().trim().max(80).optional(),
    status: z.enum(USER_STATUS).optional(),
    role: z.enum(ROLES).optional(),
    sort: z.enum(['lastSeenAt', 'createdAt', 'receptorNumber']).default('createdAt'),
});
export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;

export const adminUpdateUserSchema = profileFieldsSchema
    .partial()
    .extend({ receptorNumber: receptorNumberSchema.optional() })
    .strict();
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

export const updateStatusSchema = z.object({ status: z.enum(['active', 'blocked']) }).strict();
export const updateRoleSchema = z.object({ role: z.enum(['user', 'admin']) }).strict();
export const adminResetPasswordSchema = z
    .object({ temporaryPassword: z.string().min(10, 'Mínimo 10 caracteres').max(72) })
    .strict();
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
