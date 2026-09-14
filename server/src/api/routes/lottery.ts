import { Router } from 'express';
import { z } from 'zod';
import { lotteryCheckQuerySchema, lotteryImportSchema, lotteryNumberInputSchema, objectIdSchema } from '@anapal/shared';
import * as lottery from '@/api/controllers/lottery';
import { authenticate } from '@/middlewares/authenticate';
import { activeCampaign } from '@/middlewares/campaign';
import { importLimiter } from '@/middlewares/rateLimiters';
import { validate } from '@/middlewares/validate';

const router: Router = Router();

// "Mi lotería" is the admon's own stock list, so it stays editable after the exchange deadline.
router.use(authenticate, activeCampaign);

router.get('/', lottery.list);
router.get('/check', validate({ query: lotteryCheckQuerySchema }), lottery.check);
router.post('/import', importLimiter, validate({ body: lotteryImportSchema }), lottery.importRows);
router.post('/', validate({ body: lotteryNumberInputSchema }), lottery.addOne);
router.delete('/:id', validate({ params: z.object({ id: objectIdSchema }) }), lottery.remove);
router.delete('/', lottery.clear);

export default router;
