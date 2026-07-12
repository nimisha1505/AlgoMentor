import { Analysis } from '../models/analysis.model.js';
import { AnalysisFollowUp } from '../models/analysisFollowUp.model.js';
import { generateAnalysisFollowUp } from '../services/analysisFollowUp.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import {
  checkAndReserveFollowUpUsage,
  recordTokenUsage,
  releaseReservedFollowUpUsage,
} from '../services/aiUsage.service.js';

/**
 * Creates a new student follow-up question and generates an AI answer.
 */
const createAnalysisFollowUp = asyncHandler(async (req, res) => {
  const { analysisId } = req.validatedParams;
  const { question, mode } = req.body;

  const analysis = await Analysis.findOne({
    _id: analysisId,
    owner: req.user._id,
  });

  if (!analysis || analysis.status !== 'completed') {
    throw new ApiError(404, 'Completed analysis not found');
  }

  let geminiRequestStarted = false;
  try {
    // Reserve daily follow-up limit
    await checkAndReserveFollowUpUsage(req.user._id);
    geminiRequestStarted = true;

    // Call Gemini follow-up service
    const { answer, modelName, usage } = await generateAnalysisFollowUp({
      analysis,
      question,
      mode,
    });

    // Record token counts on success
    await recordTokenUsage(req.user._id, usage);

    // Save new follow-up attempt in database
    const followUp = await AnalysisFollowUp.create({
      analysis: analysis._id,
      problem: analysis.problem,
      owner: req.user._id,
      question,
      mode,
      answer,
      modelName,
      usage,
    });

    const followUpObj = followUp.toObject();
    delete followUpObj.owner;
    delete followUpObj.__v;

    return res
      .status(201)
      .json(new ApiResponse(201, { followUp: followUpObj }, 'Follow-up answered successfully'));
  } catch (error) {
    if (!geminiRequestStarted) {
      try {
        await releaseReservedFollowUpUsage(req.user._id);
      } catch (releaseErr) {
        console.error('Failed to refund reserved follow-up quota:', releaseErr);
      }
    }
    throw error;
  }
});

/**
 * Retrieve list of all previous follow-up questions for a completed analysis.
 */
const getAnalysisFollowUps = asyncHandler(async (req, res) => {
  const { analysisId } = req.validatedParams;

  // Verify ownership of the analysis
  const analysis = await Analysis.findOne({
    _id: analysisId,
    owner: req.user._id,
  });

  if (!analysis) {
    throw new ApiError(404, 'Analysis not found');
  }

  const followUps = await AnalysisFollowUp.find({
    analysis: analysisId,
    owner: req.user._id,
  })
    .sort({ createdAt: 1 })
    .select('-owner -__v');

  return res
    .status(200)
    .json(new ApiResponse(200, { followUps }, 'Follow-ups fetched successfully'));
});

export { createAnalysisFollowUp, getAnalysisFollowUps };
