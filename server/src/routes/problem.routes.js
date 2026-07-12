import { Router } from 'express';
import {
  createProblem,
  getMyProblems,
  getProblemById,
  updateProblem,
  updateProblemLearning,
  deleteProblem,
  importProblem,
} from '../controllers/problem.controller.js';
import {
  startProblemAnalysis,
  getProblemAnalyses,
  getLatestProblemAnalysis,
  compareAnalyses,
} from '../controllers/analysis.controller.js';
import {
  createProblemSchema,
  problemListQuerySchema,
  problemIdParamSchema,
  updateProblemSchema,
  updateProblemLearningSchema,
} from '../validators/problem.validator.js';
import {
  importProblemSchema,
} from '../validators/problemImport.validator.js';
import {
  startAnalysisSchema,
  analysisListQuerySchema,
} from '../validators/analysis.validator.js';
import {
  analysisComparisonQuerySchema,
} from '../validators/analysisComparison.validator.js';
import {
  validate,
  validateQuery,
  validateParams,
} from '../middlewares/validate.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { analysisLimiter, importLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

// Route to handle saved problem list retrieval (requires auth and query validation)
router.get('/', verifyJWT, validateQuery(problemListQuerySchema), getMyProblems);

// Route to handle new problem creation (requires authentication and Zod validation)
router.post('/', verifyJWT, validate(createProblemSchema), createProblem);

// Route to import problem metadata from external platforms (requires auth, rate limit, and zod check)
router.post(
  '/import',
  verifyJWT,
  importLimiter,
  validate(importProblemSchema),
  importProblem
);

// Route to compare two completed analysis attempts
router.get(
  '/:problemId/analyses/compare',
  verifyJWT,
  validateParams(problemIdParamSchema),
  validateQuery(analysisComparisonQuerySchema),
  compareAnalyses
);

// Route to fetch the latest AI analysis for a specific problem
router.get(
  '/:problemId/analyses/latest',
  verifyJWT,
  validateParams(problemIdParamSchema),
  getLatestProblemAnalysis
);

// Route to retrieve paginated AI analysis history for a specific problem
router.get(
  '/:problemId/analyses',
  verifyJWT,
  validateParams(problemIdParamSchema),
  validateQuery(analysisListQuerySchema),
  getProblemAnalyses
);

// Route to request AI analysis for a specific saved problem
router.post(
  '/:problemId/analyses',
  verifyJWT,
  analysisLimiter,
  validateParams(problemIdParamSchema),
  validate(startAnalysisSchema),
  startProblemAnalysis
);

// Route to fetch a specific problem by ID
router.get(
  '/:problemId',
  verifyJWT,
  validateParams(problemIdParamSchema),
  getProblemById
);

// Route to update a specific problem by ID
router.patch(
  '/:problemId',
  verifyJWT,
  validateParams(problemIdParamSchema),
  validate(updateProblemSchema),
  updateProblem
);

// Route to update only learning metadata for a specific problem by ID
router.patch(
  '/:problemId/learning',
  verifyJWT,
  validateParams(problemIdParamSchema),
  validate(updateProblemLearningSchema),
  updateProblemLearning
);

// Route to delete a specific problem by ID
router.delete(
  '/:problemId',
  verifyJWT,
  validateParams(problemIdParamSchema),
  deleteProblem
);

export { router as problemRouter };
