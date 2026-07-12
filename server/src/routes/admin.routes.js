import { Router } from 'express';
import { verifyJWT, verifyAdmin } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { recoverStuckAnalysesSchema } from '../validators/adminRecovery.validator.js';
import { triggerStuckAnalysesRecovery } from '../controllers/admin.controller.js';

const router = Router();

// Secure all admin routes with JWT and Admin checks
router.use(verifyJWT);
router.use(verifyAdmin);

router.post(
  '/recovery/analyses',
  validate(recoverStuckAnalysesSchema),
  triggerStuckAnalysesRecovery
);

export { router as adminRouter };
export default router;
