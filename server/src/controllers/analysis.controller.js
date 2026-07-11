import { Problem } from '../models/problem.model.js';
import { Analysis } from '../models/analysis.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * Request AI analysis for a saved DSA problem.
 * Validates request input, checks for active analyses, snapshots problem details,
 * and queues the analysis request.
 */
const startProblemAnalysis = asyncHandler(async (req, res) => {
  const { problemId } = req.validatedParams;
  const { force } = req.body; // Retained for compatibility/future workflows

  // 1. Fetch the problem owned by the current user
  const problem = await Problem.findOne({
    _id: problemId,
    owner: req.user._id,
  });

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }

  // 2. Prevent duplicate queued or processing analyses
  const activeAnalysis = await Analysis.findOne({
    problem: problem._id,
    owner: req.user._id,
    status: { $in: ['queued', 'processing'] },
  });

  if (activeAnalysis) {
    throw new ApiError(
      409,
      'Analysis is already queued or processing for this problem'
    );
  }

  // 3. Validate code availability if userCodeReview is requested
  if (
    problem.requestedSections &&
    problem.requestedSections.includes('userCodeReview')
  ) {
    if (!problem.code || problem.code.trim().length === 0) {
      throw new ApiError(
        400,
        'Code is required when user code review is requested'
      );
    }
  }

  // 4. Create explicit input snapshot (to isolate subsequent edits)
  const inputSnapshot = {
    title: problem.title,
    problemStatement: problem.problemStatement,
    constraints: problem.constraints,
    examples: problem.examples,
    language: problem.language,
    code: problem.code,
  };

  // 5. Create the Analysis record
  const analysis = await Analysis.create({
    problem: problem._id,
    owner: req.user._id,
    requestedSections: problem.requestedSections,
    inputSnapshot,
    status: 'queued',
    provider: 'gemini',
    promptVersion: 'v1',
  });

  // 6. Update problem status to queued
  problem.status = 'queued';
  await problem.save();

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        analysis: {
          _id: analysis._id,
          problem: analysis.problem,
          status: analysis.status,
          requestedSections: analysis.requestedSections,
          createdAt: analysis.createdAt,
        },
      },
      'Analysis queued successfully'
    )
  );
});

export { startProblemAnalysis };
