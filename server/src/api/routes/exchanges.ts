import { Router } from 'express';
import { z } from 'zod';
import {
    exchangeInputSchema,
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
router.post('/', requireOpenCampaign, validate({ body: exchangeInputSchema }), exchanges.create);

router.get('/:id', withId, exchanges.getOne);
router.put('/:id', withId, requireOpenCampaign, validate({ body: exchangeUpdateSchema }), exchanges.update);
router.delete('/:id', withId, requireOpenCampaign, exchanges.remove);

router.post('/:id/send', withId, requireOpenCampaign, exchanges.send);
router.post('/:id/cancel', withId, requireOpenCampaign, exchanges.cancel);
router.post('/:id/accept', withId, requireOpenCampaign, exchanges.accept);
router.post('/:id/reject', withId, requireOpenCampaign, validate({ body: exchangeRejectSchema }), exchanges.reject);

export default router;
