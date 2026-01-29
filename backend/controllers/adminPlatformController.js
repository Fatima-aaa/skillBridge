const { User, MentorshipRequest } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const {
  queryAuditLogs,
  getRecentAdminActivity,
} = require('../services/adminAuditService');

/**
 * Admin Platform Monitoring Controller
 * Provides aggregated platform statistics and audit log access
 *
 * Features:
 * - Platform statistics (counts only, no charts)
 * - Audit log querying
 */

// @desc    Get platform statistics overview
// @route   GET /api/admin/platform/stats
// @access  Admin only
const getPlatformStats = asyncHandler(async (req, res, next) => {
  // Get user counts
  const [
    totalUsers,
    totalLearners,
    totalMentors,
    suspendedUsers,
    activeUsers,
  ] = await Promise.all([
    User.countDocuments({ role: { $ne: 'admin' } }),
    User.countDocuments({ role: 'learner' }),
    User.countDocuments({ role: 'mentor' }),
    User.countDocuments({ role: { $ne: 'admin' }, status: 'suspended' }),
    User.countDocuments({ role: { $ne: 'admin' }, status: { $ne: 'suspended' } }),
  ]);

  // Get mentorship counts
  const [
    totalMentorships,
    pendingMentorships,
    activeMentorships,
    atRiskMentorships,
    pausedMentorships,
    completedMentorships,
    rejectedMentorships,
  ] = await Promise.all([
    MentorshipRequest.countDocuments(),
    MentorshipRequest.countDocuments({ status: 'pending' }),
    MentorshipRequest.countDocuments({ status: 'active' }),
    MentorshipRequest.countDocuments({ status: 'at-risk' }),
    MentorshipRequest.countDocuments({ status: 'paused' }),
    MentorshipRequest.countDocuments({ status: 'completed' }),
    MentorshipRequest.countDocuments({ status: 'rejected' }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        learners: totalLearners,
        mentors: totalMentors,
        active: activeUsers,
        suspended: suspendedUsers,
      },
      mentorships: {
        total: totalMentorships,
        pending: pendingMentorships,
        active: activeMentorships,
        atRisk: atRiskMentorships,
        paused: pausedMentorships,
        completed: completedMentorships,
        rejected: rejectedMentorships,
      },
      generatedAt: new Date().toISOString(),
    },
  });
});

// @desc    Get audit logs with filtering
// @route   GET /api/admin/audit-logs
// @access  Admin only
const getAuditLogs = asyncHandler(async (req, res, next) => {
  const {
    adminId,
    actionType,
    targetType,
    targetId,
    startDate,
    endDate,
    page = 1,
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const filters = {};
  if (adminId) filters.adminId = adminId;
  if (actionType) filters.actionType = actionType;
  if (targetType) filters.targetType = targetType;
  if (targetId) filters.targetId = targetId;
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy,
    sortOrder,
  };

  const result = await queryAuditLogs(filters, options);

  res.status(200).json({
    success: true,
    data: result.logs,
    pagination: result.pagination,
  });
});

// @desc    Get recent admin activity summary
// @route   GET /api/admin/audit-logs/recent
// @access  Admin only
const getRecentActivity = asyncHandler(async (req, res, next) => {
  const { hours = 24 } = req.query;

  const result = await getRecentAdminActivity(parseInt(hours));

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  getPlatformStats,
  getAuditLogs,
  getRecentActivity,
};
