import { Router } from 'express';
import { emailOnlySchema, loginSchema, registerSchema, verifyEmailSchema } from '@anapal/shared';
import * as auth from '@/api/controllers/auth';
import { authenticate } from '@/middlewares/authenticate';
import { authLimiter, refreshLimiter, resendLimiter } from '@/middlewares/rateLimiters';
import { validate } from '@/middlewares/validate';

const router: Router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), auth.register);
router.post('/verify-email', authLimiter, validate({ body: verifyEmailSchema }), auth.verifyEmail);
router.post('/resend-verification', resendLimiter, validate({ body: emailOnlySchema }), auth.resendVerification);
router.post('/login', authLimiter, validate({ body: loginSchema }), auth.login);
router.post('/refresh', refreshLimiter, auth.refresh);
router.post('/logout', auth.logout);
router.get('/me', authenticate, auth.me);
router.post('/forgot-password', authLimiter, validate({ body: emailOnlySchema }), auth.forgotPassword);

export default router;
