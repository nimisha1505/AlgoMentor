import { Analysis } from '../models/analysis.model.js';
import { Problem } from '../models/problem.model.js';
import { RecommendationProgress } from '../models/recommendationProgress.model.js';
import { generateProblemAnalysis } from './geminiAnalysis.service.js';
import { updatePatternProgressFromAnalysis } from './patternProgress.service.js';
import {
  checkAndReserveAnalysisUsage,
  recordTokenUsage,
  releaseReservedAnalysisUsage,
} from './aiUsage.service.js';

/**
 * Atomic processing executor for AI analysis records.
 * Transitions requests through the states: queued -> processing -> completed/failed,
 * synchronizing state with the associated Problem document.
 */
const processAnalysis = async (analysisId) => {
  // 1. Claim the queued analysis atomically to prevent race conditions
  const analysis = await Analysis.findOneAndUpdate(
    {
      _id: analysisId,
      status: 'queued',
    },
    {
      $set: {
        status: 'processing',
        processingStartedAt: new Date(),
        errorMessage: '',
      },
    },
    {
      new: true,
    }
  );

  if (!analysis) {
    throw new Error('Analysis is not available for processing');
  }

  let geminiRequestStarted = false;
  try {
    // 2. Transition related problem status to processing inside the try block
    await Problem.findOneAndUpdate(
      {
        _id: analysis.problem,
        owner: analysis.owner,
      },
      {
        $set: {
          status: 'processing',
        },
      }
    );

    // Reserve daily analysis limits
    await checkAndReserveAnalysisUsage(analysis.owner);
    geminiRequestStarted = true;

    // 3. Initiate analysis generation with Gemini API
    const genResult = await generateProblemAnalysis({
      inputSnapshot: analysis.inputSnapshot,
      requestedSections: analysis.requestedSections,
    });

    // Record token counts on success
    await recordTokenUsage(analysis.owner, genResult.usage);

    // 4. Save results on success
    const completedAnalysis = await Analysis.findByIdAndUpdate(
      analysis._id,
      {
        $set: {
          status: 'completed',
          result: genResult.result,
          modelName: genResult.modelName,
          usage: genResult.usage,
          completedAt: new Date(),
          errorMessage: '',
        },
      },
      {
        new: true,
      }
    );

    // Sync status on related problem to completed, increment practice count and update practicing date
    const updatedProblem = await Problem.findOneAndUpdate(
      {
        _id: analysis.problem,
        owner: analysis.owner,
      },
      {
        $set: {
          status: 'completed',
          lastPractisedAt: new Date(),
        },
        $inc: {
          practiceCount: 1,
        },
      },
      {
        new: true,
      }
    );

    // Update student pattern profile stats dynamically
    try {
      await updatePatternProgressFromAnalysis({
        analysis: completedAnalysis,
        problem: updatedProblem,
      });
    } catch (patternErr) {
      console.error('Failed to update student pattern progress:', patternErr);
    }

    // Update recommendation progress to solved if linked
    try {
      await RecommendationProgress.updateOne(
        { linkedProblem: updatedProblem._id },
        { $set: { status: 'solved', lastInteractedAt: new Date() } }
      );
    } catch (recErr) {
      console.error('Failed to update recommendation status to solved:', recErr);
    }

    return completedAnalysis;
  } catch (error) {
    if (!geminiRequestStarted) {
      try {
        await releaseReservedAnalysisUsage(analysis.owner);
      } catch (releaseErr) {
        console.error('Failed to refund reserved analysis quota:', releaseErr);
      }
    }

    // 5. Build defensive, safe error message
    const rawErrorMessage =
      error instanceof Error && error.message
        ? error.message
        : 'Analysis processing failed';

    const safeErrorMessage = rawErrorMessage.slice(0, 1000);

    // Use Promise.allSettled to defensively execute both cleanups in case one fails
    await Promise.allSettled([
      Analysis.findByIdAndUpdate(analysis._id, {
        $set: {
          status: 'failed',
          errorMessage: safeErrorMessage,
          completedAt: new Date(),
        },
      }),
      Problem.findOneAndUpdate(
        {
          _id: analysis.problem,
          owner: analysis.owner,
        },
        {
          $set: {
            status: 'failed',
          },
        }
      ),
    ]);

    // 6. Rethrow the original error to be caught by controller
    throw error;
  }
};

export { processAnalysis };
