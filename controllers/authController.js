const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateToken } = require('../utils/token');

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists.', 'DUPLICATE_EMAIL');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Only allow self-registration as 'guest' unless an authenticated admin is creating staff.
  const finalRole = req.user && req.user.role === 'admin' ? role || 'guest' : 'guest';

  const user = await User.create({ name, email, passwordHash, phone, role: finalRole });

  const token = generateToken(user);

  res.status(201).json({
    success: true,
    message: 'Record created successfully',
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  const token = generateToken(user);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    },
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found.', 'NOT_FOUND');
  }
  res.status(200).json({ success: true, message: 'OK', data: user });
});

module.exports = { register, login, getMe };
