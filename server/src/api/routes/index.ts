import { Router } from 'express';
import authRouter from '@/api/routes/auth';
import usersRouter from '@/api/routes/users';
import campaignsRouter from '@/api/routes/campaigns';
import exchangesRouter from '@/api/routes/exchanges';
import lotteryRouter from '@/api/routes/lottery';
import dashboardRouter from '@/api/routes/dashboard';
import adminRouter from '@/api/routes/admin';

const router: Router = Router();

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/campaigns', campaignsRouter);
router.use('/exchanges', exchangesRouter);
router.use('/lottery', lotteryRouter);
router.use('/dashboard', dashboardRouter);
router.use('/admin', adminRouter);

export default router;
