const {
  User,
  MentorshipRequest,
  Goal,
  ProgressUpdate,
  WeeklyCheckIn,
  MentorReview,
  LearnerFeedback,
} = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  logUserSuspension,
  logUserReinstatement,
  getEntityAuditHistory,
} = require('../services/adminAuditService');

/**
 * Admin User Moderation Controller
 * Handles user management and moderation by admins
 *
 * Rules:
 * - Admin can view all users
 * - Admin can suspend/reinstate users with reason
 * - All actions are logged
 * - No data deletion - only status changes
 */

// @desc    Get all users with pagination and filters
// @route   GET /api/admin/users
// @access  Admin only
const getAllUsers = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    role,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const query = {
    role: { $ne: 'admin' }, // Exclude other admins from user list
  };

  if (role && ['learner', 'mentor'].includes(role)) {
    query.role = role;
  }

  if (status && ['active', 'suspended'].includes(status)) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// @desc    Get single user details
// @route   GET /api/admin/users/:userId
// @access  Admin only
const getUserById = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.role === 'admin') {
    return next(new AppError('Cannot view admin user details through this endpoint', 403));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Get user activity summary
// @route   GET /api/admin/users/:userId/activity
// @access  Admin only
const getUserActivitySummary = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.role === 'admin') {
    return next(new AppError('Cannot view admin activity through this endpoint', 403));
  }

  let activitySummary = {};

  if (user.role === 'learner') {
    // Learner activity summary
    const [
      mentorshipsAsLearner,
      goals,
      progressUpdates,
      checkIns,
      reviewsSubmitted,
    ] = await Promise.all([
      MentorshipRequest.find({ learner: userId }).populate('mentor', 'name email'),
      Goal.find({ learner: userId }),
      ProgressUpdate.find({ learner: userId }),
      WeeklyCheckIn.find({ learner: userId }),
      MentorReview.find({ reviewer: userId }),
    ]);

    const activeMentorships = mentorshipsAsLearner.filter(m => m.status === 'active');
    const completedMentorships = mentorshipsAsLearner.filter(m => m.status === 'completed');
    const atRiskMentorships = mentorshipsAsLearner.filter(m => m.status === 'at-risk');
    const pausedMentorships = mentorshipsAsLearner.filter(m => m.status === 'paused');

    activitySummary = {
      role: 'learner',
      mentorships: {
        total: mentorshipsAsLearner.length,
        active: activeMentorships.length,
        completed: completedMentorships.length,
        atRisk: atRiskMentorships.length,
        paused: pausedMentorships.length,
        list: mentorshipsAsLearner.map(m => ({
          id: m._id,
          mentor: m.mentor,
          status: m.status,
          createdAt: m.createdAt,
          completedAt: m.completedAt,
        })),
      },
      goals: {
        total: goals.length,
        active: goals.filter(g => g.status === 'active').length,
        completed: goals.filter(g => g.status === 'completed').length,
      },
      progressUpdates: {
        total: progressUpdates.length,
        lastUpdate: progressUpdates.length > 0
          ? progressUpdates.sort((a, b) => b.createdAt - a.createdAt)[0].createdAt
          : null,
      },
      checkIns: {
        total: checkIns.length,
        lateSubmissions: checkIns.filter(c => c.isLate).length,
      },
      reviewsSubmitted: reviewsSubmitted.length,
    };
  } else if (user.role === 'mentor') {
    // Mentor activity summary
    const [
      mentorshipsAsMentor,
      feedbackSubmitted,
      reviewsReceived,
    ] = await Promise.all([
      MentorshipRequest.find({ mentor: userId }).populate('learner', 'name email'),
      LearnerFeedback.find({ mentor: userId }),
      MentorReview.find({ mentor: userId }),
    ]);

    const activeMentorships = mentorshipsAsMentor.filter(m => m.status === 'active');
    const completedMentorships = mentorshipsAsMentor.filter(m => m.status === 'completed');
    const atRiskMentorships = mentorshipsAsMentor.filter(m => m.status === 'at-risk');
    const pausedMentorships = mentorshipsAsMentor.filter(m => m.status === 'paused');

    activitySummary = {
      role: 'mentor',
      mentorships: {
        total: mentorshipsAsMentor.length,
        active: activeMentorships.length,
        completed: completedMentorships.length,
        atRisk: atRiskMentorships.length,
        paused: pausedMentorships.length,
        list: mentorshipsAsMentor.map(m => ({
          id: m._id,
          learner: m.learner,
          status: m.status,
          createdAt: m.createdAt,
          completedAt: m.completedAt,
        })),
      },
      feedbackSubmitted: feedbackSubmitted.length,
      reviewsReceived: {
        total: reviewsReceived.length,
        averageRating: reviewsReceived.length > 0
          ? (reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / reviewsReceived.length).toFixed(2)
          : null,
      },
    };
  }

  // Get admin audit history for this user
  const auditHistory = await getEntityAuditHistory('user', userId);

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        suspendedAt: user.suspendedAt,
        suspendedReason: user.suspendedReason,
        createdAt: user.createdAt,
      },
      activity: activitySummary,
      auditHistory,
    },
  });
});

// @desc    Suspend a user
// @route   PUT /api/admin/users/:userId/suspend
// @access  Admin only
const suspendUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { reason } = req.body;

  if (!reason || reason.trim().length === 0) {
    return next(new AppError('Suspension reason is required', 400));
  }

  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.role === 'admin') {
    return next(new AppError('Cannot suspend an admin user', 403));
  }

  if (user.status === 'suspended') {
    return next(new AppError('User is already suspended', 400));
  }

  const previousStatus = user.status;

  // Update user status
  user.status = 'suspended';
  user.suspendedAt = new Date();
  user.suspendedReason = reason.trim();
  user.suspendedBy = req.admin._id;
  await user.save();

  // Log the action
  await logUserSuspension(req, userId, reason.trim(), previousStatus);

  res.status(200).json({
    success: true,
    message: 'User has been suspended',
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      status: user.status,
      suspendedAt: user.suspendedAt,
      suspendedReason: user.suspendedReason,
    },
  });
});

// @desc    Reinstate a suspended user
// @route   PUT /api/admin/users/:userId/reinstate
// @access  Admin only
const reinstateUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { reason } = req.body;

  if (!reason || reason.trim().length === 0) {
    return next(new AppError('Reinstatement reason is required', 400));
  }

  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.role === 'admin') {
    return next(new AppError('Cannot manage admin users through this endpoint', 403));
  }

  if (user.status !== 'suspended') {
    return next(new AppError('User is not suspended', 400));
  }

  const previousSuspensionReason = user.suspendedReason;

  // Update user status
  user.status = 'active';
  user.suspendedAt = null;
  user.suspendedReason = null;
  user.suspendedBy = null;
  await user.save();

  // Log the action
  await logUserReinstatement(req, userId, reason.trim(), previousSuspensionReason);

  res.status(200).json({
    success: true,
    message: 'User has been reinstated',
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      status: user.status,
    },
  });
});

module.exports = {
  getAllUsers,
  getUserById,
  getUserActivitySummary,
  suspendUser,
  reinstateUser,
};
