import { z } from 'zod';

const updatePreferencesSchema = z
  .object({
    preferredLanguage: z.enum(['cpp', 'java', 'javascript', 'python']).optional(),
    currentLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    dailyPracticeGoal: z
      .number({ error: () => 'Goal must be a number' })
      .int('Goal must be an integer')
      .min(1, 'Daily practice goal must be at least 1')
      .max(20, 'Daily practice goal cannot exceed 20')
      .optional(),
    explanationDepth: z.enum(['concise', 'balanced', 'detailed']).optional(),
    targetCompanies: z
      .array(
        z
          .string()
          .trim()
          .max(100, 'Company name cannot exceed 100 characters')
      )
      .max(20, 'Target companies list cannot exceed 20 companies')
      .refine(
        (arr) => {
          const normalized = arr.map((s) => s.toLowerCase().trim());
          return new Set(normalized).size === arr.length;
        },
        {
          message: 'Target companies must be unique normalized values',
        }
      )
      .optional(),
    preferredDifficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional(),
  })
  .strict();

export { updatePreferencesSchema };
export default updatePreferencesSchema;
