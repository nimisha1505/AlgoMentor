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
            'pattern',
            'hints',
            'pseudocode',
            'userCodeReview',
            'approaches',
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
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user problems sorted by creation time
problemSchema.index({ owner: 1, createdAt: -1 });

const Problem = mongoose.model('Problem', problemSchema);

export { Problem };
