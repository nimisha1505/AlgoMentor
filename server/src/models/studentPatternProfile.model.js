import mongoose from 'mongoose';

const studentPatternProfileSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner reference is required'],
      index: true,
    },
    patternKey: {
      type: String,
      required: [true, 'Pattern key is required'],
      trim: true,
      lowercase: true,
      maxlength: [100, 'Pattern key cannot exceed 100 characters'],
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters'],
    },
    topic: {
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
      default: 'other',
    },
    attemptCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    successfulAttempts: {
      type: Number,
      min: 0,
      default: 0,
    },
    failedAttempts: {
      type: Number,
      min: 0,
      default: 0,
    },
    bruteForceDependenceCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    missedEdgeCaseCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    codeIssueCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 40,
    },
    importanceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    lastPractisedAt: {
      type: Date,
      default: null,
    },
    nextRevisionAt: {
      type: Date,
      default: null,
    },
    lastProblem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      default: null,
    },
    lastAnalysis: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Analysis',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index for user's pattern profiles
studentPatternProfileSchema.index({ owner: 1, patternKey: 1 }, { unique: true });

const StudentPatternProfile = mongoose.model(
  'StudentPatternProfile',
  studentPatternProfileSchema
);

export { StudentPatternProfile };
export default StudentPatternProfile;
