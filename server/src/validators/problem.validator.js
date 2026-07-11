import { z } from 'zod';

// Schema for validating DSA problem creation requests
const createProblemSchema = z
  .object({
    title: z
      .string({
        error: (issue) => {
          if (issue.input === undefined) return 'Problem title is required';
          return 'Problem title must be a string';
        },
      })
      .trim()
      .min(3, 'Problem title must be at least 3 characters')
      .max(120, 'Problem title cannot exceed 120 characters'),
    problemStatement: z
      .string({
        error: (issue) => {
          if (issue.input === undefined) return 'Problem statement is required';
          return 'Problem statement must be a string';
        },
      })
      .trim()
      .min(10, 'Problem statement must be at least 10 characters')
      .max(20000, 'Problem statement cannot exceed 20000 characters'),
    constraints: z
      .array(
        z
          .string({ error: () => 'Constraint must be a string' })
          .trim()
          .max(500, 'Constraint text cannot exceed 500 characters')
      )
      .max(50, 'Cannot exceed 50 constraints')
      .default([]),
    examples: z
      .array(
        z
          .object({
            input: z
              .string({ error: () => 'Input must be a string' })
              .trim()
              .min(1, 'Example input must not be empty')
              .max(3000, 'Example input cannot exceed 3000 characters'),
            output: z
              .string({ error: () => 'Output must be a string' })
              .trim()
              .min(1, 'Example output must not be empty')
              .max(3000, 'Example output cannot exceed 3000 characters'),
            explanation: z
              .string({ error: () => 'Explanation must be a string' })
              .trim()
              .max(5000, 'Example explanation cannot exceed 5000 characters')
              .default('')
              .optional(),
          })
          .strict()
      )
      .max(20, 'Cannot exceed 20 examples')
      .default([]),
    language: z
      .enum(['cpp', 'java', 'python', 'javascript', 'c', 'other'])
      .default('cpp'),
    code: z
      .string({ error: () => 'Code must be a string' })
      .max(30000, 'User code snippet cannot exceed 30000 characters')
      .default(''),
    requestedSections: z
      .array(
        z.enum([
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
        ])
      )
      .min(1, 'At least one requested section is required')
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'Duplicate requested sections are not allowed',
      })
      .default(['problemExplanation', 'exampleExplanation', 'hints']),
  })
  .strict()
  .refine(
    (data) => {
      if (
        data.requestedSections &&
        data.requestedSections.includes('userCodeReview')
      ) {
        return data.code !== undefined && data.code.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Code is required when user code review is requested',
      path: ['code'],
    }
  );

export { createProblemSchema };

// Schema for validating DSA problem list query parameters
const problemListQuerySchema = z
  .object({
    page: z.coerce
      .number({
        error: () => 'Page must be a number',
      })
      .int('Page must be an integer')
      .positive('Page must be a positive integer')
      .default(1),
    limit: z.coerce
      .number({
        error: () => 'Limit must be a number',
      })
      .int('Limit must be an integer')
      .positive('Limit must be a positive integer')
      .max(50, 'Limit cannot exceed 50')
      .default(10),
    status: z
      .enum(['draft', 'queued', 'processing', 'completed', 'failed'])
      .optional(),
    language: z
      .enum(['cpp', 'java', 'python', 'javascript', 'c', 'other'])
      .optional(),
    search: z
      .string({
        error: () => 'Search must be a string',
      })
      .trim()
      .min(1, 'Search query must be at least 1 character')
      .max(100, 'Search query cannot exceed 100 characters')
      .optional(),
  })
  .strict();

export { problemListQuerySchema };
