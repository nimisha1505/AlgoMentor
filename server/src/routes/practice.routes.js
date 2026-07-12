import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { getPracticeDashboard, getPracticeRecommendations, getAiUsage } from '../controllers/practice.controller.js';

const router = Router();

// Apply auth protection universally across all practice paths
router.use(verifyJWT);

router.get('/dashboard', getPracticeDashboard);
router.get('/recommendations', getPracticeRecommendations);
router.get('/usage', getAiUsage);

export { router as practiceRouter };
export default router;
