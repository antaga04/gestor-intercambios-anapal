import { z } from 'zod';
import { LIMITS } from '../constants';
import { emailSchema, passwordSchema } from './common';

export const receptorNumberSchema = z
    .string()
    .trim()
    .regex(/^\d{1,6}$/, 'El nº de receptor debe ser numérico (máx. 6 dígitos)');

export const profileFieldsSchema = z.object({
    name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(80),
    poblacion: z.string().trim().min(2, 'Mínimo 2 caracteres').max(80),
    provincia: z.string().trim().min(2, 'Mínimo 2 caracteres').max(60),
    address: z.string().trim().max(160).optional(),
    phone: z.string().trim().max(20).optional(),
    contactName: z.string().trim().max(80).optional(),
});

export const registerSchema = profileFieldsSchema
    .extend({
        email: emailSchema,
        password: passwordSchema,
        receptorNumber: receptorNumberSchema,
    })
    .strict();
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z
    .object({
        email: emailSchema,
        password: z.string().min(1, 'Introduce la contraseña').max(LIMITS.passwordMax),
    })
    .strict();
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({ token: z.string().min(10) }).strict();
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const emailOnlySchema = z.object({ email: emailSchema }).strict();
export type EmailOnlyInput = z.infer<typeof emailOnlySchema>;

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Introduce tu contraseña actual'),
        newPassword: passwordSchema,
    })
    .strict()
    .refine((v) => v.currentPassword !== v.newPassword, {
        path: ['newPassword'],
        message: 'La nueva contraseña debe ser distinta de la actual',
    });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
