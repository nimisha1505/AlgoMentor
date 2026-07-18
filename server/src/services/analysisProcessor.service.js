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
import { getGeminiFastModelName, getGeminiDeepModelName } from '../config/gemini.js';

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
      returnDocument: 'after',
    }
  );

  if (!analysis) {
    throw new Error('Analysis is not available for processing');
  }

  let usageReserved = false;
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
    usageReserved = true;

    // Log the selected provider and model when analysis starts
    const inferMode = (requestedSections) => {
      if (requestedSections.includes('hints') && !requestedSections.includes('problemExplanation')) return 'start';
      if (requestedSections.includes('problemExplanation') && requestedSections.length <= 5) return 'understand';
      if (requestedSections.includes('comparison') && !requestedSections.includes('userCodeReview')) return 'build';
      if (requestedSections.includes('userCodeReview') && !requestedSections.includes('hints')) return 'review';
      return 'complete';
    };
    const mode = inferMode(analysis.requestedSections || []);
    let modelName;
    if (mode === 'understand' || mode === 'start') {
      modelName = getGeminiFastModelName();
    } else {
      modelName = getGeminiDeepModelName();
    }
    console.log(`Starting analysis for problem ${analysis.problem} (ID: ${analysis._id}). Provider: ${analysis.provider || 'gemini'}, Model: ${modelName}`);

    // 3. Initiate analysis generation with Gemini API with a 3-minute timeout
    const geminiTimeoutMs = 180000;
    const genResult = await Promise.race([
      generateProblemAnalysis({
        inputSnapshot: analysis.inputSnapshot,
        requestedSections: analysis.requestedSections,
        analysisDepth: analysis.analysisDepth,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API request timed out after 3 minutes')), geminiTimeoutMs)
      )
    ]);

    // Record token counts on success
    await recordTokenUsage(analysis.owner, genResult.usage);

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
        returnDocument: 'after',
      }
    );

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
        returnDocument: 'after',
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
    console.error('Gemini processing failed with full server-side error:', error);

    if (usageReserved) {
      try {
        await releaseReservedAnalysisUsage(analysis.owner);
        usageReserved = false;
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
    const cleanupResults = await Promise.allSettled([
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

    cleanupResults.forEach((res, index) => {
      if (res.status === 'rejected') {
        console.error(`Failed to update DB document during analysis cleanup (index ${index}):`, res.reason);
      }
    });

    // 6. Rethrow the original error to be caught by controller
    throw error;
  }
};

export { processAnalysis };
