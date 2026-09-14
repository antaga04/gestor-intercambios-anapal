import { z } from 'zod';
import { objectIdSchema, paginationQuerySchema } from './common';

/** `?campaign=<id>` is read by the `activeCampaign` middleware; listed here so validation keeps it. */
export const campaignScopeSchema = z.object({ campaign: objectIdSchema.optional() });

export const adminStatsQuerySchema = campaignScopeSchema;

export const passwordRequestQuerySchema = paginationQuerySchema.extend({
    status: z.enum(['pending', 'resolved']).default('pending'),
});
export type PasswordRequestQuery = z.infer<typeof passwordRequestQuerySchema>;

export const adminUserExchangesQuerySchema = paginationQuerySchema.merge(campaignScopeSchema).extend({
    direction: z.enum(['out', 'in', 'all']).default('all'),
});
export type AdminUserExchangesQuery = z.infer<typeof adminUserExchangesQuerySchema>;

export const adminControlListQuerySchema = campaignScopeSchema.extend({
    format: z.enum(['json', 'csv']).default('json'),
});
export type AdminControlListQuery = z.infer<typeof adminControlListQuerySchema>;
