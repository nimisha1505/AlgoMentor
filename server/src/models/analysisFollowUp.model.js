import mongoose from 'mongoose';

const usageSchema = new mongoose.Schema(
  {
    inputTokens: {
      type: Number,
      min: 0,
      default: 0,
    },
    outputTokens: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalTokens: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const analysisFollowUpSchema = new mongoose.Schema(
  {
    analysis: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Analysis',
      required: [true, 'Analysis reference is required'],
      index: true,
    },
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: [true, 'Problem reference is required'],
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner reference is required'],
      index: true,
    },
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
      maxlength: [2000, 'Question cannot exceed 2000 characters'],
    },
    mode: {
      type: String,
      enum: ['explain', 'hint', 'improve', 'edgeCase', 'interview'],
      default: 'explain',
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
      maxlength: [15000, 'Answer cannot exceed 15000 characters'],
    },
    provider: {
      type: String,
      default: 'gemini',
    },
    modelName: {
      type: String,
      default: '',
    },
    usage: {
      type: usageSchema,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

analysisFollowUpSchema.index({ analysis: 1, createdAt: 1 });

const AnalysisFollowUp = mongoose.model('AnalysisFollowUp', analysisFollowUpSchema);

export { AnalysisFollowUp };
export default AnalysisFollowUp;
