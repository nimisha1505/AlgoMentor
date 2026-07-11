/**
 * A higher-order function that wraps asynchronous express route handlers
 * and catches any rejected promises, forwarding them to the next error middleware.
 */
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
