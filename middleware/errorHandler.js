const ApiError = require('../utils/ApiError');

// 404 handler for unmatched routes.
const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
};

// Centralized error handler: converts any thrown error (ApiError, Mongoose
// errors, or unexpected exceptions) into a clean, consistent JSON response.
// This is what stops an unhandled rejection/thrown error from crashing the server.
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 404;
    message = `Resource not found for id: ${err.value}`;
    errorCode = 'NOT_FOUND';
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate value for field: ${field}`;
    errorCode = 'DUPLICATE_KEY';
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join('; ');
    errorCode = 'VALIDATION_ERROR';
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorCode,
  });
};

module.exports = { notFound, errorHandler };
