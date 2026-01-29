const jwt = require('jsonwebtoken');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Admin-only route protection middleware
 * Completely separate from learner/mentor authentication
 * Ensures admin routes are inaccessible to non-admin users
 */
const adminProtect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Admin authentication required', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new AppError('Admin account no longer exists', 401));
    }

    // Strict admin role check - non-admin users cannot access admin routes
    if (user.role !== 'admin') {
      return next(new AppError('Access denied. Admin privileges required.', 403));
    }

    // Attach admin user to request
    req.admin = user;

    // Store request metadata for audit logging
    req.adminMeta = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || 'Unknown',
    };

    next();
  } catch (error) {
    return next(new AppError('Invalid or expired admin token', 401));
  }
});

module.exports = { adminProtect };
