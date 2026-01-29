const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { adminProtect } = require('../middleware/adminAuth');

// Controllers
const { adminLogin, getAdminProfile } = require('../controllers/adminAuthController');
const {
  getAllUsers,
  getUserById,
  getUserActivitySummary,
  suspendUser,
  reinstateUser,
} = require('../controllers/adminUserController');
const {
  getAllMentorships,
  getMentorshipDetails,
  adminPauseMentorship,
  adminCompleteMentorship,
} = require('../controllers/adminMentorshipController');
const {
  getPlatformStats,
  getAuditLogs,
  getRecentActivity,
} = require('../controllers/adminPlatformController');

const router = express.Router();

/**
 * Admin Routes
 * All routes under /api/admin/*
 * Completely separate namespace from learner/mentor routes
 */

// ============================================
// AUTH ROUTES - /api/admin/auth/*
// ============================================

// Admin login (public endpoint, but only admins can authenticate)
router.post(
  '/auth/login',
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  adminLogin
);

// Get admin profile (protected)
router.get('/auth/me', adminProtect, getAdminProfile);

// ============================================
// USER MODERATION ROUTES - /api/admin/users/*
// ============================================

// Get all users with pagination and filters
router.get('/users', adminProtect, getAllUsers);

// Get single user details
router.get(
  '/users/:userId',
  adminProtect,
  [param('userId').isMongoId().withMessage('Invalid user ID')],
  validate,
  getUserById
);

// Get user activity summary
router.get(
  '/users/:userId/activity',
  adminProtect,
  [param('userId').isMongoId().withMessage('Invalid user ID')],
  validate,
  getUserActivitySummary
);

// Suspend a user
router.put(
  '/users/:userId/suspend',
  adminProtect,
  [
    param('userId').isMongoId().withMessage('Invalid user ID'),
    body('reason')
      .trim()
      .notEmpty()
      .withMessage('Suspension reason is required')
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters'),
  ],
  validate,
  suspendUser
);

// Reinstate a user
router.put(
  '/users/:userId/reinstate',
  adminProtect,
  [
    param('userId').isMongoId().withMessage('Invalid user ID'),
    body('reason')
      .trim()
      .notEmpty()
      .withMessage('Reinstatement reason is required')
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters'),
  ],
  validate,
  reinstateUser
);

// ============================================
// MENTORSHIP DISPUTE RESOLUTION ROUTES - /api/admin/mentorships/*
// ============================================

// Get all mentorships with pagination and filters
router.get('/mentorships', adminProtect, getAllMentorships);

// Get mentorship details with full context
router.get(
  '/mentorships/:mentorshipId',
  adminProtect,
  [param('mentorshipId').isMongoId().withMessage('Invalid mentorship ID')],
  validate,
  getMentorshipDetails
);

// Admin pause a mentorship
router.put(
  '/mentorships/:mentorshipId/pause',
  adminProtect,
  [
    param('mentorshipId').isMongoId().withMessage('Invalid mentorship ID'),
    body('reason')
      .trim()
      .notEmpty()
      .withMessage('Reason for pausing is required')
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters'),
  ],
  validate,
  adminPauseMentorship
);

// Admin mark mentorship as completed
router.put(
  '/mentorships/:mentorshipId/complete',
  adminProtect,
  [
    param('mentorshipId').isMongoId().withMessage('Invalid mentorship ID'),
    body('reason')
      .trim()
      .notEmpty()
      .withMessage('Reason for completing is required')
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters'),
  ],
  validate,
  adminCompleteMentorship
);

// ============================================
// PLATFORM MONITORING ROUTES - /api/admin/platform/*
// ============================================

// Get platform statistics
router.get('/platform/stats', adminProtect, getPlatformStats);

// ============================================
// AUDIT LOG ROUTES - /api/admin/audit-logs/*
// ============================================

// Get audit logs with filtering
router.get('/audit-logs', adminProtect, getAuditLogs);

// Get recent admin activity summary
router.get('/audit-logs/recent', adminProtect, getRecentActivity);

module.exports = router;
