import { z } from 'zod';

const analysisComparisonQuerySchema = z
  .object({
    firstAnalysisId: z
      .string({ error: () => 'First Analysis ID is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid First Analysis ID'),
    secondAnalysisId: z
      .string({ error: () => 'Second Analysis ID is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Second Analysis ID'),
  })
  .strict()
  .refine((data) => data.firstAnalysisId !== data.secondAnalysisId, {
    message: 'First and second Analysis IDs must be different',
    path: ['secondAnalysisId'],
  });

export { analysisComparisonQuerySchema };
