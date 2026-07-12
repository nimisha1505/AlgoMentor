import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { getPreferences, updatePreferences } from '../controllers/user.controller.js';
import { updatePreferencesSchema } from '../validators/user.validator.js';
import { validate } from '../middlewares/validate.middleware.js';

const router = Router();

router.use(verifyJWT);

router.route('/preferences')
  .get(getPreferences)
  .patch(validate(updatePreferencesSchema), updatePreferences);

export { router as userRouter };
export default router;
