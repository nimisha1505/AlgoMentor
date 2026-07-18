import { Problem } from '../models/problem.model.js';
import { Analysis } from '../models/analysis.model.js';
import { AnalysisFollowUp } from '../models/analysisFollowUp.model.js';
import { StudentPatternProfile } from '../models/studentPatternProfile.model.js';
import { RecommendationProgress } from '../models/recommendationProgress.model.js';
import { getPersonalisedRecommendations } from '../services/practiceRecommendation.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { getUserUsageSummary } from '../services/aiUsage.service.js';

/**
 * Fetch student progress dashboard data including problem counts,
 * pattern strengths, weak patterns, and recent revisions.
 */
const getPracticeDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now = new Date();

  const [
    totalProblems,
    completedProblems,
    bookmarkedProblems,
    revisionDueCount,
    masteredCount,
    learningCount,
    weakCount,
    totalAnalyses,
    totalFollowUps,
    recentProblems,
    reviseToday,
  ] = await Promise.all([
    Problem.countDocuments({ owner: userId }),
    Problem.countDocuments({ owner: userId, status: 'completed' }),
    Problem.countDocuments({ owner: userId, isBookmarked: true }),
    Problem.countDocuments({ owner: userId, nextRevisionAt: { $ne: null, $lte: now } }),
    Problem.countDocuments({ owner: userId, confidence: 'mastered' }),
    Problem.countDocuments({ owner: userId, confidence: 'learning' }),
    Problem.countDocuments({ owner: userId, confidence: 'weak' }),
    Analysis.countDocuments({ owner: userId }),
    AnalysisFollowUp.countDocuments({ owner: userId }),
    Problem.find({ owner: userId }).sort({ updatedAt: -1 }).limit(5),
    Problem.find({ owner: userId, nextRevisionAt: { $ne: null, $lte: now } })
      .sort({ nextRevisionAt: 1 })
      .limit(5),
  ]);

  const allProfiles = await StudentPatternProfile.find({ owner: userId });

  const topStrongPatterns = [...allProfiles]
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 5)
    .map((p) => ({
      pattern: p.displayName,
      topic: p.topic,
      confidenceScore: p.confidenceScore,
    }));

  const topWeakPatterns = [...allProfiles]
    .sort((a, b) => a.confidenceScore - b.confidenceScore)
    .slice(0, 5)
    .map((p) => ({
      pattern: p.displayName,
      topic: p.topic,
      confidenceScore: p.confidenceScore,
      missedEdgeCaseCount: p.missedEdgeCaseCount,
      bruteForceDependenceCount: p.bruteForceDependenceCount,
      codeIssueCount: p.codeIssueCount,
    }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalProblems,
        completedProblems,
        bookmarkedProblems,
        revisionDueCount,
        masteredCount,
        learningCount,
        weakCount,
        totalAnalyses,
        totalFollowUps,
        topStrongPatterns,
        topWeakPatterns,
        recentProblems,
        reviseToday,
      },
      'Dashboard data fetched successfully'
    )
  );
});

/**
 * Fetch personalized practice question recommendations.
 */
const getPracticeRecommendations = asyncHandler(async (req, res) => {
  const limit = Math.min(30, parseInt(req.query.limit) || 10);
  const userId = req.user._id;

  const recommendations = await getPersonalisedRecommendations({
    userId,
    limit,
  });

  const rawWeakProfiles = await StudentPatternProfile.find({
    owner: userId,
  })
    .sort({ confidenceScore: 1 })
    .limit(5);

  const weakPatterns = rawWeakProfiles.map((p) => ({
    pattern: p.displayName,
    topic: p.topic,
    confidenceScore: p.confidenceScore,
    missedEdgeCaseCount: p.missedEdgeCaseCount,
    bruteForceDependenceCount: p.bruteForceDependenceCount,
    codeIssueCount: p.codeIssueCount,
    nextRevisionAt: p.nextRevisionAt,
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, { recommendations, weakPatterns }, 'Recommendations fetched successfully'));
});

/**
 * Retrieve the AI Usage summary for the current UTC day.
 */
const getAiUsage = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'development' && req.query.reset === 'true') {
    const { AiUsage } = await import('../models/aiUsage.model.js');
    const { getUtcDateKey } = await import('../services/aiUsage.service.js');
    const dateKey = getUtcDateKey();
    await AiUsage.updateOne(
      { owner: req.user._id, dateKey },
      { $set: { analysisRequests: 0 } }
    );
  }
  const summary = await getUserUsageSummary(req.user._id);
  return res.status(200).json(
    new ApiResponse(200, summary, 'Usage statistics fetched successfully')
  );
});

const updateRecommendationProgress = asyncHandler(async (req, res) => {
  const { recommendationKey } = req.params;
  const { status, feedback, linkedProblemId, title, pattern, topic } = req.body;

  if (linkedProblemId) {
    const problem = await Problem.findOne({
      _id: linkedProblemId,
      owner: req.user._id,
    });
    if (!problem) {
      throw new ApiError(404, 'Linked problem not found or not owned by you');
    }
  }

  const updateFields = {};
  if (status !== undefined) updateFields.status = status;
  if (feedback !== undefined) updateFields.feedback = feedback;
  if (linkedProblemId !== undefined) updateFields.linkedProblem = linkedProblemId;
  updateFields.lastInteractedAt = new Date();

  const setOnInsert = {
    title: title || 'Recommended Problem',
    pattern: pattern || 'General',
    topic: topic || 'other',
  };

  const progress = await RecommendationProgress.findOneAndUpdate(
    {
      owner: req.user._id,
      recommendationKey,
    },
    {
      $set: updateFields,
      $setOnInsert: setOnInsert,
    },
    {
      upsert: true,
      returnDocument: 'after',
    }
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      { progress },
      'Recommendation progress updated successfully'
    )
  );
});

const getRecommendationProgress = asyncHandler(async (req, res) => {
  const progressList = await RecommendationProgress.find({
    owner: req.user._id,
  }).sort({ lastInteractedAt: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      { progressList },
      'Recommendation progress fetched successfully'
    )
  );
});

export {
  getPracticeDashboard,
  getPracticeRecommendations,
  getAiUsage,
  updateRecommendationProgress,
  getRecommendationProgress,
};
