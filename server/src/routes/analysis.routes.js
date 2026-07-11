import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { validateParams } from '../middlewares/validate.middleware.js';
import { analysisIdParamSchema } from '../validators/analysis.validator.js';
import { getAnalysisById } from '../controllers/analysis.controller.js';

const router = Router();

// Route to fetch a specific AI analysis by ID (requires auth and ID validation)
router.get(
  '/:analysisId',
  verifyJWT,
  validateParams(analysisIdParamSchema),
  getAnalysisById
);

export { router as analysisRouter };
