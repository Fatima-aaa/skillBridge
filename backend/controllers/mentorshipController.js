const { MentorshipRequest, MentorProfile, User, MentorshipStatusLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  pauseMentorshipByMentor,
  reactivateMentorshipByMentor,
  getMentorshipStatusHistory,
  getLearnerConsistencySummary,
  processInactivityForMentorship,
} = require('../services/inactivityService');
const { getLearnerReliabilitySummary } = require('../services/reliabilityService');

// @desc    Send mentorship request (Learner)
// @route   POST /api/mentorships
// @access  Private (Learner only)
const sendRequest = asyncHandler(async (req, res, next) => {
  const { mentorId, message } = req.body;

  // Verify mentor exists and is actually a mentor
  const mentor = await User.findById(mentorId);
  if (!mentor || mentor.role !== 'mentor') {
    return next(new AppError('Mentor not found', 404));
  }

  // Check if mentor has a profile and is available
  const mentorProfile = await MentorProfile.findOne({ user: mentorId });
  if (!mentorProfile) {
    return next(new AppError('Mentor has not set up their profile yet', 400));
  }

  if (!mentorProfile.isAvailable) {
    return next(new AppError('Mentor has reached their capacity', 400));
  }

  // Check if learner already has an active mentorship
  const activeMentorship = await MentorshipRequest.findOne({
    learner: req.user.id,
    status: { $in: ['active', 'at-risk', 'paused'] },
  });

  if (activeMentorship) {
    return next(new AppError('You already have an active mentorship', 400));
  }

  // Check if there's already a pending request to this mentor
  const pendingRequest = await MentorshipRequest.findOne({
    learner: req.user.id,
    mentor: mentorId,
    status: 'pending',
  });

  if (pendingRequest) {
    return next(
      new AppError('You already have a pending request to this mentor', 400)
    );
  }

  const request = await MentorshipRequest.create({
    learner: req.user.id,
    mentor: mentorId,
    message,
  });

  res.status(201).json({
    success: true,
    data: request,
  });
});

// @desc    Get incoming requests (Mentor)
// @route   GET /api/mentorships/requests
// @access  Private (Mentor only)
// @query   includeReliability - true/false (default: true for pending requests)
const getIncomingRequests = asyncHandler(async (req, res, next) => {
  const { includeReliability } = req.query;

  const requests = await MentorshipRequest.find({
    mentor: req.user.id,
  })
    .populate('learner', 'name email')
    .sort('-createdAt');

  // Include reliability info for pending requests by default
  if (includeReliability !== 'false') {
    const requestsWithReliability = await Promise.all(
      requests.map(async (request) => {
        const requestObj = request.toObject();

        // Only add reliability for pending requests
        if (request.status === 'pending') {
          const reliability = await getLearnerReliabilitySummary(request.learner._id);
          requestObj.learnerReliability = reliability;
        }

        return requestObj;
      })
    );

    return res.status(200).json({
      success: true,
      count: requestsWithReliability.length,
      data: requestsWithReliability,
    });
  }

  res.status(200).json({
    success: true,
    count: requests.length,
    data: requests,
  });
});

// @desc    Get my requests as a learner
// @route   GET /api/mentorships/my-requests
// @access  Private (Learner only)
const getMyRequests = asyncHandler(async (req, res, next) => {
  const requests = await MentorshipRequest.find({
    learner: req.user.id,
  })
    .populate('mentor', 'name email')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: requests.length,
    data: requests,
  });
});

// @desc    Accept or reject mentorship request (Mentor)
// @route   PUT /api/mentorships/:id
// @access  Private (Mentor only)
const updateRequestStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  if (!['active', 'rejected'].includes(status)) {
    return next(new AppError('Invalid status. Use active or rejected', 400));
  }

  const request = await MentorshipRequest.findById(req.params.id);

  if (!request) {
    return next(new AppError('Request not found', 404));
  }

  // Verify mentor owns this request
  if (request.mentor.toString() !== req.user.id) {
    return next(new AppError('Not authorized to update this request', 403));
  }

  // Can only update pending requests
  if (request.status !== 'pending') {
    return next(new AppError('This request has already been processed', 400));
  }

  // If accepting, check mentor capacity
  if (status === 'active') {
    const mentorProfile = await MentorProfile.findOne({ user: req.user.id });

    if (!mentorProfile.isAvailable) {
      return next(new AppError('You have reached your mentee capacity', 400));
    }

    // Check if learner already has an active mentorship
    const activeMentorship = await MentorshipRequest.findOne({
      learner: request.learner,
      status: { $in: ['active', 'at-risk', 'paused'] },
    });

    if (activeMentorship) {
      return next(new AppError('Learner already has an active mentorship', 400));
    }

    // Increment mentor's current mentee count
    await MentorProfile.findOneAndUpdate(
      { user: req.user.id },
      { $inc: { currentMenteeCount: 1 } }
    );
  }

  const previousStatus = request.status;
  request.status = status;
  await request.save();

  // Log the status change
  await MentorshipStatusLog.create({
    mentorship: request._id,
    previousStatus,
    newStatus: status,
    reason: status === 'active'
      ? 'Mentorship request accepted by mentor'
      : 'Mentorship request rejected by mentor',
    triggeredBy: 'mentor',
    timestamp: new Date(),
  });

  res.status(200).json({
    success: true,
    data: request,
  });
});

// @desc    Get active mentorship for learner
// @route   GET /api/mentorships/active
// @access  Private (Learner only)
const getActiveMentorship = asyncHandler(async (req, res, next) => {
  let mentorship = await MentorshipRequest.findOne({
    learner: req.user.id,
    status: { $in: ['active', 'at-risk', 'paused'] },
  }).populate('mentor', 'name email');

  if (!mentorship) {
    return res.status(200).json({
      success: true,
      data: null,
    });
  }

  // Check for inactivity and update status if needed (on dashboard load)
  if (['active', 'at-risk'].includes(mentorship.status)) {
    mentorship = await processInactivityForMentorship(mentorship._id);
    // Re-populate mentor info after potential status change
    mentorship = await MentorshipRequest.findById(mentorship._id)
      .populate('mentor', 'name email');
  }

  res.status(200).json({
    success: true,
    data: mentorship,
  });
});

// @desc    Get all mentees for a mentor
// @route   GET /api/mentorships/mentees
// @access  Private (Mentor only)
const getMentees = asyncHandler(async (req, res, next) => {
  const mentorships = await MentorshipRequest.find({
    mentor: req.user.id,
    status: { $in: ['active', 'at-risk', 'paused'] },
  }).populate('learner', 'name email');

  res.status(200).json({
    success: true,
    count: mentorships.length,
    data: mentorships,
  });
});

// @desc    Pause mentorship (Mentor only)
// @route   PUT /api/mentorships/:id/pause
// @access  Private (Mentor only)
const pauseMentorship = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  if (!reason || reason.trim().length === 0) {
    return next(new AppError('Reason is required to pause mentorship', 400));
  }

  const result = await pauseMentorshipByMentor(req.params.id, req.user.id, reason);

  if (!result.success) {
    if (result.error === 'Mentorship not found') {
      return next(new AppError(result.error, 404));
    }
    if (result.error === 'Not authorized') {
      return next(new AppError(result.error, 403));
    }
    return next(new AppError(result.error, 400));
  }

  res.status(200).json({
    success: true,
    data: result.mentorship,
    message: 'Mentorship paused successfully',
  });
});

// @desc    Reactivate paused mentorship (Mentor only)
// @route   PUT /api/mentorships/:id/reactivate
// @access  Private (Mentor only)
const reactivateMentorship = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  const result = await reactivateMentorshipByMentor(
    req.params.id,
    req.user.id,
    reason || 'Mentorship reactivated by mentor'
  );

  if (!result.success) {
    if (result.error === 'Mentorship not found') {
      return next(new AppError(result.error, 404));
    }
    if (result.error === 'Not authorized') {
      return next(new AppError(result.error, 403));
    }
    return next(new AppError(result.error, 400));
  }

  res.status(200).json({
    success: true,
    data: result.mentorship,
    message: 'Mentorship reactivated successfully',
  });
});

// @desc    Get mentorship status history
// @route   GET /api/mentorships/:id/history
// @access  Private (Mentor only for their own mentorships)
const getStatusHistory = asyncHandler(async (req, res, next) => {
  const mentorship = await MentorshipRequest.findById(req.params.id);

  if (!mentorship) {
    return next(new AppError('Mentorship not found', 404));
  }

  // Verify mentor owns this mentorship
  if (mentorship.mentor.toString() !== req.user.id) {
    return next(new AppError('Not authorized to view this history', 403));
  }

  const history = await getMentorshipStatusHistory(req.params.id);

  res.status(200).json({
    success: true,
    count: history.length,
    data: history,
  });
});

// @desc    Flag poor commitment (Mentor only)
// @route   PUT /api/mentorships/:id/flag
// @access  Private (Mentor only)
const flagPoorCommitment = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  if (!reason || reason.trim().length === 0) {
    return next(new AppError('Reason is required to flag poor commitment', 400));
  }

  const mentorship = await MentorshipRequest.findById(req.params.id);

  if (!mentorship) {
    return next(new AppError('Mentorship not found', 404));
  }

  // Verify mentor owns this mentorship
  if (mentorship.mentor.toString() !== req.user.id) {
    return next(new AppError('Not authorized to flag this mentorship', 403));
  }

  // Can only flag active or at-risk mentorships
  if (!['active', 'at-risk'].includes(mentorship.status)) {
    return next(new AppError('Can only flag active or at-risk mentorships', 400));
  }

  // Move to at-risk if not already
  if (mentorship.status === 'active') {
    const previousStatus = mentorship.status;
    mentorship.status = 'at-risk';

    // Log the status change
    await MentorshipStatusLog.create({
      mentorship: mentorship._id,
      previousStatus,
      newStatus: 'at-risk',
      reason: `Flagged for poor commitment: ${reason}`,
      triggeredBy: 'mentor',
      timestamp: new Date(),
    });

    await mentorship.save();
  } else {
    // Already at-risk, just log the flag
    await MentorshipStatusLog.create({
      mentorship: mentorship._id,
      previousStatus: mentorship.status,
      newStatus: mentorship.status,
      reason: `Flagged for poor commitment (already at-risk): ${reason}`,
      triggeredBy: 'mentor',
      timestamp: new Date(),
    });
  }

  res.status(200).json({
    success: true,
    data: mentorship,
    message: 'Mentorship flagged for poor commitment',
  });
});

// @desc    Get mentee details with consistency summary
// @route   GET /api/mentorships/mentee/:menteeId/details
// @access  Private (Mentor only)
const getMenteeDetails = asyncHandler(async (req, res, next) => {
  const { menteeId } = req.params;

  // Find the mentorship
  const mentorship = await MentorshipRequest.findOne({
    mentor: req.user.id,
    learner: menteeId,
    status: { $in: ['active', 'at-risk', 'paused'] },
  }).populate('learner', 'name email');

  if (!mentorship) {
    return next(new AppError('This learner is not your mentee', 403));
  }

  // Get consistency summary
  const weeksBack = parseInt(req.query.weeks) || 12;
  const summary = await getLearnerConsistencySummary(mentorship._id, weeksBack);

  // Get status history
  const history = await getMentorshipStatusHistory(mentorship._id);

  res.status(200).json({
    success: true,
    data: {
      mentorship: {
        id: mentorship._id,
        status: mentorship.status,
        consecutiveMissedWeeks: mentorship.consecutiveMissedWeeks,
        createdAt: mentorship.createdAt,
      },
      learner: mentorship.learner,
      consistency: summary ? summary.stats : null,
      statusHistory: history.slice(0, 10), // Last 10 status changes
    },
  });
});

// @desc    Complete mentorship (Learner only, only when active)
// @route   PUT /api/mentorships/:id/complete
// @access  Private (Learner who is part of the mentorship)
const completeMentorship = asyncHandler(async (req, res, next) => {
  const mentorship = await MentorshipRequest.findById(req.params.id);

  if (!mentorship) {
    return next(new AppError('Mentorship not found', 404));
  }

  // Only learner can complete the mentorship
  const isLearner = mentorship.learner.toString() === req.user.id;

  if (!isLearner) {
    return next(new AppError('Only the learner can mark the mentorship as completed', 403));
  }

  // Can only complete active mentorships (not at-risk or paused)
  if (mentorship.status !== 'active') {
    if (mentorship.status === 'at-risk') {
      return next(new AppError('Cannot complete mentorship while at risk. Please update your goal progress first.', 400));
    }
    if (mentorship.status === 'paused') {
      return next(new AppError('Cannot complete mentorship while paused. Ask your mentor to resume it first.', 400));
    }
    return next(new AppError('Can only complete active mentorships', 400));
  }

  const previousStatus = mentorship.status;
  mentorship.status = 'completed';
  mentorship.completedAt = new Date();
  mentorship.completionReason = 'learner_ended';
  await mentorship.save();

  // Decrement mentor's current mentee count
  await MentorProfile.findOneAndUpdate(
    { user: mentorship.mentor },
    { $inc: { currentMenteeCount: -1 } }
  );

  // Log the status change
  await MentorshipStatusLog.create({
    mentorship: mentorship._id,
    previousStatus,
    newStatus: 'completed',
    reason: 'Mentorship completed by learner',
    triggeredBy: 'system',
    timestamp: new Date(),
  });

  res.status(200).json({
    success: true,
    data: mentorship,
    message: 'Mentorship completed successfully. You can now rate your mentor.',
  });
});

// @desc    Get completed mentorships for current user
// @route   GET /api/mentorships/completed
// @access  Private (Mentor or Learner)
const getCompletedMentorships = asyncHandler(async (req, res, next) => {
  let query = {};

  if (req.user.role === 'mentor') {
    query = { mentor: req.user.id, status: 'completed' };
  } else {
    query = { learner: req.user.id, status: 'completed' };
  }

  const mentorships = await MentorshipRequest.find(query)
    .populate('learner', 'name email')
    .populate('mentor', 'name email')
    .sort('-completedAt');

  res.status(200).json({
    success: true,
    count: mentorships.length,
    data: mentorships,
  });
});

module.exports = {
  sendRequest,
  getIncomingRequests,
  getMyRequests,
  updateRequestStatus,
  getActiveMentorship,
  getMentees,
  pauseMentorship,
  reactivateMentorship,
  getStatusHistory,
  flagPoorCommitment,
  getMenteeDetails,
  completeMentorship,
  getCompletedMentorships,
};
