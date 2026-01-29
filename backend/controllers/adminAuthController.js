const { User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { logAdminLogin } = require('../services/adminAuditService');

/**
 * Admin Authentication Controller
 * Completely separate from learner/mentor authentication
 * All admin authentication actions are audited
 */

// @desc    Admin login
// @route   POST /api/admin/auth/login
// @access  Public (but only admins can successfully authenticate)
const adminLogin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Find user by email
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Check if user is an admin
  if (user.role !== 'admin') {
    // Do not reveal that the user exists but is not an admin
    return next(new AppError('Invalid credentials', 401));
  }

  // Check password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Generate token
  const token = user.generateToken();

  // Log admin login
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  await logAdminLogin(user._id, ipAddress, userAgent);

  res.status(200).json({
    success: true,
    token,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// @desc    Get current admin profile
// @route   GET /api/admin/auth/me
// @access  Admin only
const getAdminProfile = asyncHandler(async (req, res, next) => {
  const admin = await User.findById(req.admin._id);

  res.status(200).json({
    success: true,
    data: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      createdAt: admin.createdAt,
    },
  });
});

module.exports = {
  adminLogin,
  getAdminProfile,
};
