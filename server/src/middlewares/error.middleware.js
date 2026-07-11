/**
 * Global error-handling middleware for Express.
 * Formats API errors and standard errors into a consistent JSON response.
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const errors = err.errors || [];

  const response = {
    success: false,
    statusCode,
    message,
    errors,
  };

  // Expose stack trace in development env only
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export { errorHandler };
