import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { getPracticeDashboard, getPracticeRecommendations } from '../controllers/practice.controller.js';

const router = Router();

// Apply auth protection universally across all practice paths
router.use(verifyJWT);

router.get('/dashboard', getPracticeDashboard);
router.get('/recommendations', getPracticeRecommendations);

export { router as practiceRouter };
export default router;
