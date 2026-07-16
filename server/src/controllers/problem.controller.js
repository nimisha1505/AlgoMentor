import { Problem } from '../models/problem.model.js';
import { RecommendationProgress } from '../models/recommendationProgress.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { importProblemFromUrl } from '../services/problemImport/index.js';

/**
 * Create and save a new DSA Problem draft.
 * Automatically associates the problem with the logged-in user and defaults status to 'draft'.
 */
const createProblem = asyncHandler(async (req, res) => {
  const {
    title,
    problemStatement,
    constraints,
    examples,
    language,
    code,
    requestedSections,
    analysisDepth,
    topics,
    patterns,
    confidence,
    isBookmarked,
    studentNotes,
    nextRevisionAt,
    source,
    sourceUrl,
    externalProblemId,
    difficulty,
    recommendationKey,
  } = req.body;

  // Duplicate detection
  if (source && source !== 'custom' && externalProblemId && externalProblemId.trim() !== '') {
    const existing = await Problem.findOne({
      owner: req.user._id,
      source,
      externalProblemId,
    });
    if (existing) {
      return res.status(409).json(
        new ApiResponse(
          409,
          {
            existingProblem: {
              _id: existing._id,
              title: existing.title,
              status: existing.status,
            },
          },
          'You have already saved this problem.'
        )
      );
    }
  }

  // Save problem in database
  const problem = await Problem.create({
    owner: req.user._id,
    title,
    problemStatement,
    constraints,
    examples,
    language,
    code,
    requestedSections,
    analysisDepth,
    topics,
    patterns,
    confidence,
    isBookmarked,
    studentNotes,
    nextRevisionAt,
    source,
    sourceUrl,
    externalProblemId,
    difficulty,
  });

  // Link recommendation
  if (recommendationKey) {
    try {
      await RecommendationProgress.findOneAndUpdate(
        {
          owner: req.user._id,
          recommendationKey,
        },
        {
          $set: {
            status: 'attempted',
            linkedProblem: problem._id,
            lastInteractedAt: new Date(),
          },
          $setOnInsert: {
            title: problem.title,
            pattern: (patterns && patterns[0]) || 'General',
            topic: (topics && topics[0]) || 'other',
          },
        },
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed to link recommendation on createProblem:', err);
    }
  }

  return res
    .status(201)
    .json(new ApiResponse(201, { problem }, 'Problem saved successfully'));
});

/**
 * Retrieve saved problems history of the authenticated user with pagination, sorting, and filtering.
 */
const getMyProblems = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    status,
    language,
    source,
    difficulty,
    search,
    topic,
    confidence,
    isBookmarked,
    revisionDue,
  } = req.validatedQuery;

  const filter = { owner: req.user._id };

  if (status) filter.status = status;
  if (language) filter.language = language;
  if (source) filter.source = source;
  if (difficulty) filter.difficulty = difficulty;
  if (topic) filter.topics = topic;
  if (confidence) filter.confidence = confidence;
  if (isBookmarked !== undefined) filter.isBookmarked = isBookmarked;
  if (revisionDue === true) {
    filter.nextRevisionAt = { $ne: null, $lte: new Date() };
  }

  if (search) {
    // Escape special characters to prevent regex injection
    const escapedSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    filter.title = { $regex: escapedSearch, $options: 'i' };
  }

  const skip = (page - 1) * limit;

  // Retrieve problems with field selections
  const problems = await Problem.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select(
      'title language requestedSections status createdAt updatedAt topics patterns confidence isBookmarked studentNotes nextRevisionAt lastPractisedAt practiceCount source sourceUrl externalProblemId difficulty'
    );

  const totalProblems = await Problem.countDocuments(filter);
  const totalPages = Math.ceil(totalProblems / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        problems,
        pagination: {
          page,
          limit,
          totalProblems,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      },
      'Problems fetched successfully'
    )
  );
});

/**
 * Retrieve details of a specific problem owned by the authenticated user.
 */
const getProblemById = asyncHandler(async (req, res) => {
  const { problemId } = req.validatedParams;

  const problem = await Problem.findOne({
    _id: problemId,
    owner: req.user._id,
  });

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { problem }, 'Problem fetched successfully'));
});

/**
 * Update a specific problem owned by the authenticated user.
 * Filters request parameters and resets status to 'draft'.
 */
const updateProblem = asyncHandler(async (req, res) => {
  const { problemId } = req.validatedParams;
  const {
    title,
    problemStatement,
    constraints,
    examples,
    language,
    code,
    requestedSections,
    analysisDepth,
    topics,
    patterns,
    confidence,
    isBookmarked,
    studentNotes,
    nextRevisionAt,
    source,
    sourceUrl,
    externalProblemId,
    difficulty,
  } = req.body;

  const updateData = {};

  if (title !== undefined) updateData.title = title;
  if (problemStatement !== undefined) updateData.problemStatement = problemStatement;
  if (constraints !== undefined) updateData.constraints = constraints;
  if (examples !== undefined) updateData.examples = examples;
  if (language !== undefined) updateData.language = language;
  if (code !== undefined) updateData.code = code;
  if (requestedSections !== undefined) updateData.requestedSections = requestedSections;
  if (analysisDepth !== undefined) updateData.analysisDepth = analysisDepth;
  if (topics !== undefined) updateData.topics = topics;
  if (patterns !== undefined) updateData.patterns = patterns;
  if (confidence !== undefined) updateData.confidence = confidence;
  if (isBookmarked !== undefined) updateData.isBookmarked = isBookmarked;
  if (studentNotes !== undefined) updateData.studentNotes = studentNotes;
  if (nextRevisionAt !== undefined) updateData.nextRevisionAt = nextRevisionAt;
  if (source !== undefined) updateData.source = source;
  if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl;
  if (externalProblemId !== undefined) updateData.externalProblemId = externalProblemId;
  if (difficulty !== undefined) updateData.difficulty = difficulty;

  // Mark status as 'draft' upon edits to problem specification
  updateData.status = 'draft';

  const updatedProblem = await Problem.findOneAndUpdate(
    {
      _id: problemId,
      owner: req.user._id,
    },
    {
      $set: updateData,
    },
    {
      returnDocument: 'after',
      runValidators: true,
    }
  );

  if (!updatedProblem) {
    throw new ApiError(404, 'Problem not found');
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { problem: updatedProblem },
        'Problem updated successfully'
      )
    );
});

/**
 * Update ONLY learning metadata for a specific problem owned by the authenticated user.
 * Does NOT reset status to draft.
 */
const updateProblemLearning = asyncHandler(async (req, res) => {
  const { problemId } = req.validatedParams;
  const {
    topics,
    patterns,
    confidence,
    isBookmarked,
    studentNotes,
    nextRevisionAt,
  } = req.body;

  const updateData = {};

  if (topics !== undefined) updateData.topics = topics;
  if (patterns !== undefined) updateData.patterns = patterns;
  if (confidence !== undefined) updateData.confidence = confidence;
  if (isBookmarked !== undefined) updateData.isBookmarked = isBookmarked;
  if (studentNotes !== undefined) updateData.studentNotes = studentNotes;
  if (nextRevisionAt !== undefined) updateData.nextRevisionAt = nextRevisionAt;

  const updatedProblem = await Problem.findOneAndUpdate(
    {
      _id: problemId,
      owner: req.user._id,
    },
    {
      $set: updateData,
    },
    {
      returnDocument: 'after',
      runValidators: true,
    }
  );

  if (!updatedProblem) {
    throw new ApiError(404, 'Problem not found');
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { problem: updatedProblem },
        'Problem learning metadata updated successfully'
      )
    );
});

/**
 * Delete a specific problem owned by the authenticated user.
 */
const deleteProblem = asyncHandler(async (req, res) => {
  const { problemId } = req.validatedParams;

  const problem = await Problem.findOneAndDelete({
    _id: problemId,
    owner: req.user._id,
  });

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Problem deleted successfully'));
});

/**
 * Scrape problem details from an external platform URL (without saving).
 */
const importProblem = asyncHandler(async (req, res) => {
  const { url } = req.body;
  const importedProblem = await importProblemFromUrl(url);

  return res.status(200).json(
    new ApiResponse(
      200,
      { importedProblem },
      'Problem metadata imported successfully'
    )
  );
});

export {
  createProblem,
  getMyProblems,
  getProblemById,
  updateProblem,
  updateProblemLearning,
  deleteProblem,
  importProblem,
};
