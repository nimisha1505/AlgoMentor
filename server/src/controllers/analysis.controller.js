import { Problem } from '../models/problem.model.js';
import { Analysis } from '../models/analysis.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { processAnalysis } from '../services/analysisProcessor.service.js';
import { generateApproachCode, generateApproachDryRun } from '../services/geminiAnalysis.service.js';
import { recordTokenUsage, getUtcDateKey } from '../services/aiUsage.service.js';
import { DAILY_TOKEN_LIMIT } from '../config/aiLimits.js';
import { AiUsage } from '../models/aiUsage.model.js';


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



/**
 * Generate code for a single approach of an analysis.
 */
const generateApproachCodeController = asyncHandler(async (req, res) => {
  const { analysisId, approachIndex } = req.validatedParams;

  // Usage limits check
  const dateKey = getUtcDateKey();
  const usage = await AiUsage.findOne({ owner: req.user._id, dateKey });
  if (usage && usage.totalTokens >= DAILY_TOKEN_LIMIT) {
    throw new ApiError(429, 'Daily token limit reached. Please try again tomorrow.');
  }

  const analysis = await Analysis.findById(analysisId);
  if (!analysis) {
    throw new ApiError(404, 'Analysis not found');
  }

  if (analysis.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Unauthorized access');
  }

  if (analysis.status !== 'completed') {
    throw new ApiError(400, 'Analysis is not completed');
  }

  const approaches = analysis.result?.approaches;
  if (!approaches || !Array.isArray(approaches) || approachIndex < 0 || approachIndex >= approaches.length) {
    throw new ApiError(400, 'Invalid approach index');
  }

  const approach = approaches[approachIndex];

  // Return saved code immediately if already generated
  if (approach.code && approach.code.trim().length > 0) {
    return res.status(200).json(
      new ApiResponse(200, { approach }, 'Code retrieved from cache')
    );
  }

  // Prevent duplicate generation from repeated clicks
  if (approach.codeGenerationStatus === 'generating') {
    throw new ApiError(409, 'Code is already being generated for this approach');
  }

  // Set processing flag
  approach.codeGenerationStatus = 'generating';
  analysis.markModified('result');
  await analysis.save();

  try {
    const language = analysis.inputSnapshot.language || 'cpp';
    const genResult = await generateApproachCode({
      title: analysis.inputSnapshot.title,
      problemStatement: analysis.inputSnapshot.problemStatement,
      constraints: analysis.inputSnapshot.constraints,
      approach,
      language
    });

    // Record token usage
    await recordTokenUsage(req.user._id, genResult.usage);

    // Update approach details
    approach.code = genResult.code;
    approach.language = language;
    approach.codeGeneratedAt = new Date();
    approach.codeGenerationStatus = 'completed';

    analysis.markModified('result');
    await analysis.save();

    return res.status(200).json(
      new ApiResponse(200, { approach }, 'Code generated successfully')
    );
  } catch (error) {
    console.error('On-demand code generation failed:', error);
    // Clear processing flag on failure
    approach.codeGenerationStatus = 'failed';
    analysis.markModified('result');
    await analysis.save();
    throw error;
  }
});

/**
 * Generate dry run for a single approach of an analysis.
 */
const generateApproachDryRunController = asyncHandler(async (req, res) => {
  const { analysisId, approachIndex } = req.validatedParams;

  // Usage limits check
  const dateKey = getUtcDateKey();
  const usage = await AiUsage.findOne({ owner: req.user._id, dateKey });
  if (usage && usage.totalTokens >= DAILY_TOKEN_LIMIT) {
    throw new ApiError(429, 'Daily token limit reached. Please try again tomorrow.');
  }

  const analysis = await Analysis.findById(analysisId);
  if (!analysis) {
    throw new ApiError(404, 'Analysis not found');
  }

  if (analysis.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Unauthorized access');
  }

  if (analysis.status !== 'completed') {
    throw new ApiError(400, 'Analysis is not completed');
  }

  const approaches = analysis.result?.approaches;
  if (!approaches || !Array.isArray(approaches) || approachIndex < 0 || approachIndex >= approaches.length) {
    throw new ApiError(400, 'Invalid approach index');
  }

  const approach = approaches[approachIndex];

  // Return saved dry run if already generated
  if (approach.dryRun && approach.dryRun.steps && approach.dryRun.steps.length > 0) {
    return res.status(200).json(
      new ApiResponse(200, { approach }, 'Dry run retrieved from cache')
    );
  }

  // Prevent duplicate generation from repeated clicks
  if (approach.dryRunGenerationStatus === 'generating') {
    throw new ApiError(409, 'Dry run is already being generated for this approach');
  }

  // Set processing flag
  approach.dryRunGenerationStatus = 'generating';
  analysis.markModified('result');
  await analysis.save();

  try {
    let example = null;
    if (analysis.inputSnapshot && analysis.inputSnapshot.examples && analysis.inputSnapshot.examples.length > 0) {
      example = analysis.inputSnapshot.examples[0];
    } else {
      example = { input: 'Illustrative Example Input', output: 'Illustrative Example Output', explanation: '' };
    }

    const genResult = await generateApproachDryRun({
      example,
      approach
    });

    // Record token usage
    await recordTokenUsage(req.user._id, genResult.usage);

    // Update approach details
    approach.dryRun = genResult.dryRun;
    approach.dryRunGeneratedAt = new Date();
    approach.dryRunGenerationStatus = 'completed';

    analysis.markModified('result');
    await analysis.save();

    return res.status(200).json(
      new ApiResponse(200, { approach }, 'Dry run generated successfully')
    );
  } catch (error) {
    console.error('On-demand dry run generation failed:', error);
    // Clear processing flag on failure
    approach.dryRunGenerationStatus = 'failed';
    analysis.markModified('result');
    await analysis.save();
    throw error;
  }
});

export {
  startProblemAnalysis,
  getAnalysisById,
  getProblemAnalyses,
  getLatestProblemAnalysis,
  compareAnalyses,
  generateApproachCodeController,
  generateApproachDryRunController,
};
