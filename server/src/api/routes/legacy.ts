import { Router } from 'express';
import * as legacy from '@/api/controllers/legacy';
import { authenticate } from '@/middlewares/authenticate';

const router: Router = Router();

// Read-only history of the previous app; independent of the active campaign.
router.use(authenticate);
router.get('/', legacy.list);

export default router;
