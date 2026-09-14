import { Router } from 'express';
import { z } from 'zod';
import { createCampaignSchema, objectIdSchema, updateCampaignSchema } from '@anapal/shared';
import * as campaigns from '@/api/controllers/campaigns';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { adminLimiter } from '@/middlewares/rateLimiters';
import { validate } from '@/middlewares/validate';

const router: Router = Router();

router.use(adminLimiter, authenticate, authorize('admin'));

// Campaigns (superadmin only)
router.get('/campaigns', campaigns.list);
router.post('/campaigns', authorize('superadmin'), validate({ body: createCampaignSchema }), campaigns.create);
router.patch(
    '/campaigns/:id',
    authorize('superadmin'),
    validate({ params: z.object({ id: objectIdSchema }), body: updateCampaignSchema }),
    campaigns.update,
);

// Users, stats, password requests: Phase 9 (docs/07-admin-panel.md)

export default router;
