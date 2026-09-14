import { z } from 'zod';
import { LIMITS } from '../constants';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const numeroSchema = z
    .string()
    .trim()
    .regex(/^\d{5}$/, 'El número debe tener 5 dígitos');

export const serieSchema = z.number().int().min(LIMITS.serieMin).max(LIMITS.serieMax);
export const fraccionSchema = z.number().int().min(LIMITS.fraccionMin).max(LIMITS.fraccionMax);

export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).default(LIMITS.pageSizeDefault),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const passwordSchema = z
    .string()
    .min(LIMITS.passwordMin, `Mínimo ${LIMITS.passwordMin} caracteres`)
    .max(LIMITS.passwordMax)
    .regex(/[A-Za-z]/, 'Debe contener al menos una letra')
    .regex(/\d/, 'Debe contener al menos un número');

export const emailSchema = z.string().trim().toLowerCase().email('Email no válido');
