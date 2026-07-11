import { Router } from 'express';
import { createProblem, getMyProblems } from '../controllers/problem.controller.js';
import { createProblemSchema, problemListQuerySchema } from '../validators/problem.validator.js';
import { validate, validateQuery } from '../middlewares/validate.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Route to handle saved problem list retrieval (requires auth and query validation)
router.get('/', verifyJWT, validateQuery(problemListQuerySchema), getMyProblems);

// Route to handle new problem creation (requires authentication and Zod validation)
router.post('/', verifyJWT, validate(createProblemSchema), createProblem);

export { router as problemRouter };
