import { z } from 'zod';

// Schema for validating analysis request body inputs
const startAnalysisSchema = z
  .object({
    force: z.boolean({
      invalid_type_error: 'Force must be a boolean',
    }).default(false),
  })
  .strict();

export { startAnalysisSchema };
