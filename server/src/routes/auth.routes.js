import { Router } from 'express';
import { registerUser } from '../controllers/auth.controller.js';
import { registerSchema } from '../validators/auth.validator.js';
import { validate } from '../middlewares/validate.middleware.js';

const router = Router();

// Route to handle new user registration with Zod request validation
router.post('/register', validate(registerSchema), registerUser);

export { router as authRouter };
