import { z } from 'zod';

// Schema for validating user profile update inputs
const updateProfileSchema = z
  .object({
    fullName: z
      .string({
        error: () => 'Full name must be a string',
      })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(60, 'Full name cannot exceed 60 characters')
      .optional(),
    username: z
      .string({
        error: () => 'Username must be a string',
      })
      .trim()
      .toLowerCase()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers, and underscores'
      )
      .optional(),
    bio: z
      .string({
        error: () => 'Bio must be a string',
      })
      .trim()
      .max(250, 'Bio cannot exceed 250 characters')
      .optional(),
    avatarUrl: z
      .string({
        error: () => 'Avatar URL must be a string',
      })
      .trim()
      .optional()
      .refine(
        (val) =>
          val === undefined ||
          val === '' ||
          z.string().url().safeParse(val).success,
        {
          message: 'Avatar URL must be a valid URL',
        }
      ),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).some((key) => data[key] !== undefined),
    {
      message: 'At least one field must be provided for update',
    }
  );

export { updateProfileSchema };
