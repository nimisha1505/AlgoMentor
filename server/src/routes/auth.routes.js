import { Router } from 'express';
import { registerUser, loginUser, logoutUser, getCurrentUser, refreshAccessToken, updateProfile, changePassword } from '../controllers/auth.controller.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { updateProfileSchema } from '../validators/profile.validator.js';
import { changePasswordSchema } from '../validators/password.validator.js';
import { validate } from '../middlewares/validate.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Route to handle new user registration with Zod request validation
router.post('/register', validate(registerSchema), registerUser);

// Route to handle user login with Zod request validation
router.post('/login', validate(loginSchema), loginUser);

// Route to handle user logout (requires JWT verification)
router.post('/logout', verifyJWT, logoutUser);

// Route to fetch current authenticated user profile
router.get('/current-user', verifyJWT, getCurrentUser);

// Route to refresh access and refresh tokens
router.post('/refresh-token', refreshAccessToken);

// Route to update authenticated user's profile information
router.patch('/profile', verifyJWT, validate(updateProfileSchema), updateProfile);

// Route to change user password (requires JWT verification)
router.patch('/change-password', verifyJWT, validate(changePasswordSchema), changePassword);

export { router as authRouter };
