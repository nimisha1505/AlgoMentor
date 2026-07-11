import { ApiError } from '../utils/ApiError.js';

/**
 * Express middleware that validates the request body against a Zod schema.
 * Replaces req.body with parsed/transformed data on success, or forwards an ApiError on failure.
 */
const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Map Zod errors to a flat array of { field, message }
      const formattedErrors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return next(new ApiError(400, 'Validation failed', formattedErrors));
    }

    // Replace request body with parsed and transformed Zod output
    req.body = result.data;
    next();
  };
};

export { validate };
