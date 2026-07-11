import { Problem } from '../models/problem.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

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

export { createProblem, getMyProblems };
