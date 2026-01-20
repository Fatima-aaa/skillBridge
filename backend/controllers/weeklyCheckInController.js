const { WeeklyCheckIn, Goal, MentorshipRequest } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  resetInactivityOnCheckIn,
  getLearnerConsistencySummary,
} = require('../services/inactivityService');

/**
 * Helper to get week boundaries (Monday to Sunday)
 */
const getWeekBoundaries = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { weekStart: monday, weekEnd: sunday };
};

// @desc    Submit weekly check-in for a goal
// @route   POST /api/check-ins/:goalId
// @access  Private (Learner only)
const submitCheckIn = asyncHandler(async (req, res, next) => {
  const { goalId } = req.params;
  const { plannedTasks, completedTasks, blockers, weekStartDate } = req.body;

  // Find the goal
  const goal = await Goal.findById(goalId);
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }

  // Verify learner owns this goal
  if (goal.learner.toString() !== req.user.id) {
    return next(new AppError('Not authorized to submit check-in for this goal', 403));
  }

  // Verify goal is active
  if (goal.status !== 'active') {
    return next(new AppError('Cannot submit check-in for completed goal', 400));
  }

  // Get the mentorship and verify it's not paused
  const mentorship = await MentorshipRequest.findById(goal.mentorship);
  if (!mentorship) {
    return next(new AppError('Mentorship not found', 404));
  }

  if (mentorship.status === 'paused') {
    return next(new AppError('Cannot submit check-in while mentorship is paused', 400));
  }

  // Determine week boundaries
  let weekStart, weekEnd;
  if (weekStartDate) {
    // Allow submitting for a specific week (for late submissions)
    const providedDate = new Date(weekStartDate);
    const boundaries = getWeekBoundaries(providedDate);
    weekStart = boundaries.weekStart;
    weekEnd = boundaries.weekEnd;
  } else {
    // Default to current week
    const boundaries = getWeekBoundaries();
    weekStart = boundaries.weekStart;
    weekEnd = boundaries.weekEnd;
  }

  // Check if a check-in already exists for this goal and week
  const existingCheckIn = await WeeklyCheckIn.findOne({
    goal: goalId,
    weekStartDate: weekStart,
  });

  if (existingCheckIn) {
    return next(new AppError('A check-in already exists for this goal and week', 400));
  }

  // Determine if submission is late
  const submittedAt = new Date();
  const isLate = submittedAt > weekEnd;

  // Create the check-in
  const checkIn = await WeeklyCheckIn.create({
    goal: goalId,
    learner: req.user.id,
    mentorship: goal.mentorship,
    weekStartDate: weekStart,
    weekEndDate: weekEnd,
    plannedTasks,
    completedTasks: completedTasks || [],
    blockers: blockers || '',
    submittedAt,
    isLate,
  });

  // Reset inactivity counter for this mentorship
  await resetInactivityOnCheckIn(goal.mentorship);

  res.status(201).json({
    success: true,
    data: checkIn,
    message: isLate ? 'Check-in submitted (marked as late)' : 'Check-in submitted successfully',
  });
});

// @desc    Get my check-ins for a goal
// @route   GET /api/check-ins/goal/:goalId
// @access  Private (Learner only)
const getMyCheckInsForGoal = asyncHandler(async (req, res, next) => {
  const { goalId } = req.params;

  // Find the goal
  const goal = await Goal.findById(goalId);
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }

  // Verify learner owns this goal
  if (goal.learner.toString() !== req.user.id) {
    return next(new AppError('Not authorized to view check-ins for this goal', 403));
  }

  const checkIns = await WeeklyCheckIn.find({ goal: goalId })
    .sort({ weekStartDate: -1 });

  res.status(200).json({
    success: true,
    count: checkIns.length,
    data: checkIns,
  });
});

// @desc    Get all my check-ins
// @route   GET /api/check-ins/my
// @access  Private (Learner only)
const getAllMyCheckIns = asyncHandler(async (req, res, next) => {
  const checkIns = await WeeklyCheckIn.find({ learner: req.user.id })
    .populate('goal', 'title status')
    .sort({ weekStartDate: -1 });

  res.status(200).json({
    success: true,
    count: checkIns.length,
    data: checkIns,
  });
});

// @desc    Get check-ins for a mentee's goal (Mentor view)
// @route   GET /api/check-ins/mentee/:menteeId/goal/:goalId
// @access  Private (Mentor only)
const getMenteeCheckInsForGoal = asyncHandler(async (req, res, next) => {
  const { menteeId, goalId } = req.params;

  // Verify this is the mentor's mentee
  const mentorship = await MentorshipRequest.findOne({
    mentor: req.user.id,
    learner: menteeId,
    status: { $in: ['active', 'at-risk', 'paused'] },
  });

  if (!mentorship) {
    return next(new AppError('This learner is not your mentee', 403));
  }

  // Verify the goal belongs to this mentee
  const goal = await Goal.findById(goalId);
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }

  if (goal.learner.toString() !== menteeId) {
    return next(new AppError('This goal does not belong to the specified mentee', 400));
  }

  const checkIns = await WeeklyCheckIn.find({ goal: goalId })
    .sort({ weekStartDate: -1 });

  res.status(200).json({
    success: true,
    count: checkIns.length,
    data: checkIns,
  });
});

// @desc    Get all check-ins for a mentee (Mentor view)
// @route   GET /api/check-ins/mentee/:menteeId
// @access  Private (Mentor only)
const getMenteeAllCheckIns = asyncHandler(async (req, res, next) => {
  const { menteeId } = req.params;

  // Verify this is the mentor's mentee
  const mentorship = await MentorshipRequest.findOne({
    mentor: req.user.id,
    learner: menteeId,
    status: { $in: ['active', 'at-risk', 'paused'] },
  });

  if (!mentorship) {
    return next(new AppError('This learner is not your mentee', 403));
  }

  const checkIns = await WeeklyCheckIn.find({
    mentorship: mentorship._id,
  })
    .populate('goal', 'title status')
    .sort({ weekStartDate: -1 });

  res.status(200).json({
    success: true,
    count: checkIns.length,
    data: checkIns,
  });
});

// @desc    Get mentee consistency summary (Mentor view)
// @route   GET /api/check-ins/mentee/:menteeId/summary
// @access  Private (Mentor only)
const getMenteeConsistencySummary = asyncHandler(async (req, res, next) => {
  const { menteeId } = req.params;
  const weeksBack = parseInt(req.query.weeks) || 12;

  // Verify this is the mentor's mentee
  const mentorship = await MentorshipRequest.findOne({
    mentor: req.user.id,
    learner: menteeId,
    status: { $in: ['active', 'at-risk', 'paused'] },
  });

  if (!mentorship) {
    return next(new AppError('This learner is not your mentee', 403));
  }

  const summary = await getLearnerConsistencySummary(mentorship._id, weeksBack);

  if (!summary) {
    return next(new AppError('Could not generate consistency summary', 500));
  }

  res.status(200).json({
    success: true,
    data: summary,
  });
});

// @desc    Get goal timeline with check-in status
// @route   GET /api/check-ins/timeline/:goalId
// @access  Private
const getGoalTimeline = asyncHandler(async (req, res, next) => {
  const { goalId } = req.params;
  const weeksBack = parseInt(req.query.weeks) || 12;

  const goal = await Goal.findById(goalId).populate('learner', 'name');

  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }

  // Authorization check
  if (req.user.role === 'learner') {
    if (goal.learner._id.toString() !== req.user.id) {
      return next(new AppError('Not authorized to view this timeline', 403));
    }
  } else if (req.user.role === 'mentor') {
    const mentorship = await MentorshipRequest.findOne({
      mentor: req.user.id,
      learner: goal.learner._id,
      status: { $in: ['active', 'at-risk', 'paused'] },
    });

    if (!mentorship) {
      return next(new AppError('Not authorized to view this timeline', 403));
    }
  }

  // Build timeline
  const timeline = [];
  const today = new Date();
  const goalCreatedAt = new Date(goal.createdAt);

  for (let i = 0; i < weeksBack; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - (i * 7));
    const { weekStart, weekEnd } = getWeekBoundaries(checkDate);

    // Skip weeks before goal was created
    if (weekEnd < goalCreatedAt) {
      continue;
    }

    const checkIn = await WeeklyCheckIn.findOne({
      goal: goalId,
      weekStartDate: weekStart,
    });

    const weekData = {
      weekStart,
      weekEnd,
      status: 'missed',
      checkIn: null,
    };

    if (checkIn) {
      weekData.status = checkIn.isLate ? 'late' : 'submitted';
      weekData.checkIn = {
        id: checkIn._id,
        plannedTasks: checkIn.plannedTasks,
        completedTasks: checkIn.completedTasks,
        blockers: checkIn.blockers,
        submittedAt: checkIn.submittedAt,
        isLate: checkIn.isLate,
      };
    } else if (weekEnd >= today) {
      weekData.status = 'current';
    }

    timeline.push(weekData);
  }

  res.status(200).json({
    success: true,
    data: {
      goal: {
        id: goal._id,
        title: goal.title,
        status: goal.status,
        createdAt: goal.createdAt,
      },
      timeline,
    },
  });
});

module.exports = {
  submitCheckIn,
  getMyCheckInsForGoal,
  getAllMyCheckIns,
  getMenteeCheckInsForGoal,
  getMenteeAllCheckIns,
  getMenteeConsistencySummary,
  getGoalTimeline,
};
