import { Analysis } from '../models/analysis.model.js';
import { Problem } from '../models/problem.model.js';

/**
 * Recovers stuck analyses that have remained in queued or processing states for too long.
 * Transitions their states to failed and adjusts associated Problem statuses defensively.
 */
const recoverStuckAnalyses = async ({
  queuedOlderThanMinutes = 15,
  processingOlderThanMinutes = 20,
  limit = 100,
} = {}) => {
  const now = new Date();
  const queuedCutoff = new Date(now.getTime() - queuedOlderThanMinutes * 60 * 1000);
  const processingCutoff = new Date(now.getTime() - processingOlderThanMinutes * 60 * 1000);

  // 1. Fetch queued stuck analyses
  const stuckQueued = await Analysis.find({
    status: 'queued',
    createdAt: { $lt: queuedCutoff },
  }).limit(limit);

  // 2. Fetch processing stuck analyses
  const stuckProcessing = await Analysis.find({
    status: 'processing',
    processingStartedAt: { $lt: processingCutoff },
  }).limit(limit - stuckQueued.length);

  const allStuck = [...stuckQueued, ...stuckProcessing];

  let queuedRecovered = 0;
  let processingRecovered = 0;

  for (const analysis of allStuck) {
    if (analysis.status === 'queued') {
      queuedRecovered++;
    } else {
      processingRecovered++;
    }

    // Update Analysis to failed
    await Analysis.findByIdAndUpdate(analysis._id, {
      $set: {
        status: 'failed',
        errorMessage: 'Analysis timed out before completion',
        completedAt: now,
      },
    });

    // Update Problem to failed only if currently queued or processing
    await Problem.findOneAndUpdate(
      {
        _id: analysis.problem,
        status: { $in: ['queued', 'processing'] },
      },
      {
        $set: {
          status: 'failed',
        },
      }
    );
  }

  return {
    queuedRecovered,
    processingRecovered,
    totalRecovered: allStuck.length,
  };
};

export { recoverStuckAnalyses };
export default recoverStuckAnalyses;
