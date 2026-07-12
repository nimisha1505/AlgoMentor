import { z } from 'zod';

const recoverStuckAnalysesSchema = z
  .object({
    queuedOlderThanMinutes: z.coerce
      .number()
      .int('Minutes must be an integer')
      .min(1, 'Minutes must be at least 1')
      .max(1440, 'Minutes cannot exceed 1440')
      .default(15)
      .optional(),
    processingOlderThanMinutes: z.coerce
      .number()
      .int('Minutes must be an integer')
      .min(1, 'Minutes must be at least 1')
      .max(1440, 'Minutes cannot exceed 1440')
      .default(20)
      .optional(),
    limit: z.coerce
      .number()
      .int('Limit must be an integer')
      .min(1, 'Limit must be at least 1')
      .max(500, 'Limit cannot exceed 500')
      .default(100)
      .optional(),
  })
  .strict();

export { recoverStuckAnalysesSchema };
