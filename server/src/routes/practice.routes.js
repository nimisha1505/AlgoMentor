import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import {
  getPracticeDashboard,
  getPracticeRecommendations,
  getAiUsage,
  updateRecommendationProgress,
  getRecommendationProgress,
} from '../controllers/practice.controller.js';
import { updateRecommendationProgressSchema } from '../validators/recommendationProgress.validator.js';
import { validate } from '../middlewares/validate.middleware.js';

const router = Router();

// Apply auth protection universally across all practice paths
router.use(verifyJWT);

router.get('/dashboard', getPracticeDashboard);
router.get('/recommendations', getPracticeRecommendations);
router.get('/recommendations/progress', getRecommendationProgress);
router.patch(
  '/recommendations/:recommendationKey',
  validate(updateRecommendationProgressSchema),
  updateRecommendationProgress
);
router.get('/usage', getAiUsage);

export { router as practiceRouter };
export default router;
