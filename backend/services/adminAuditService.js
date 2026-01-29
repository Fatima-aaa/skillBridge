const { AdminAuditLog } = require('../models');

/**
 * Admin Audit Service
 * Handles immutable logging of all admin actions
 *
 * CRITICAL: All admin actions MUST be logged through this service
 * Audit logs cannot be edited or deleted
 */

/**
 * Create an audit log entry
 * This is the core logging function used by all admin actions
 */
const createAuditLog = async ({
  adminId,
  actionType,
  targetType,
  targetId,
  reason,
  metadata = {},
  ipAddress,
  userAgent,
}) => {
  const auditLog = await AdminAuditLog.create({
    adminId,
    actionType,
    targetType,
    targetId,
    reason,
    metadata,
    ipAddress,
    userAgent,
  });

  return auditLog;
};

/**
 * Log user suspension action
 */
const logUserSuspension = async (req, userId, reason, previousStatus) => {
  return createAuditLog({
    adminId: req.admin._id,
    actionType: 'user_suspended',
    targetType: 'user',
    targetId: userId,
    reason,
    metadata: {
      previousStatus,
    },
    ipAddress: req.adminMeta?.ipAddress,
    userAgent: req.adminMeta?.userAgent,
  });
};

/**
 * Log user reinstatement action
 */
const logUserReinstatement = async (req, userId, reason, previousSuspensionReason) => {
  return createAuditLog({
    adminId: req.admin._id,
    actionType: 'user_reinstated',
    targetType: 'user',
    targetId: userId,
    reason,
    metadata: {
      previousSuspensionReason,
    },
    ipAddress: req.adminMeta?.ipAddress,
    userAgent: req.adminMeta?.userAgent,
  });
};

/**
 * Log mentorship pause by admin
 */
const logMentorshipPause = async (req, mentorshipId, reason, previousStatus) => {
  return createAuditLog({
    adminId: req.admin._id,
    actionType: 'mentorship_paused',
    targetType: 'mentorship',
    targetId: mentorshipId,
    reason,
    metadata: {
      previousStatus,
    },
    ipAddress: req.adminMeta?.ipAddress,
    userAgent: req.adminMeta?.userAgent,
  });
};

/**
 * Log mentorship completion by admin
 */
const logMentorshipCompletion = async (req, mentorshipId, reason, previousStatus) => {
  return createAuditLog({
    adminId: req.admin._id,
    actionType: 'mentorship_completed',
    targetType: 'mentorship',
    targetId: mentorshipId,
    reason,
    metadata: {
      previousStatus,
    },
    ipAddress: req.adminMeta?.ipAddress,
    userAgent: req.adminMeta?.userAgent,
  });
};

/**
 * Log admin login
 */
const logAdminLogin = async (adminId, ipAddress, userAgent) => {
  return createAuditLog({
    adminId,
    actionType: 'admin_login',
    targetType: 'system',
    targetId: adminId, // Self-referential for login events
    reason: 'Admin login successful',
    metadata: {
      loginTime: new Date().toISOString(),
    },
    ipAddress,
    userAgent,
  });
};

/**
 * Query audit logs with filters
 * Only admins can view audit logs
 */
const queryAuditLogs = async (filters = {}, options = {}) => {
  const {
    adminId,
    actionType,
    targetType,
    targetId,
    startDate,
    endDate,
  } = filters;

  const {
    page = 1,
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const query = {};

  if (adminId) {
    query.adminId = adminId;
  }

  if (actionType) {
    query.actionType = actionType;
  }

  if (targetType) {
    query.targetType = targetType;
  }

  if (targetId) {
    query.targetId = targetId;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate);
    }
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [logs, total] = await Promise.all([
    AdminAuditLog.find(query)
      .populate('adminId', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    AdminAuditLog.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get audit logs for a specific entity (user or mentorship)
 */
const getEntityAuditHistory = async (targetType, targetId) => {
  const logs = await AdminAuditLog.find({
    targetType,
    targetId,
  })
    .populate('adminId', 'name email')
    .sort({ createdAt: -1 });

  return logs;
};

/**
 * Get recent admin activity summary
 */
const getRecentAdminActivity = async (hours = 24) => {
  const since = new Date();
  since.setHours(since.getHours() - hours);

  const logs = await AdminAuditLog.find({
    createdAt: { $gte: since },
  })
    .populate('adminId', 'name email')
    .sort({ createdAt: -1 })
    .limit(100);

  // Group by action type
  const summary = logs.reduce((acc, log) => {
    if (!acc[log.actionType]) {
      acc[log.actionType] = 0;
    }
    acc[log.actionType]++;
    return acc;
  }, {});

  return {
    logs,
    summary: {
      ...summary,
      totalActions: logs.length,
    },
    period: `Last ${hours} hours`,
  };
};

module.exports = {
  createAuditLog,
  logUserSuspension,
  logUserReinstatement,
  logMentorshipPause,
  logMentorshipCompletion,
  logAdminLogin,
  queryAuditLogs,
  getEntityAuditHistory,
  getRecentAdminActivity,
};
