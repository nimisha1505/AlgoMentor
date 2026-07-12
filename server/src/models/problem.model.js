import mongoose from 'mongoose';

// Schema for examples subdocuments
const exampleSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      required: [true, 'Example input is required'],
      trim: true,
      maxlength: [3000, 'Example input cannot exceed 3000 characters'],
    },
    output: {
      type: String,
      required: [true, 'Example output is required'],
      trim: true,
      maxlength: [3000, 'Example output cannot exceed 3000 characters'],
    },
    explanation: {
      type: String,
      trim: true,
      default: '',
      maxlength: [5000, 'Example explanation cannot exceed 5000 characters'],
    },
  },
  {
    _id: false, // Disable automatic _id generation for individual examples
  }
);

// Schema for DSA problems
const problemSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Problem owner is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Problem title is required'],
      trim: true,
      minlength: [3, 'Problem title must be at least 3 characters long'],
      maxlength: [120, 'Problem title cannot exceed 120 characters'],
    },
    problemStatement: {
      type: String,
      required: [true, 'Problem statement is required'],
      trim: true,
      minlength: [10, 'Problem statement must be at least 10 characters long'],
      maxlength: [20000, 'Problem statement cannot exceed 20000 characters'],
    },
    constraints: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: [500, 'Constraint text cannot exceed 500 characters'],
        },
      ],
      default: [],
    },
    examples: {
      type: [exampleSchema],
      default: [],
    },
    language: {
      type: String,
      enum: ['cpp', 'java', 'python', 'javascript', 'c', 'other'],
      default: 'cpp',
    },
    code: {
      type: String,
      default: '',
      maxlength: [30000, 'User code snippet cannot exceed 30000 characters'],
    },
    requestedSections: {
      type: [
        {
          type: String,
          enum: [
            'problemExplanation',
            'inputOutput',
            'exampleExplanation',
            'constraints',
            'edgeCases',
            'missingEdgeCases',
            'pattern',
            'hints',
            'pseudocode',
            'userCodeReview',
            'approaches',
            'approachImprovement',
            'approachExplanations',
            'codes',
            'complexities',
            'dryRun',
            'comparison',
            'interviewExplanation',
          ],
        },
      ],
      default: ['problemExplanation', 'exampleExplanation', 'hints'],
    },
    status: {
      type: String,
      enum: ['draft', 'queued', 'processing', 'completed', 'failed'],
      default: 'draft',
      index: true,
    },
    topics: {
      type: [
        {
          type: String,
          enum: [
            'arrays',
            'strings',
            'hashing',
            'linkedList',
            'stack',
            'queue',
            'binarySearch',
            'recursion',
            'backtracking',
            'trees',
            'bst',
            'heap',
            'graph',
            'dynamicProgramming',
            'greedy',
            'slidingWindow',
            'twoPointers',
            'prefixSum',
            'bitManipulation',
            'mathematics',
            'other',
          ],
        },
      ],
      default: [],
    },
    patterns: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: [100, 'Pattern name cannot exceed 100 characters'],
        },
      ],
      default: [],
      validate: [
        (val) => val.length <= 20,
        'Cannot exceed 20 pattern tags',
      ],
    },
    confidence: {
      type: String,
      enum: ['weak', 'learning', 'confident', 'mastered'],
      default: 'learning',
      index: true,
    },
    isBookmarked: {
      type: Boolean,
      default: false,
      index: true,
    },
    studentNotes: {
      type: String,
      trim: true,
      maxlength: [5000, 'Student notes cannot exceed 5000 characters'],
      default: '',
    },
    nextRevisionAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastPractisedAt: {
      type: Date,
      default: null,
    },
    practiceCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    source: {
      type: String,
      enum: ['leetcode', 'gfg', 'code360', 'codeforces', 'custom'],
      default: 'custom',
      index: true,
    },
    sourceUrl: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    externalProblemId: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'unknown'],
      default: 'unknown',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
problemSchema.index({ owner: 1, createdAt: -1 });
problemSchema.index({ owner: 1, confidence: 1 });
problemSchema.index({ owner: 1, isBookmarked: 1 });
problemSchema.index({ owner: 1, nextRevisionAt: 1 });
problemSchema.index({ owner: 1, topics: 1 });
problemSchema.index({ owner: 1, source: 1, externalProblemId: 1 });

const Problem = mongoose.model('Problem', problemSchema);

export { Problem };

