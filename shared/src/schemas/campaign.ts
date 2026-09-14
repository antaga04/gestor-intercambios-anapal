import { z } from 'zod';

const isoDate = z.coerce.date();

export const campaignBarcodeSchema = z
    .object({
        dayDigit: z.enum(['5', '6']),
        jornada: z
            .string()
            .trim()
            .regex(/^\d{1,3}$/, 'Jornada numérica (1-3 dígitos)'),
    })
    .strict();

export const createCampaignSchema = z
    .object({
        name: z.string().trim().min(3).max(80),
        drawDate: isoDate,
        exchangeDeadline: isoDate,
        isActive: z.boolean().default(false),
        barcode: campaignBarcodeSchema.optional(),
        landingText: z.string().trim().max(4000).optional(),
    })
    .strict()
    .refine((v) => v.exchangeDeadline <= v.drawDate, {
        path: ['exchangeDeadline'],
        message: 'La fecha límite debe ser anterior o igual a la del sorteo',
    });
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = z
    .object({
        name: z.string().trim().min(3).max(80).optional(),
        drawDate: isoDate.optional(),
        exchangeDeadline: isoDate.optional(),
        isActive: z.boolean().optional(),
        barcode: campaignBarcodeSchema.nullable().optional(),
        landingText: z.string().trim().max(4000).nullable().optional(),
    })
    .strict();
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
