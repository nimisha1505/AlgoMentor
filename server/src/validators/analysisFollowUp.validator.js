import { z } from 'zod';

const createAnalysisFollowUpSchema = z
  .object({
    question: z
      .string({
        error: (issue) => {
          if (issue.input === undefined) return 'Question text is required';
          return 'Question must be a string';
        },
      })
      .trim()
      .min(3, 'Question must be at least 3 characters')
      .max(2000, 'Question cannot exceed 2000 characters'),
    mode: z
      .enum(['explain', 'hint', 'improve', 'edgeCase', 'interview'])
      .default('explain')
      .optional(),
  })
  .strict();

export { createAnalysisFollowUpSchema };
