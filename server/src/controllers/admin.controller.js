import { recoverStuckAnalyses } from '../services/analysisRecovery.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * Endpoint to trigger manual recovery of stuck queued or processing analyses.
 * Restricted to administrators only.
 */
const triggerStuckAnalysesRecovery = asyncHandler(async (req, res) => {
  const { queuedOlderThanMinutes, processingOlderThanMinutes, limit } = req.body || {};

  const summary = await recoverStuckAnalyses({
    queuedOlderThanMinutes,
    processingOlderThanMinutes,
    limit,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, summary, 'Stuck analyses recovered successfully'));
});

export { triggerStuckAnalysesRecovery };
