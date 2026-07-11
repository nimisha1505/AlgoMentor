import { Problem } from '../models/problem.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

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
  } = req.body;

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
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { problem }, 'Problem saved successfully'));
});

/**
 * Retrieve saved problems history of the authenticated user with pagination, sorting, and filtering.
 */
const getMyProblems = asyncHandler(async (req, res) => {
  const { page, limit, status, language, search } = req.validatedQuery;

  const filter = { owner: req.user._id };

  if (status) filter.status = status;
  if (language) filter.language = language;

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
    .select('title language requestedSections status createdAt updatedAt');

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
  } = req.body;

  const updateData = {};

  if (title !== undefined) updateData.title = title;
  if (problemStatement !== undefined) updateData.problemStatement = problemStatement;
  if (constraints !== undefined) updateData.constraints = constraints;
  if (examples !== undefined) updateData.examples = examples;
  if (language !== undefined) updateData.language = language;
  if (code !== undefined) updateData.code = code;
  if (requestedSections !== undefined) updateData.requestedSections = requestedSections;

  // Mark status as 'draft' upon edits
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
      new: true,
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

export {
  createProblem,
  getMyProblems,
  getProblemById,
  updateProblem,
  deleteProblem,
};
