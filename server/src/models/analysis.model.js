import mongoose from 'mongoose';

// Supported analysis section constants
const SECTIONS = {
  problemExplanation: 'problemExplanation',
  inputOutput: 'inputOutput',
  exampleExplanation: 'exampleExplanation',
  constraints: 'constraints',
  edgeCases: 'edgeCases',
  missingEdgeCases: 'missingEdgeCases',
  pattern: 'pattern',
  hints: 'hints',
  pseudocode: 'pseudocode',
  userCodeReview: 'userCodeReview',
  approaches: 'approaches',
  approachImprovement: 'approachImprovement',
  approachExplanations: 'approachExplanations',
  codes: 'codes',
  complexities: 'complexities',
  dryRun: 'dryRun',
  comparison: 'comparison',
  interviewExplanation: 'interviewExplanation',
};

const SECTION_VALUES = Object.values(SECTIONS);

// Schema for examples snapshot
const exampleSnapshotSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      required: true,
    },
    output: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
      default: '',
    },
  },
  {
    _id: false,
  }
);

// Schema for problem input snapshot
const inputSnapshotSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    problemStatement: {
      type: String,
      required: true,
    },
    constraints: {
      type: [String],
      default: [],
    },
    examples: {
      type: [exampleSnapshotSchema],
      default: [],
    },
    language: {
      type: String,
      enum: ['cpp', 'java', 'python', 'javascript', 'c', 'other'],
      required: true,
    },
    code: {
      type: String,
      default: '',
    },
  },
  {
    _id: false,
  }
);

// Schema for API usage token metrics
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

// Schema for AI Analysis record
const analysisSchema = new mongoose.Schema(
  {
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    requestedSections: {
      type: [
        {
          type: String,
          enum: SECTION_VALUES,
        },
      ],
      required: true,
      validate: [
        (val) => val.length > 0,
        'At least one requested section is required',
      ],
    },
    inputSnapshot: {
      type: inputSnapshotSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    errorMessage: {
      type: String,
      trim: true,
      default: '',
    },
    provider: {
      type: String,
      trim: true,
      default: 'gemini',
    },
    modelName: {
      type: String,
      trim: true,
      default: '',
    },
    promptVersion: {
      type: String,
      trim: true,
      default: 'v1',
    },
    usage: {
      type: usageSchema,
      default: {},
    },
    processingStartedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
analysisSchema.index({ owner: 1, createdAt: -1 });
analysisSchema.index({ problem: 1, createdAt: -1 });

export const Analysis = mongoose.model('Analysis', analysisSchema);

export { SECTIONS, SECTION_VALUES };
