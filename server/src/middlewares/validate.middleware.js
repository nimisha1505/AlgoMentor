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

/**
 * Express middleware that validates the request query parameters against a Zod schema.
 * Stores parsed/transformed data in req.validatedQuery on success, or forwards an ApiError on failure.
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      // Map Zod errors to a flat array of { field, message }
      const formattedErrors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return next(new ApiError(400, 'Validation failed', formattedErrors));
    }

    // Store parsed and transformed query parameters in req.validatedQuery
    req.validatedQuery = result.data;
    next();
  };
};

/**
 * Express middleware that validates the request path parameters against a Zod schema.
 * Stores parsed/transformed data in req.validatedParams on success, or forwards an ApiError on failure.
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      // Map Zod errors to a flat array of { field, message }
      const formattedErrors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return next(new ApiError(400, 'Validation failed', formattedErrors));
    }

    // Store parsed and transformed parameters in req.validatedParams
    req.validatedParams = result.data;
    next();
  };
};

export { validate, validateQuery, validateParams };
