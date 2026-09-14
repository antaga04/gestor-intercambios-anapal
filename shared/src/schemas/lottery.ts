import { z } from 'zod';
import { LIMITS } from '../constants';
import { numeroSchema, serieSchema } from './common';

export const serieRangeSchema = z
    .object({ from: serieSchema, to: serieSchema })
    .strict()
    .refine((r) => r.from <= r.to, { path: ['to'], message: 'La serie final debe ser mayor o igual que la inicial' });

export const lotteryNumberInputSchema = z
    .object({
        numero: numeroSchema,
        series: z.array(serieRangeSchema).max(50).optional(),
    })
    .strict();
export type LotteryNumberInput = z.infer<typeof lotteryNumberInputSchema>;

export const lotteryImportSchema = z
    .object({
        rows: z.array(lotteryNumberInputSchema).min(1).max(LIMITS.lotteryImportChunk),
        /** Replace the whole campaign list instead of merging into it. */
        replace: z.boolean().optional(),
    })
    .strict();
export type LotteryImportInput = z.infer<typeof lotteryImportSchema>;

export const lotteryCheckQuerySchema = z.object({ numero: numeroSchema });
export type LotteryCheckQuery = z.infer<typeof lotteryCheckQuerySchema>;
