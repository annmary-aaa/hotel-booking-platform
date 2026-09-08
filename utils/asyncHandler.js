// Wraps async route handlers so any thrown error / rejected promise
// is forwarded to Express's centralized error-handling middleware
// instead of crashing the server.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
