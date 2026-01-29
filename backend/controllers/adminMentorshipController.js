const {
  User,
  MentorshipRequest,
  MentorshipStatusLog,
  Goal,
  ProgressUpdate,
  WeeklyCheckIn,
  MentorReview,
  LearnerFeedback,
  MentorProfile,
} = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  logMentorshipPause,
  logMentorshipCompletion,
  getEntityAuditHistory,
} = require('../services/adminAuditService');

/**
 * Admin Mentorship Controller
 * Handles dispute resolution and mentorship management by admins
 *
 * Rules:
 * - Admin can view mentorship details
 * - Admin can pause mentorships (dispute resolution)
 * - Admin can mark mentorships as completed (dispute resolution)
 * - Admin CANNOT edit user-generated content
 * - All actions are logged with reason
 */

// @desc    Get all mentorships with pagination and filters
// @route   GET /api/admin/mentorships
// @access  Admin only
const getAllMentorships = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const query = {};

  if (status) {
    const validStatuses = ['pending', 'active', 'at-risk', 'paused', 'rejected', 'completed'];
    if (validStatuses.includes(status)) {
      query.status = status;
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [mentorships, total] = await Promise.all([
    MentorshipRequest.find(query)
      .populate('learner', 'name email status')
      .populate('mentor', 'name email status')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    MentorshipRequest.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: mentorships,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// @desc    Get mentorship details with full context
// @route   GET /api/admin/mentorships/:mentorshipId
// @access  Admin only
const getMentorshipDetails = asyncHandler(async (req, res, next) => {
  const { mentorshipId } = req.params;

  const mentorship = await MentorshipRequest.findById(mentorshipId)
    .populate('learner', 'name email status suspendedAt suspendedReason')
    .populate('mentor', 'name email status suspendedAt suspendedReason');

  if (!mentorship) {
    return next(new AppError('Mentorship not found', 404));
  }

  // Get mentor profile
  const mentorProfile = await MentorProfile.findOne({ user: mentorship.mentor._id });

  // Get all goals
  const goals = await Goal.find({ mentorship: mentorshipId });

  // Get progress updates for all goals
  const goalIds = goals.map(g => g._id);
  const progressUpdates = await ProgressUpdate.find({ goal: { $in: goalIds } })
    .sort({ createdAt: -1 });

  // Get weekly check-ins
  const checkIns = await WeeklyCheckIn.find({ mentorship: mentorshipId })
    .sort({ weekStartDate: -1 });

  // Get review (if exists)
  const review = await MentorReview.findOne({ mentorship: mentorshipId });

  // Get feedback (if exists)
  const feedback = await LearnerFeedback.findOne({ mentorship: mentorshipId });

  // Get status history
  const statusHistory = await MentorshipStatusLog.find({ mentorship: mentorshipId })
    .sort({ timestamp: -1 });

  // Get admin audit history for this mentorship
  const auditHistory = await getEntityAuditHistory('mentorship', mentorshipId);

  res.status(200).json({
    success: true,
    data: {
      mentorship: {
        id: mentorship._id,
        status: mentorship.status,
        message: mentorship.message,
        consecutiveMissedWeeks: mentorship.consecutiveMissedWeeks,
        completedAt: mentorship.completedAt,
        completionReason: mentorship.completionReason,
        createdAt: mentorship.createdAt,
      },
      learner: mentorship.learner,
      mentor: mentorship.mentor,
      mentorProfile: mentorProfile ? {
        skills: mentorProfile.skills,
        bio: mentorProfile.bio,
        capacity: mentorProfile.capacity,
        currentMenteeCount: mentorProfile.currentMenteeCount,
      } : null,
      goals: goals.map(g => ({
        id: g._id,
        title: g.title,
        description: g.description,
        status: g.status,
        createdAt: g.createdAt,
        progressUpdates: progressUpdates
          .filter(pu => pu.goal.toString() === g._id.toString())
          .map(pu => ({
            id: pu._id,
            content: pu.content,
            createdAt: pu.createdAt,
          })),
      })),
      checkIns: checkIns.map(c => ({
        id: c._id,
        weekStartDate: c.weekStartDate,
        weekEndDate: c.weekEndDate,
        plannedTasks: c.plannedTasks,
        completedTasks: c.completedTasks,
        blockers: c.blockers,
        submittedAt: c.submittedAt,
        isLate: c.isLate,
      })),
      review: review ? {
        rating: review.rating,
        createdAt: review.createdAt,
      } : null,
      feedback: feedback ? {
        rating: feedback.rating,
        createdAt: feedback.createdAt,
      } : null,
      statusHistory,
      adminAuditHistory: auditHistory,
    },
  });
});

// @desc    Admin pause a mentorship (dispute resolution)
// @route   PUT /api/admin/mentorships/:mentorshipId/pause
// @access  Admin only
const adminPauseMentorship = asyncHandler(async (req, res, next) => {
  const { mentorshipId } = req.params;
  const { reason } = req.body;

  if (!reason || reason.trim().length === 0) {
    return next(new AppError('Reason for pausing is required', 400));
  }

  const mentorship = await MentorshipRequest.findById(mentorshipId)
    .populate('learner', 'name email')
    .populate('mentor', 'name email');

  if (!mentorship) {
    return next(new AppError('Mentorship not found', 404));
  }

  // Can only pause active or at-risk mentorships
  if (!['active', 'at-risk'].includes(mentorship.status)) {
    return next(
      new AppError(
        `Cannot pause a mentorship with status '${mentorship.status}'. Only active or at-risk mentorships can be paused.`,
        400
      )
    );
  }

  const previousStatus = mentorship.status;

  // Update mentorship status
  mentorship.status = 'paused';
  await mentorship.save();

  // Log in MentorshipStatusLog
  await MentorshipStatusLog.create({
    mentorship: mentorshipId,
    previousStatus,
    newStatus: 'paused',
    reason: `Admin action: ${reason.trim()}`,
    triggeredBy: 'system', // Using 'system' as admin actions are distinct from mentor
    systemContext: {
      adminId: req.admin._id.toString(),
      adminAction: true,
    },
    timestamp: new Date(),
  });

  // Log in admin audit log
  await logMentorshipPause(req, mentorshipId, reason.trim(), previousStatus);

  res.status(200).json({
    success: true,
    message: 'Mentorship has been paused by admin',
    data: {
      id: mentorship._id,
      status: mentorship.status,
      previousStatus,
      learner: mentorship.learner,
      mentor: mentorship.mentor,
      pausedAt: new Date(),
      pausedBy: 'admin',
      reason: reason.trim(),
    },
  });
});

// @desc    Admin mark a mentorship as completed (dispute resolution)
// @route   PUT /api/admin/mentorships/:mentorshipId/complete
// @access  Admin only
const adminCompleteMentorship = asyncHandler(async (req, res, next) => {
  console.log('=== adminCompleteMentorship called ===');
  const { mentorshipId } = req.params;
  const { reason } = req.body;
  console.log('mentorshipId:', mentorshipId, 'reason:', reason);

  if (!reason || reason.trim().length === 0) {
    return next(new AppError('Reason for completing is required', 400));
  }

  const mentorship = await MentorshipRequest.findById(mentorshipId)
    .populate('learner', 'name email')
    .populate('mentor', 'name email');

  if (!mentorship) {
    return next(new AppError('Mentorship not found', 404));
  }

  // Can only complete active, at-risk, or paused mentorships
  if (!['active', 'at-risk', 'paused'].includes(mentorship.status)) {
    return next(
      new AppError(
        `Cannot complete a mentorship with status '${mentorship.status}'.`,
        400
      )
    );
  }

  const previousStatus = mentorship.status;

  // Update mentorship status
  mentorship.status = 'completed';
  mentorship.completedAt = new Date();
  mentorship.completionReason = 'mutual_agreement'; // Admin completing implies mutual resolution
  await mentorship.save();

  // Decrement mentor's mentee count
  await MentorProfile.findOneAndUpdate(
    { user: mentorship.mentor._id },
    { $inc: { currentMenteeCount: -1 } }
  );

  // Log in MentorshipStatusLog
  await MentorshipStatusLog.create({
    mentorship: mentorshipId,
    previousStatus,
    newStatus: 'completed',
    reason: `Admin action: ${reason.trim()}`,
    triggeredBy: 'system',
    systemContext: {
      adminId: req.admin._id.toString(),
      adminAction: true,
    },
    timestamp: new Date(),
  });

  // Log in admin audit log
  try {
    await logMentorshipCompletion(req, mentorshipId, reason.trim(), previousStatus);
    console.log('Mentorship completion logged successfully:', mentorshipId);
  } catch (auditError) {
    console.error('Failed to log mentorship completion:', auditError);
  }

  res.status(200).json({
    success: true,
    message: 'Mentorship has been marked as completed by admin',
    data: {
      id: mentorship._id,
      status: mentorship.status,
      previousStatus,
      learner: mentorship.learner,
      mentor: mentorship.mentor,
      completedAt: mentorship.completedAt,
      completedBy: 'admin',
      reason: reason.trim(),
    },
  });
});

module.exports = {
  getAllMentorships,
  getMentorshipDetails,
  adminPauseMentorship,
  adminCompleteMentorship,
};
