import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { validateParams, validate } from '../middlewares/validate.middleware.js';
import { analysisIdParamSchema, approachParamsSchema } from '../validators/analysis.validator.js';
import { getAnalysisById, generateApproachCodeController, generateApproachDryRunController } from '../controllers/analysis.controller.js';
import { createAnalysisFollowUpSchema } from '../validators/analysisFollowUp.validator.js';
import { createAnalysisFollowUp, getAnalysisFollowUps } from '../controllers/analysisFollowUp.controller.js';
import { followUpLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

// Route to generate code on-demand for a single approach
router.post(
  '/:analysisId/approaches/:approachIndex/code',
  verifyJWT,
  validateParams(approachParamsSchema),
  generateApproachCodeController
);

// Route to generate dry-run trace on-demand for a single approach
router.post(
  '/:analysisId/approaches/:approachIndex/dry-run',
  verifyJWT,
  validateParams(approachParamsSchema),
  generateApproachDryRunController
);

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
