import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { validateParams, validate } from '../middlewares/validate.middleware.js';
import { analysisIdParamSchema } from '../validators/analysis.validator.js';
import { getAnalysisById } from '../controllers/analysis.controller.js';
import { createAnalysisFollowUpSchema } from '../validators/analysisFollowUp.validator.js';
import { createAnalysisFollowUp, getAnalysisFollowUps } from '../controllers/analysisFollowUp.controller.js';
import { followUpLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

// Route to submit a follow-up question
router.post(
  '/:analysisId/follow-ups',
  verifyJWT,
  followUpLimiter,
  validateParams(analysisIdParamSchema),
  validate(createAnalysisFollowUpSchema),
  createAnalysisFollowUp
);

// Route to fetch previous follow-up questions
router.get(
  '/:analysisId/follow-ups',
  verifyJWT,
  validateParams(analysisIdParamSchema),
  getAnalysisFollowUps
);

// Route to fetch a specific AI analysis by ID (requires auth and ID validation)
router.get(
  '/:analysisId',
  verifyJWT,
  validateParams(analysisIdParamSchema),
  getAnalysisById
);

export { router as analysisRouter };
export default router;
