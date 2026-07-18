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
    advantages: z.array(z.string()).optional(),
    disadvantages: z.array(z.string()).optional(),
    limitations: z.array(z.string()).optional(),
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
            exampleNumber: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val, 10) || 1 : val),
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
    missingEdgeCases: z
      .array(
        z
          .object({
            case: nonEmptyString,
            whyItMatters: nonEmptyString,
            howItBreaksCurrentApproach: nonEmptyString,
            testInput: z.string().default(''),
          })
          .strict()
      )
      .min(1)
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
    approachImprovement: z
      .object({
        currentStrengths: z.array(nonEmptyString).default([]),
        bottlenecks: z.array(nonEmptyString).default([]),
        unnecessaryWork: z.array(nonEmptyString).default([]),
        nextImprovement: nonEmptyString,
        improvedApproach: nonEmptyString,
        patternToLearn: nonEmptyString,
        questionsToAsk: z.array(nonEmptyString).min(1),
      })
      .strict()
      .optional(),
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
            language: z.string().default('other'),
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

const parseAnalysisResult = ({ rawResult, requestedSections }) => {
  if (!Array.isArray(requestedSections) || requestedSections.length === 0) {
    throw new Error('requestedSections must be a non-empty array');
  }

  let parsedObj;
  let nestedCandidateDetected = false;

  if (typeof rawResult === 'string') {
    let cleaned = rawResult.trim();

    // 1. Distinguish empty model response
    if (cleaned === '') {
      throw new Error('Gemini returned an empty response');
    }

    // Tolerate accidental markdown JSON fences as a fallback
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
      cleaned = cleaned.replace(/\s*```$/g, '');
      cleaned = cleaned.trim();
    }

    // Check again after stripping fences
    if (cleaned === '') {
      throw new Error('Gemini returned an empty response');
    }

    const startsLikeObject = cleaned.startsWith('{') && cleaned.endsWith('}');
    if (startsLikeObject) {
      if (/"problemExplanation"\s*:\s*"\s*\\*\{/.test(cleaned)) {
        nestedCandidateDetected = true;
      }
    }

    try {
      parsedObj = JSON.parse(cleaned);

      // Handle whole result incorrectly stringified once
      if (typeof parsedObj === 'string') {
        try {
          const secondParse = JSON.parse(parsedObj);
          if (secondParse && typeof secondParse === 'object') {
            parsedObj = secondParse;
          }
        } catch (innerErr) {
          // Keep as string
        }
      }

      // Handle whole result nested inside problemExplanation
      if (parsedObj && typeof parsedObj === 'object' && typeof parsedObj.problemExplanation === 'string') {
        const nestedStr = parsedObj.problemExplanation.trim();
        if (nestedStr.startsWith('{')) {
          nestedCandidateDetected = true;
          let recovered = null;
          try {
            recovered = JSON.parse(nestedStr);
          } catch (innerErr) {
            let braceCount = 0;
            let endBraceIdx = -1;
            for (let i = 0; i < nestedStr.length; i++) {
              if (nestedStr[i] === '{') {
                braceCount++;
              } else if (nestedStr[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  endBraceIdx = i;
                  break;
                }
              }
            }
            if (endBraceIdx !== -1) {
              try {
                recovered = JSON.parse(nestedStr.slice(0, endBraceIdx + 1));
              } catch (e2) {
                // Ignore
              }
            }
          }

          if (recovered && typeof recovered === 'object') {
            const filteredRecovered = {};
            for (const section of requestedSections) {
              if (recovered[section] !== undefined) {
                filteredRecovered[section] = recovered[section];
              }
            }
            for (const section of requestedSections) {
              if (filteredRecovered[section] === undefined) {
                throw new Error(`Gemini response is missing requested section: ${section}`);
              }
            }
            const validation = analysisResultSchema.safeParse(filteredRecovered);
            if (validation.success) {
              parsedObj = recovered;
            } else {
              const errorDetails = validation.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join(', ');
              throw new Error(`Gemini response validation failed: ${errorDetails}`);
            }
          } else {
            const first300 = cleaned.slice(0, 300).replace(/[\r\n]+/g, ' ');
            console.error(
              `Failed to parse JSON. Response length: ${cleaned.length}. Preview (first 300 chars): "${first300}". Nested JSON candidate detected: ${nestedCandidateDetected}`
            );
            throw new Error('Gemini returned invalid JSON');
          }
        }
      }
    } catch (e) {
      // Propagate missing section, validation, or explicit parse errors
      if (
        e.message.includes('missing requested section') ||
        e.message.includes('validation failed') ||
        e.message === 'Gemini returned invalid JSON'
      ) {
        throw e;
      }

      // If parsing fails, try manual recovery if it begins like an object
      let recoveredObj = null;
      if (startsLikeObject) {
        const idx = cleaned.indexOf('"problemExplanation"');
        if (idx !== -1) {
          const searchArea = cleaned.slice(idx);
          let firstBrace = searchArea.indexOf('{');
          if (firstBrace !== -1) {
            let braceCount = 0;
            let endBraceIdx = -1;
            for (let i = firstBrace; i < searchArea.length; i++) {
              if (searchArea[i] === '{') {
                braceCount++;
              } else if (searchArea[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  endBraceIdx = i;
                  break;
                }
              }
            }
            if (endBraceIdx !== -1) {
              let innerCandidate = searchArea.slice(firstBrace, endBraceIdx + 1);
              try {
                recoveredObj = JSON.parse(innerCandidate);
              } catch (err) {
                try {
                  const unescaped = innerCandidate
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, '\\')
                    .replace(/\\n/g, '\n')
                    .replace(/\\t/g, '\t');
                  recoveredObj = JSON.parse(unescaped);
                } catch (err2) {
                  // Ignore
                }
              }
            }
          }
        }
      }

      if (recoveredObj) {
        const filteredRecovered = {};
        for (const section of requestedSections) {
          if (recoveredObj[section] !== undefined) {
            filteredRecovered[section] = recoveredObj[section];
          }
        }
        for (const section of requestedSections) {
          if (filteredRecovered[section] === undefined) {
            throw new Error(`Gemini response is missing requested section: ${section}`);
          }
        }
        const validation = analysisResultSchema.safeParse(filteredRecovered);
        if (validation.success) {
          parsedObj = recoveredObj;
        } else {
          const errorDetails = validation.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join(', ');
          throw new Error(`Gemini response validation failed: ${errorDetails}`);
        }
      }

      if (!parsedObj) {
        const first300 = cleaned.slice(0, 300).replace(/[\r\n]+/g, ' ');
        console.error(
          `Failed to parse JSON. Response length: ${cleaned.length}. Preview (first 300 chars): "${first300}". Nested JSON candidate detected: ${nestedCandidateDetected}`
        );
        throw new Error('Gemini returned invalid JSON');
      }
    }
  } else if (rawResult && typeof rawResult === 'object') {
    parsedObj = rawResult;
  } else {
    throw new Error('Invalid rawResult format');
  }

  // Handle 'codes' field name fallback
  if (requestedSections.includes('codes') && parsedObj.codes === undefined) {
    const codeCandidates = parsedObj.codes || parsedObj.code || parsedObj.solutions || parsedObj.solutionCode || parsedObj.solutionCodes;
    if (Array.isArray(codeCandidates)) {
      const hasCode = codeCandidates.every(item => item && typeof item.code === 'string' && item.code.trim().length > 0);
      if (hasCode) {
        parsedObj.codes = codeCandidates;
      }
    } else if (typeof codeCandidates === 'string' && codeCandidates.trim().length > 0) {
      parsedObj.codes = [{ approach: 'Optimal', language: parsedObj.language || 'cpp', code: codeCandidates }];
    } else if (Array.isArray(parsedObj.approaches)) {
      const extracted = parsedObj.approaches
        .filter(app => app && typeof app.code === 'string' && app.code.trim().length > 0)
        .map(app => ({
          approach: app.name || 'Approach',
          language: parsedObj.language || 'cpp',
          code: app.code
        }));
      if (extracted.length > 0) {
        parsedObj.codes = extracted;
      }
    }
  }

  // Handle 'complexities' field name fallback
  if (requestedSections.includes('complexities') && parsedObj.complexities === undefined) {
    if (Array.isArray(parsedObj.approaches) && parsedObj.approaches.length > 0) {
      const allHaveComplexity = parsedObj.approaches.every(app => 
        app && 
        typeof app.timeComplexity === 'string' && app.timeComplexity.trim().length > 0 &&
        typeof app.spaceComplexity === 'string' && app.spaceComplexity.trim().length > 0
      );
      if (allHaveComplexity) {
        parsedObj.complexities = parsedObj.approaches.map(app => ({
          approach: app.name || 'Approach',
          timeComplexity: app.timeComplexity,
          timeReason: app.intuition || 'Asymptotic complexity analysis',
          spaceComplexity: app.spaceComplexity,
          spaceReason: 'Auxiliary memory requirements'
        }));
      }
    }
  }

  // Handle 'comparison' field name fallback
  if (requestedSections.includes('comparison') && parsedObj.comparison === undefined) {
    if (Array.isArray(parsedObj.approaches) && parsedObj.approaches.length > 0) {
      const canDeriveComparison = parsedObj.approaches.every(app => 
        app &&
        typeof app.name === 'string' && app.name.trim().length > 0 &&
        typeof app.timeComplexity === 'string' && app.timeComplexity.trim().length > 0 &&
        typeof app.spaceComplexity === 'string' && app.spaceComplexity.trim().length > 0 &&
        (
          (Array.isArray(app.advantages) && app.advantages.length > 0) || 
          (Array.isArray(app.disadvantages) && app.disadvantages.length > 0) ||
          (Array.isArray(app.limitations) && app.limitations.length > 0) ||
          (typeof app.limitations === 'string' && app.limitations.trim().length > 0) ||
          (typeof app.advantages === 'string' && app.advantages.trim().length > 0)
        )
      );

      if (canDeriveComparison) {
        parsedObj.comparison = parsedObj.approaches.map(app => {
          let advantages = [];
          if (Array.isArray(app.advantages)) {
            advantages = app.advantages.filter(x => typeof x === 'string' && x.trim().length > 0);
          } else if (typeof app.advantages === 'string' && app.advantages.trim()) {
            advantages = [app.advantages.trim()];
          }

          let disadvantages = [];
          if (Array.isArray(app.disadvantages)) {
            disadvantages = app.disadvantages.filter(x => typeof x === 'string' && x.trim().length > 0);
          } else if (Array.isArray(app.limitations)) {
            disadvantages = app.limitations.filter(x => typeof x === 'string' && x.trim().length > 0);
          } else if (typeof app.limitations === 'string' && app.limitations.trim()) {
            disadvantages = [app.limitations.trim()];
          } else if (typeof app.disadvantages === 'string' && app.disadvantages.trim()) {
            disadvantages = [app.disadvantages.trim()];
          }

          return {
            approach: app.name,
            timeComplexity: app.timeComplexity,
            spaceComplexity: app.spaceComplexity,
            advantages: advantages,
            disadvantages: disadvantages,
            interviewSuitability: app.category || 'Suitable'
          };
        });
      }
    }
  }

  // Whitelist filtering: keep only keys present in requestedSections
  const filteredResult = {};
  for (const section of requestedSections) {
    if (parsedObj[section] !== undefined) {
      filteredResult[section] = parsedObj[section];
    } else {
      throw new Error(`Gemini response is missing requested section: ${section}`);
    }
  }

  // Perform schema validation
  const validation = analysisResultSchema.safeParse(filteredResult);
  if (!validation.success) {
    const errorDetails = validation.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Gemini response validation failed: ${errorDetails}`);
  }

  const resultData = validation.data;

  // Validate that every requested section is present in resultData
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
    missingEdgeCases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          case: { type: 'string' },
          whyItMatters: { type: 'string' },
          howItBreaksCurrentApproach: { type: 'string' },
          testInput: { type: 'string' },
        },
        required: ['case', 'whyItMatters', 'howItBreaksCurrentApproach'],
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
    approachImprovement: {
      type: 'object',
      properties: {
        currentStrengths: { type: 'array', items: { type: 'string' } },
        bottlenecks: { type: 'array', items: { type: 'string' } },
        unnecessaryWork: { type: 'array', items: { type: 'string' } },
        nextImprovement: { type: 'string' },
        improvedApproach: { type: 'string' },
        patternToLearn: { type: 'string' },
        questionsToAsk: { type: 'array', items: { type: 'string' } },
      },
      required: [
        'currentStrengths',
        'bottlenecks',
        'unnecessaryWork',
        'nextImprovement',
        'improvedApproach',
        'patternToLearn',
        'questionsToAsk',
      ],
      additionalProperties: false,
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
];

/**
 * Builds a dynamic JSON schema restricting Gemini output to only the requested sections.
 * Deep-clones base property schemas to prevent unintended mutation.
 */
const buildRequestedAnalysisJsonSchema = (requestedSections, isCompleteMode = false) => {
  if (isCompleteMode) {
    return analysisResultJsonSchema;
  }

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
