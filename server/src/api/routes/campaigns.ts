import { Router } from 'express';
import * as campaigns from '@/api/controllers/campaigns';
import { authenticate } from '@/middlewares/authenticate';

const router: Router = Router();

router.get('/active', campaigns.getActive);
router.get('/', authenticate, campaigns.list);

export default router;
