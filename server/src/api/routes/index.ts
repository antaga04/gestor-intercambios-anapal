import { Router } from 'express';
import authRouter from '@/api/routes/auth';
import usersRouter from '@/api/routes/users';
import campaignsRouter from '@/api/routes/campaigns';
import dashboardRouter from '@/api/routes/dashboard';
import adminRouter from '@/api/routes/admin';

const router: Router = Router();

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/campaigns', campaignsRouter);
router.use('/dashboard', dashboardRouter);
router.use('/admin', adminRouter);

// Phase 4+: /lottery, /exchanges (see docs/04-api.md)

export default router;
