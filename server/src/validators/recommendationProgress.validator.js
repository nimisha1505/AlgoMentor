import { z } from 'zod';

const updateRecommendationProgressSchema = z
  .object({
    status: z.enum(['notStarted', 'attempted', 'solved', 'revised']).optional(),
    feedback: z
      .enum(['none', 'relevant', 'notRelevant', 'tooEasy', 'tooDifficult', 'alreadySolved'])
      .optional(),
    linkedProblemId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid linked problem ID')
      .optional(),
    title: z.string().trim().optional(),
    pattern: z.string().trim().optional(),
    topic: z.string().trim().optional(),
  })
  .strict()
  .refine(
    (data) => {
      return (
        data.status !== undefined ||
        data.feedback !== undefined ||
        data.linkedProblemId !== undefined
      );
    },
    {
      message: 'At least one field must be provided (status, feedback, or linkedProblemId)',
    }
  );

export { updateRecommendationProgressSchema };
export default updateRecommendationProgressSchema;
