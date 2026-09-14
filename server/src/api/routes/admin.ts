import { Router } from 'express';
import { z } from 'zod';
import {
    adminControlListQuerySchema,
    adminResetPasswordSchema,
    adminStatsQuerySchema,
    adminUpdateUserSchema,
    adminUserExchangesQuerySchema,
    adminUserQuerySchema,
    createCampaignSchema,
    objectIdSchema,
    passwordRequestQuerySchema,
    updateCampaignSchema,
    updateRoleSchema,
    updateStatusSchema,
} from '@anapal/shared';
import * as admin from '@/api/controllers/admin';
import * as campaigns from '@/api/controllers/campaigns';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { activeCampaign } from '@/middlewares/campaign';
import { adminLimiter } from '@/middlewares/rateLimiters';
import { validate } from '@/middlewares/validate';

const router: Router = Router();
const withId = validate({ params: z.object({ id: objectIdSchema }) });

router.use(adminLimiter, authenticate, authorize('admin'));

// Panel
router.get('/stats', activeCampaign, validate({ query: adminStatsQuerySchema }), admin.stats);

// Users
router.get('/users', activeCampaign, validate({ query: adminUserQuerySchema }), admin.listUsers);
router.get('/users/:id', withId, admin.getUser);
router.patch('/users/:id', withId, validate({ body: adminUpdateUserSchema }), admin.updateUser);
router.patch('/users/:id/status', withId, validate({ body: updateStatusSchema }), admin.setStatus);
router.patch('/users/:id/role', withId, authorize('superadmin'), validate({ body: updateRoleSchema }), admin.setRole);
router.post('/users/:id/reset-password', withId, validate({ body: adminResetPasswordSchema }), admin.resetPassword);
router.post('/users/:id/revoke-sessions', withId, admin.revokeSessions);
router.get(
    '/users/:id/exchanges',
    withId,
    activeCampaign,
    validate({ query: adminUserExchangesQuerySchema }),
    admin.userExchanges,
);
router.get(
    '/users/:id/control-list',
    withId,
    activeCampaign,
    validate({ query: adminControlListQuerySchema }),
    admin.userControlList,
);

// Password requests
router.get('/password-requests', validate({ query: passwordRequestQuerySchema }), admin.passwordRequests);

// Exchanges (read; write goes through /exchanges/:id with the authorize bypass)
router.get('/exchanges/:id', withId, admin.getExchange);

// Campaigns (superadmin only for writes)
router.get('/campaigns', campaigns.list);
router.post('/campaigns', authorize('superadmin'), validate({ body: createCampaignSchema }), campaigns.create);
router.patch(
    '/campaigns/:id',
    authorize('superadmin'),
    validate({ params: z.object({ id: objectIdSchema }), body: updateCampaignSchema }),
    campaigns.update,
);

export default router;
