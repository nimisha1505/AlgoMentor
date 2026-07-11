import { Router } from 'express';
import {
  createProblem,
  getMyProblems,
  getProblemById,
  updateProblem,
  deleteProblem,
} from '../controllers/problem.controller.js';
import {
  createProblemSchema,
  problemListQuerySchema,
  problemIdParamSchema,
  updateProblemSchema,
} from '../validators/problem.validator.js';
import {
  validate,
  validateQuery,
  validateParams,
} from '../middlewares/validate.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Route to handle saved problem list retrieval (requires auth and query validation)
router.get('/', verifyJWT, validateQuery(problemListQuerySchema), getMyProblems);

// Route to handle new problem creation (requires authentication and Zod validation)
router.post('/', verifyJWT, validate(createProblemSchema), createProblem);

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

// Route to delete a specific problem by ID
router.delete(
  '/:problemId',
  verifyJWT,
  validateParams(problemIdParamSchema),
  deleteProblem
);

export { router as problemRouter };
