import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);

// Schema for individual problem solving approach details
const approachSchema = z
  .object({
    name: nonEmptyString,
    category: z.enum(['bruteForce', 'better', 'optimal', 'alternative']),
    intuition: nonEmptyString,
    steps: z.array(nonEmptyString).min(1),
    timeComplexity: nonEmptyString,
    spaceComplexity: nonEmptyString,
    code: z.string().default(''),
  })
  .strict();

// Schema for user code review feedback
const userCodeReviewSchema = z
  .object({
    summary: nonEmptyString,
    isCorrect: z.boolean(),
    strengths: z.array(nonEmptyString).default([]),
    bugs: z.array(nonEmptyString).default([]),
    missedEdgeCases: z.array(nonEmptyString).default([]),
    timeComplexity: nonEmptyString,
    spaceComplexity: nonEmptyString,
    improvements: z.array(nonEmptyString).default([]),
    correctedCode: z.string().default(''),
  })
  .strict();

// Schema for comparison matrix rows
const comparisonRowSchema = z
  .object({
    approach: nonEmptyString,
    timeComplexity: nonEmptyString,
    spaceComplexity: nonEmptyString,
    advantages: z.array(nonEmptyString),
    disadvantages: z.array(nonEmptyString),
    interviewSuitability: nonEmptyString,
  })
  .strict();

// Complete, strict validation schema for AI analysis results
const analysisResultSchema = z
  .object({
    problemExplanation: nonEmptyString.optional(),
    inputOutput: nonEmptyString.optional(),
    exampleExplanation: z
      .array(
        z
          .object({
            exampleNumber: z.number().int().positive(),
            explanation: nonEmptyString,
          })
          .strict()
      )
      .optional(),
    constraints: z
      .array(
        z
          .object({
            constraint: nonEmptyString,
            implication: nonEmptyString,
          })
          .strict()
      )
      .optional(),
    edgeCases: z
      .array(
        z
          .object({
            case: nonEmptyString,
            reason: nonEmptyString,
          })
          .strict()
      )
      .optional(),
    pattern: z
      .object({
        name: nonEmptyString,
        clues: z.array(nonEmptyString).min(1),
        reason: nonEmptyString,
      })
      .strict()
      .optional(),
    hints: z
      .array(
        z
          .object({
            level: z.number().int().positive(),
            hint: nonEmptyString,
          })
          .strict()
      )
      .min(1)
      .optional(),
    pseudocode: z.array(nonEmptyString).min(1).optional(),
    userCodeReview: userCodeReviewSchema.optional(),
    approaches: z.array(approachSchema).min(1).optional(),
    approachExplanations: z
      .array(
        z
          .object({
            approach: nonEmptyString,
            explanation: nonEmptyString,
          })
          .strict()
      )
      .min(1)
      .optional(),
    codes: z
      .array(
        z
          .object({
            approach: nonEmptyString,
            language: z.enum([
              'cpp',
              'java',
              'python',
              'javascript',
              'c',
              'other',
            ]),
            code: nonEmptyString,
          })
          .strict()
      )
      .min(1)
      .optional(),
    complexities: z
      .array(
        z
          .object({
            approach: nonEmptyString,
            timeComplexity: nonEmptyString,
            timeReason: nonEmptyString,
            spaceComplexity: nonEmptyString,
            spaceReason: nonEmptyString,
          })
          .strict()
      )
      .min(1)
      .optional(),
    dryRun: z
      .object({
        approach: nonEmptyString,
        input: nonEmptyString,
        steps: z.array(nonEmptyString).min(1),
        output: nonEmptyString,
      })
      .strict()
      .optional(),
    comparison: z.array(comparisonRowSchema).min(1).optional(),
    interviewExplanation: nonEmptyString.optional(),
  })
  .strict()
  .refine(
    (data) => {
      // Require at least one section to be present
      return Object.keys(data).length > 0;
    },
    {
      message: 'At least one analysis result section is required',
    }
  );

/**
 * Parses and validates raw results from Gemini.
 * Ensures the response matches the list of requested sections exactly.
 */
const parseAnalysisResult = ({ rawResult, requestedSections }) => {
  if (!Array.isArray(requestedSections) || requestedSections.length === 0) {
    throw new Error('requestedSections must be a non-empty array');
  }

  let parsedObj;

  if (typeof rawResult === 'string') {
    try {
      parsedObj = JSON.parse(rawResult);
    } catch (e) {
      throw new Error('Gemini returned invalid JSON');
    }
  } else if (rawResult && typeof rawResult === 'object') {
    parsedObj = rawResult;
  } else {
    throw new Error('Invalid rawResult format');
  }

  // Perform schema validation
  const validation = analysisResultSchema.safeParse(parsedObj);
  if (!validation.success) {
    const errorDetails = validation.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Gemini response validation failed: ${errorDetails}`);
  }

  const resultData = validation.data;

  // Validate that all requested sections exist in output
  for (const section of requestedSections) {
    if (resultData[section] === undefined) {
      throw new Error(`Gemini response is missing requested section: ${section}`);
    }
  }

  // Validate that no unrequested sections exist in output
  const resultKeys = Object.keys(resultData);
  for (const key of resultKeys) {
    if (!requestedSections.includes(key)) {
      throw new Error(`Gemini response contains unrequested section: ${key}`);
    }
  }

  return resultData;
};

// Plain JSON Schema representation of the expected output format for Gemini SDK structured validation
const analysisResultJsonSchema = {
  type: 'object',
  properties: {
    problemExplanation: { type: 'string' },
    inputOutput: { type: 'string' },
    exampleExplanation: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          exampleNumber: { type: 'integer' },
          explanation: { type: 'string' },
        },
        required: ['exampleNumber', 'explanation'],
        additionalProperties: false,
      },
    },
    constraints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          constraint: { type: 'string' },
          implication: { type: 'string' },
        },
        required: ['constraint', 'implication'],
        additionalProperties: false,
      },
    },
    edgeCases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          case: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['case', 'reason'],
        additionalProperties: false,
      },
    },
    pattern: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        clues: {
          type: 'array',
          items: { type: 'string' },
        },
        reason: { type: 'string' },
      },
      required: ['name', 'clues', 'reason'],
      additionalProperties: false,
    },
    hints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          level: { type: 'integer' },
          hint: { type: 'string' },
        },
        required: ['level', 'hint'],
        additionalProperties: false,
      },
    },
    pseudocode: {
      type: 'array',
      items: { type: 'string' },
    },
    userCodeReview: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        isCorrect: { type: 'boolean' },
        strengths: { type: 'array', items: { type: 'string' } },
        bugs: { type: 'array', items: { type: 'string' } },
        missedEdgeCases: { type: 'array', items: { type: 'string' } },
        timeComplexity: { type: 'string' },
        spaceComplexity: { type: 'string' },
        improvements: { type: 'array', items: { type: 'string' } },
        correctedCode: { type: 'string' },
      },
      required: [
        'summary',
        'isCorrect',
        'strengths',
        'bugs',
        'missedEdgeCases',
        'timeComplexity',
        'spaceComplexity',
        'improvements',
        'correctedCode',
      ],
      additionalProperties: false,
    },
    approaches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          category: {
            type: 'string',
            enum: ['bruteForce', 'better', 'optimal', 'alternative'],
          },
          intuition: { type: 'string' },
          steps: { type: 'array', items: { type: 'string' } },
          timeComplexity: { type: 'string' },
          spaceComplexity: { type: 'string' },
          code: { type: 'string' },
        },
        required: [
          'name',
          'category',
          'intuition',
          'steps',
          'timeComplexity',
          'spaceComplexity',
        ],
        additionalProperties: false,
      },
    },
    approachExplanations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          approach: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['approach', 'explanation'],
        additionalProperties: false,
      },
    },
    codes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          approach: { type: 'string' },
          language: {
            type: 'string',
            enum: ['cpp', 'java', 'python', 'javascript', 'c', 'other'],
          },
          code: { type: 'string' },
        },
        required: ['approach', 'language', 'code'],
        additionalProperties: false,
      },
    },
    complexities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          approach: { type: 'string' },
          timeComplexity: { type: 'string' },
          timeReason: { type: 'string' },
          spaceComplexity: { type: 'string' },
          spaceReason: { type: 'string' },
        },
        required: [
          'approach',
          'timeComplexity',
          'timeReason',
          'spaceComplexity',
          'spaceReason',
        ],
        additionalProperties: false,
      },
    },
    dryRun: {
      type: 'object',
      properties: {
        approach: { type: 'string' },
        input: { type: 'string' },
        steps: { type: 'array', items: { type: 'string' } },
        output: { type: 'string' },
      },
      required: ['approach', 'input', 'steps', 'output'],
      additionalProperties: false,
    },
    comparison: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          approach: { type: 'string' },
          timeComplexity: { type: 'string' },
          spaceComplexity: { type: 'string' },
          advantages: { type: 'array', items: { type: 'string' } },
          disadvantages: { type: 'array', items: { type: 'string' } },
          interviewSuitability: { type: 'string' },
        },
        required: [
          'approach',
          'timeComplexity',
          'spaceComplexity',
          'advantages',
          'disadvantages',
          'interviewSuitability',
        ],
        additionalProperties: false,
      },
    },
    interviewExplanation: { type: 'string' },
  },
  additionalProperties: false,
};

const SUPPORTED_SECTIONS = [
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
];

/**
 * Builds a dynamic JSON schema restricting Gemini output to only the requested sections.
 * Deep-clones base property schemas to prevent unintended mutation.
 */
const buildRequestedAnalysisJsonSchema = (requestedSections) => {
  if (!Array.isArray(requestedSections) || requestedSections.length === 0) {
    throw new Error('requestedSections must be a non-empty array');
  }

  const seen = new Set();
  for (const section of requestedSections) {
    if (!SUPPORTED_SECTIONS.includes(section)) {
      throw new Error(`Unsupported analysis section: ${section}`);
    }
    if (seen.has(section)) {
      throw new Error(`Duplicate analysis section: ${section}`);
    }
    seen.add(section);
  }

  const requestedProperties = {};
  for (const section of requestedSections) {
    const baseProp = analysisResultJsonSchema.properties[section];
    if (baseProp) {
      requestedProperties[section] = JSON.parse(JSON.stringify(baseProp));
    }
  }

  return {
    type: 'object',
    properties: requestedProperties,
    required: [...requestedSections],
    additionalProperties: false,
  };
};

export {
  analysisResultSchema,
  parseAnalysisResult,
  analysisResultJsonSchema,
  buildRequestedAnalysisJsonSchema,
};
