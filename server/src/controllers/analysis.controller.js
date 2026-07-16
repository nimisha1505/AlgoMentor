import { Problem } from '../models/problem.model.js';
import { Analysis } from '../models/analysis.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { processAnalysis } from '../services/analysisProcessor.service.js';

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
    analysisDepth: problem.analysisDepth || 'quick',
    inputSnapshot,
    status: 'queued',
    provider: 'gemini',
    promptVersion: 'v1',
  });

  // 6. Update problem status to queued
  problem.status = 'queued';
  await problem.save();

  // 7. Fire and forget the background processing
  // This allows the frontend to navigate immediately and poll the status
  processAnalysis(analysis._id).catch((err) => {
    console.error('Background analysis failed:', err);
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        analysis: {
          _id: analysis._id,
          problem: analysis.problem,
          status: analysis.status,
          requestedSections: analysis.requestedSections,
          errorMessage: analysis.errorMessage || '',
          createdAt: analysis.createdAt,
        },
      },
      'Analysis queued successfully'
    )
  );
});

/**
 * Retrieve a specific AI analysis by ID.
 * Excludes owner and __v fields.
 */
const getAnalysisById = asyncHandler(async (req, res) => {
  const { analysisId } = req.validatedParams;

  const analysis = await Analysis.findOne({
    _id: analysisId,
    owner: req.user._id,
  }).select('-owner -__v');

  if (!analysis) {
    throw new ApiError(404, 'Analysis not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { analysis }, 'Analysis fetched successfully'));
});

/**
 * Retrieve paginated AI analysis history for a specific Problem.
 * Excludes result, inputSnapshot, owner, and __v from output list.
 */
const getProblemAnalyses = asyncHandler(async (req, res) => {
  const { problemId } = req.validatedParams;
  const { page, limit, status, sort } = req.validatedQuery;

  // Confirm the problem exists and belongs to the user
  const problem = await Problem.findOne({
    _id: problemId,
    owner: req.user._id,
  }).select('_id');

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }

  const filter = {
    problem: problem._id,
    owner: req.user._id,
  };

  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;
  const sortDirection = sort === 'oldest' ? 1 : -1;

  const analyses = await Analysis.find(filter)
    .sort({ createdAt: sortDirection })
    .skip(skip)
    .limit(limit)
    .select(
      'problem status requestedSections provider modelName promptVersion usage errorMessage processingStartedAt completedAt createdAt updatedAt'
    );

  const totalAnalyses = await Analysis.countDocuments(filter);
  const totalPages = Math.ceil(totalAnalyses / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        analyses,
        pagination: {
          page,
          limit,
          totalAnalyses,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      },
      'Analyses fetched successfully'
    )
  );
});

/**
 * Retrieve the latest AI analysis for a specific Problem.
 * Excludes owner and __v fields.
 */
const getLatestProblemAnalysis = asyncHandler(async (req, res) => {
  const { problemId } = req.validatedParams;

  // Confirm the problem exists and belongs to the user
  const problem = await Problem.findOne({
    _id: problemId,
    owner: req.user._id,
  }).select('_id');

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }

  const analysis = await Analysis.findOne({
    problem: problem._id,
    owner: req.user._id,
  })
    .sort({ createdAt: -1 })
    .select('-owner -__v');

  if (!analysis) {
    throw new ApiError(404, 'Analysis not found');
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { analysis }, 'Latest analysis fetched successfully')
    );
});

/**
 * Compare two completed analysis attempts side by side.
 */
const compareAnalyses = asyncHandler(async (req, res) => {
  const { problemId } = req.validatedParams;
  const { firstAnalysisId, secondAnalysisId } = req.validatedQuery;

  // 1. Verify problem ownership
  const problem = await Problem.findOne({
    _id: problemId,
    owner: req.user._id,
  });

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }

  // 2. Fetch both analyses
  const firstAnalysis = await Analysis.findOne({
    _id: firstAnalysisId,
    problem: problemId,
    owner: req.user._id,
  }).select('-owner -__v');

  const secondAnalysis = await Analysis.findOne({
    _id: secondAnalysisId,
    problem: problemId,
    owner: req.user._id,
  }).select('-owner -__v');

  if (!firstAnalysis || !secondAnalysis) {
    throw new ApiError(404, 'One or both analyses not found');
  }

  const firstCreatedAt = firstAnalysis.createdAt;
  const secondCreatedAt = secondAnalysis.createdAt;
  const firstStatus = firstAnalysis.status;
  const secondStatus = secondAnalysis.status;

  const firstSections = firstAnalysis.requestedSections || [];
  const secondSections = secondAnalysis.requestedSections || [];
  const requestedSectionsAdded = secondSections.filter((s) => !firstSections.includes(s));
  const requestedSectionsRemoved = firstSections.filter((s) => !secondSections.includes(s));

  const codeChanged = (firstAnalysis.inputSnapshot?.code || '') !== (secondAnalysis.inputSnapshot?.code || '');
  const statementChanged = (firstAnalysis.inputSnapshot?.problemStatement || '') !== (secondAnalysis.inputSnapshot?.problemStatement || '');
  const languageChanged = (firstAnalysis.inputSnapshot?.language || '') !== (secondAnalysis.inputSnapshot?.language || '');

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        firstAnalysis,
        secondAnalysis,
        comparisonSummary: {
          firstCreatedAt,
          secondCreatedAt,
          firstStatus,
          secondStatus,
          requestedSectionsAdded,
          requestedSectionsRemoved,
          codeChanged,
          statementChanged,
          languageChanged,
        },
      },
      'Analyses compared successfully'
    )
  );
});

export {
  startProblemAnalysis,
  getAnalysisById,
  getProblemAnalyses,
  getLatestProblemAnalysis,
  compareAnalyses,
};
