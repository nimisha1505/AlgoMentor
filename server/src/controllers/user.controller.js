import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Retrieves the authenticated user's custom learning preferences.
 */
const getPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { learningPreferences: user.learningPreferences },
      'Learning preferences fetched successfully'
    )
  );
});

/**
 * Updates the authenticated user's custom learning preferences.
 */
const updatePreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const preferences = user.learningPreferences || {};
  
  const {
    preferredLanguage,
    currentLevel,
    dailyPracticeGoal,
    explanationDepth,
    targetCompanies,
    preferredDifficulty,
  } = req.body;

  if (preferredLanguage !== undefined) preferences.preferredLanguage = preferredLanguage;
  if (currentLevel !== undefined) preferences.currentLevel = currentLevel;
  if (dailyPracticeGoal !== undefined) preferences.dailyPracticeGoal = dailyPracticeGoal;
  if (explanationDepth !== undefined) preferences.explanationDepth = explanationDepth;
  if (targetCompanies !== undefined) preferences.targetCompanies = targetCompanies;
  if (preferredDifficulty !== undefined) preferences.preferredDifficulty = preferredDifficulty;

  user.learningPreferences = preferences;
  await user.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { learningPreferences: user.learningPreferences },
      'Learning preferences updated successfully'
    )
  );
});

export { getPreferences, updatePreferences };
