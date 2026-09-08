const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the JWT and attaches the decoded payload to req.user.
// Missing/invalid/expired token -> 401 Unauthorized.
const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    throw new ApiError(401, 'Not authorized. No token provided.', 'NO_TOKEN');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, name, email }
    next();
  } catch (err) {
    throw new ApiError(401, 'Not authorized. Token invalid or expired.', 'INVALID_TOKEN');
  }
});

// Restricts a route to specific roles.
// Wrong role on an authenticated user -> 403 Forbidden.
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    throw new ApiError(
      403,
      `Access denied. Requires one of these roles: ${allowedRoles.join(', ')}`,
      'FORBIDDEN'
    );
  }
  next();
};

module.exports = { protect, authorize };
