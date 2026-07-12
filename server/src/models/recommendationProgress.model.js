import mongoose from 'mongoose';

const recommendationProgressSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recommendationKey: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    pattern: {
      type: String,
      required: true,
    },
    topic: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['notStarted', 'attempted', 'solved', 'revised'],
      default: 'notStarted',
    },
    feedback: {
      type: String,
      enum: ['none', 'relevant', 'notRelevant', 'tooEasy', 'tooDifficult', 'alreadySolved'],
      default: 'none',
    },
    linkedProblem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      default: null,
    },
    lastInteractedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for recommendation keys per owner
recommendationProgressSchema.index({ owner: 1, recommendationKey: 1 }, { unique: true });

const RecommendationProgress = mongoose.model(
  'RecommendationProgress',
  recommendationProgressSchema
);

export { RecommendationProgress };
export default RecommendationProgress;
