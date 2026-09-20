import { Router } from 'express';
import { z } from 'zod';
import {
    controlListQuerySchema,
    exchangeInputSchema,
    exchangeOverlapSchema,
    exchangeQuerySchema,
    exchangeRejectSchema,
    exchangeUpdateSchema,
    objectIdSchema,
} from '@anapal/shared';
import * as exchanges from '@/api/controllers/exchanges';
import { authenticate } from '@/middlewares/authenticate';
import { activeCampaign, requireOpenCampaign } from '@/middlewares/campaign';
import { validate } from '@/middlewares/validate';

const router: Router = Router();
const withId = validate({ params: z.object({ id: objectIdSchema }) });

router.use(authenticate, activeCampaign);

router.get('/', validate({ query: exchangeQuerySchema }), exchanges.list);
router.get('/inbox', exchanges.inbox);
router.get('/control-list', validate({ query: controlListQuerySchema }), exchanges.controlList);
router.post('/', requireOpenCampaign, validate({ body: exchangeInputSchema }), exchanges.create);
// Read-only advisory check, so it stays available after the deadline.
router.post('/overlap', validate({ body: exchangeOverlapSchema }), exchanges.overlap);

router.get('/:id', withId, exchanges.getOne);
router.put('/:id', withId, requireOpenCampaign, validate({ body: exchangeUpdateSchema }), exchanges.update);
router.delete('/:id', withId, requireOpenCampaign, exchanges.remove);

router.post('/:id/send', withId, requireOpenCampaign, exchanges.send);
router.post('/:id/cancel', withId, requireOpenCampaign, exchanges.cancel);
router.post('/:id/accept', withId, requireOpenCampaign, exchanges.accept);
router.post('/:id/reject', withId, requireOpenCampaign, validate({ body: exchangeRejectSchema }), exchanges.reject);

export default router;
