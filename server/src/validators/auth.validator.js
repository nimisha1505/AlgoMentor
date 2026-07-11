import { z } from 'zod';

// Schema for validating user registration inputs
const registerSchema = z
  .object({
    fullName: z
      .string({
        error: (issue) => {
          if (issue.input === undefined) return 'Full name is required';
          return 'Full name must be a string';
        },
      })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(60, 'Full name cannot exceed 60 characters'),
    username: z
      .string({
        error: (issue) => {
          if (issue.input === undefined) return 'Username is required';
          return 'Username must be a string';
        },
      })
      .trim()
      .toLowerCase()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers, and underscores'
      ),
    email: z
      .string({
        error: (issue) => {
          if (issue.input === undefined) return 'Email is required';
          return 'Email must be a string';
        },
      })
      .trim()
      .toLowerCase()
      .email('Invalid email format'),
    password: z
      .string({
        error: (issue) => {
          if (issue.input === undefined) return 'Password is required';
          return 'Password must be a string';
        },
      })
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password cannot exceed 72 characters'),
  })
  .strict();

// Schema for validating user login inputs
const loginSchema = z
  .object({
    email: z
      .string({
        error: (issue) => {
          if (issue.input === undefined) return 'Email is required';
          return 'Email must be a string';
        },
      })
      .trim()
      .toLowerCase()
      .email('Invalid email format'),
    password: z
      .string({
        error: (issue) => {
          if (issue.input === undefined) return 'Password is required';
          return 'Password must be a string';
        },
      })
      .min(1, 'Password must not be empty'),
  })
  .strict();

export { registerSchema, loginSchema };
