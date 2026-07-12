import { AiUsage } from '../models/aiUsage.model.js';
import { ApiError } from '../utils/ApiError.js';
import {
  DAILY_ANALYSIS_LIMIT,
  DAILY_FOLLOWUP_LIMIT,
  DAILY_TOKEN_LIMIT,
} from '../config/aiLimits.js';

/**
 * Returns YYYY-MM-DD key for the current UTC day.
 */
const getUtcDateKey = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Check limits and reserve one analysis request atomically.
 */
const checkAndReserveAnalysisUsage = async (userId) => {
  const dateKey = getUtcDateKey();

  const res = await AiUsage.findOneAndUpdate(
    {
      owner: userId,
      dateKey,
      analysisRequests: { $lt: DAILY_ANALYSIS_LIMIT },
      totalTokens: { $lt: DAILY_TOKEN_LIMIT },
    },
    { $inc: { analysisRequests: 1 } },
    { new: true, upsert: false }
  );

  if (!res) {
    const current = await AiUsage.findOne({ owner: userId, dateKey });
    if (current) {
      if (current.totalTokens >= DAILY_TOKEN_LIMIT) {
        throw new ApiError(429, 'Daily token limit reached. Please try again tomorrow.');
      }
      if (current.analysisRequests >= DAILY_ANALYSIS_LIMIT) {
        throw new ApiError(429, 'Daily analysis limit reached. Please try again tomorrow.');
      }
    }
    // No record exists yet, safely insert and reserve
    await AiUsage.findOneAndUpdate(
      { owner: userId, dateKey },
      { $inc: { analysisRequests: 1 } },
      { upsert: true, new: true }
    );
  }
};

/**
 * Check limits and reserve one follow-up request atomically.
 */
const checkAndReserveFollowUpUsage = async (userId) => {
  const dateKey = getUtcDateKey();

  const res = await AiUsage.findOneAndUpdate(
    {
      owner: userId,
      dateKey,
      followUpRequests: { $lt: DAILY_FOLLOWUP_LIMIT },
      totalTokens: { $lt: DAILY_TOKEN_LIMIT },
    },
    { $inc: { followUpRequests: 1 } },
    { new: true, upsert: false }
  );

  if (!res) {
    const current = await AiUsage.findOne({ owner: userId, dateKey });
    if (current) {
      if (current.totalTokens >= DAILY_TOKEN_LIMIT) {
        throw new ApiError(429, 'Daily token limit reached. Please try again tomorrow.');
      }
      if (current.followUpRequests >= DAILY_FOLLOWUP_LIMIT) {
        throw new ApiError(429, 'Daily follow-up limit reached. Please try again tomorrow.');
      }
    }
    // No record exists yet, safely insert and reserve
    await AiUsage.findOneAndUpdate(
      { owner: userId, dateKey },
      { $inc: { followUpRequests: 1 } },
      { upsert: true, new: true }
    );
  }
};

/**
 * Record token count metrics inside the current day key.
 */
const recordTokenUsage = async (userId, usage) => {
  const dateKey = getUtcDateKey();
  const inputTokens = Math.max(0, usage?.inputTokens || 0);
  const outputTokens = Math.max(0, usage?.outputTokens || 0);
  const totalTokens = Math.max(0, usage?.totalTokens || 0);

  await AiUsage.findOneAndUpdate(
    { owner: userId, dateKey },
    { $inc: { inputTokens, outputTokens, totalTokens } },
    { upsert: true, new: true }
  );
};

/**
 * Release reserved analysis request count upon pre-processing setup/validation failure.
 * Comment: Provider capacity was NOT consumed, safe to refund.
 */
const releaseReservedAnalysisUsage = async (userId) => {
  const dateKey = getUtcDateKey();
  await AiUsage.updateOne(
    { owner: userId, dateKey, analysisRequests: { $gt: 0 } },
    { $inc: { analysisRequests: -1 } }
  );
};

/**
 * Release reserved follow-up request count upon pre-processing setup/validation failure.
 * Comment: Provider capacity was NOT consumed, safe to refund.
 */
const releaseReservedFollowUpUsage = async (userId) => {
  const dateKey = getUtcDateKey();
  await AiUsage.updateOne(
    { owner: userId, dateKey, followUpRequests: { $gt: 0 } },
    { $inc: { followUpRequests: -1 } }
  );
};

/**
 * Retrieve UTC-day usage statistics and limit properties.
 */
const getUserUsageSummary = async (userId) => {
  const dateKey = getUtcDateKey();
  let record = await AiUsage.findOne({ owner: userId, dateKey });

  if (!record) {
    record = {
      analysisRequests: 0,
      followUpRequests: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };
  }

  return {
    dateKey,
    analysisRequests: record.analysisRequests,
    followUpRequests: record.followUpRequests,
    inputTokens: record.inputTokens,
    outputTokens: record.outputTokens,
    totalTokens: record.totalTokens,
    limits: {
      analysisRequests: DAILY_ANALYSIS_LIMIT,
      followUpRequests: DAILY_FOLLOWUP_LIMIT,
      totalTokens: DAILY_TOKEN_LIMIT,
    },
    remaining: {
      analysisRequests: Math.max(0, DAILY_ANALYSIS_LIMIT - record.analysisRequests),
      followUpRequests: Math.max(0, DAILY_FOLLOWUP_LIMIT - record.followUpRequests),
      totalTokens: Math.max(0, DAILY_TOKEN_LIMIT - record.totalTokens),
    },
  };
};

export {
  getUtcDateKey,
  checkAndReserveAnalysisUsage,
  checkAndReserveFollowUpUsage,
  recordTokenUsage,
  releaseReservedAnalysisUsage,
  releaseReservedFollowUpUsage,
  getUserUsageSummary,
};
