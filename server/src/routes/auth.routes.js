import { Router } from 'express';
import { registerUser, loginUser, logoutUser } from '../controllers/auth.controller.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { validate } from '../middlewares/validate.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Route to handle new user registration with Zod request validation
router.post('/register', validate(registerSchema), registerUser);

// Route to handle user login with Zod request validation
router.post('/login', validate(loginSchema), loginUser);

// Route to handle user logout (requires JWT verification)
router.post('/logout', verifyJWT, logoutUser);

export { router as authRouter };
