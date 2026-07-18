import { z } from 'zod';

// Schema for validating analysis request body inputs
const startAnalysisSchema = z
  .object({
    force: z
      .boolean({
        error: () => 'Force must be a boolean',
      })
      .default(false),
  })
  .strict();

export { startAnalysisSchema };

// Schema for validating analysis ID path param
const analysisIdParamSchema = z
  .object({
    analysisId: z
      .string({
        error: () => 'Invalid analysis ID',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid analysis ID'),
  })
  .strict();

// Schema for validating paginated analysis list query parameters
const analysisListQuerySchema = z
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
      .enum(['queued', 'processing', 'completed', 'failed'])
      .optional(),
    sort: z.enum(['newest', 'oldest']).default('newest'),
  })
  .strict();

const approachParamsSchema = z
  .object({
    analysisId: z
      .string({
        error: () => 'Invalid analysis ID',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid analysis ID'),
    approachIndex: z.coerce
      .number({
        error: () => 'Approach index must be a number',
      })
      .int('Approach index must be an integer')
      .nonnegative('Approach index cannot be negative'),
  })
  .strict();

export { analysisIdParamSchema, analysisListQuerySchema, approachParamsSchema };
