import mongoose from 'mongoose';

const aiUsageSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner reference is required'],
      index: true,
    },
    dateKey: {
      type: String,
      required: [true, 'Date key (YYYY-MM-DD) is required'],
    },
    analysisRequests: {
      type: Number,
      min: 0,
      default: 0,
    },
    followUpRequests: {
      type: Number,
      min: 0,
      default: 0,
    },
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
    timestamps: true,
  }
);

// Unique compound index per owner and day
aiUsageSchema.index({ owner: 1, dateKey: 1 }, { unique: true });

const AiUsage = mongoose.model('AiUsage', aiUsageSchema);

export { AiUsage };
export default AiUsage;
