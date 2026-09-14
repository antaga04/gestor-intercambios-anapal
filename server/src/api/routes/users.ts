import { Router } from 'express';
import { z } from 'zod';
import { changePasswordSchema, objectIdSchema, updateProfileSchema, userDirectoryQuerySchema } from '@anapal/shared';
import * as users from '@/api/controllers/users';
import { authenticate } from '@/middlewares/authenticate';
import { validate } from '@/middlewares/validate';

const router: Router = Router();

router.use(authenticate);

router.get('/', validate({ query: userDirectoryQuerySchema }), users.directory);
router.patch('/me', validate({ body: updateProfileSchema }), users.updateMe);
router.patch('/me/password', validate({ body: changePasswordSchema }), users.changePassword);
router.get('/:id', validate({ params: z.object({ id: objectIdSchema }) }), users.getPublic);

export default router;
