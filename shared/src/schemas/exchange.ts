import { z } from 'zod';
import { EXCHANGE_STATUS, LIMITS } from '../constants';
import { validateRow, type RowInput } from '../lottery/rows';
import { fraccionSchema, numeroSchema, objectIdSchema, paginationQuerySchema, serieSchema } from './common';

const baseRow = {
    numero: numeroSchema,
    signed: z.boolean().default(false),
    note: z.string().trim().max(LIMITS.rowNoteMax).optional(),
};

export const exchangeRowSchema = z
    .discriminatedUnion('type', [
        z.object({
            ...baseRow,
            type: z.literal('billete'),
            quantity: z.number().int().min(1).max(LIMITS.billetesMax),
            details: z
                .object({ serieFrom: serieSchema.optional(), serieTo: serieSchema.optional() })
                .strict()
                .optional(),
        }),
        z.object({
            ...baseRow,
            type: z.literal('decimo'),
            quantity: z.literal(1).default(1),
            details: z
                .object({ serie: serieSchema.optional(), fraccion: fraccionSchema.optional() })
                .strict()
                .optional(),
        }),
        z.object({
            ...baseRow,
            type: z.literal('decimos'),
            quantity: z.number().int().min(2).max(LIMITS.decimosMax),
            details: z
                .object({
                    items: z.array(z.object({ serie: serieSchema, fraccion: fraccionSchema }).strict()).optional(),
                })
                .strict()
                .optional(),
        }),
    ])
    .superRefine((row, ctx) => {
        for (const issue of validateRow(row as RowInput)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: issue.path.split('.'), message: issue.message });
        }
    });
export type ExchangeRowInput = z.infer<typeof exchangeRowSchema>;

const rowsSchema = z
    .array(exchangeRowSchema)
    .max(LIMITS.rowsPerExchange)
    .superRefine((rows, ctx) => {
        const seen = new Map<string, number>();
        rows.forEach((row, index) => {
            const previous = seen.get(row.numero);
            if (previous !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: [index, 'numero'],
                    message: `El número ${row.numero} ya está en la fila ${previous + 1}`,
                });
            }
            seen.set(row.numero, index);
        });
    });

export const exchangeInputSchema = z
    .object({
        to: objectIdSchema,
        note: z.string().trim().max(LIMITS.noteMax).optional(),
        rows: rowsSchema,
        /** Create it already sent instead of as a draft. */
        send: z.boolean().optional(),
    })
    .strict();
export type ExchangeInput = z.infer<typeof exchangeInputSchema>;

export const exchangeUpdateSchema = z
    .object({
        note: z.string().trim().max(LIMITS.noteMax).optional(),
        rows: rowsSchema,
    })
    .strict();
export type ExchangeUpdateInput = z.infer<typeof exchangeUpdateSchema>;

export const exchangeRejectSchema = z
    .object({ reason: z.string().trim().max(LIMITS.rejectReasonMax).optional() })
    .strict();

export const exchangeQuerySchema = paginationQuerySchema.extend({
    direction: z.enum(['out', 'in']).default('out'),
    status: z.enum(EXCHANGE_STATUS).optional(),
    q: z.string().trim().max(80).optional(),
    sort: z.enum(['updatedAt', 'counterpart', 'total']).default('updatedAt'),
});
export type ExchangeQuery = z.infer<typeof exchangeQuerySchema>;
