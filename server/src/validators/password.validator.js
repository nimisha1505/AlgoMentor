import { z } from 'zod';

// Schema for validating password change requests
const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({
        error: () => 'Current password is required',
      })
      .min(1, 'Current password must not be empty'),
    newPassword: z
      .string({
        error: () => 'New password must be a string',
      })
      .min(8, 'New password must be at least 8 characters')
      .max(72, 'New password cannot exceed 72 characters'),
    confirmPassword: z
      .string({
        error: () => 'Confirm password is required',
      })
      .min(1, 'Confirm password must not be empty'),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirm password do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export { changePasswordSchema };
