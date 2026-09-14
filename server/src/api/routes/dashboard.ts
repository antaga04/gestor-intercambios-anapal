import { Router } from 'express';
import { dashboard } from '@/api/controllers/dashboard';
import { authenticate } from '@/middlewares/authenticate';
import { activeCampaign } from '@/middlewares/campaign';

const router: Router = Router();

router.get('/', authenticate, activeCampaign, dashboard);

export default router;
