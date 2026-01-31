const { ProgressUpdate, Goal, MentorshipRequest } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { resetInactivityOnProgressUpdate } = require('../services/inactivityService');
const { parsePaginationParams, buildPaginationMeta } = require('../utils/pagination');

// @desc    Create progress update for a goal
// @route   POST /api/progress/:goalId
// @access  Private (Learner only)
const createProgressUpdate = asyncHandler(async (req, res, next) => {
  const { goalId } = req.params;
  const { content } = req.body;

  // Find the goal
  const goal = await Goal.findById(goalId);

  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }

  // Verify learner owns this goal
  if (goal.learner.toString() !== req.user.id) {
    return next(new AppError('Not authorized to update this goal', 403));
  }

  const progressUpdate = await ProgressUpdate.create({
    goal: goalId,
    learner: req.user.id,
    content,
  });

  // Reset inactivity status if mentorship was at-risk
  await resetInactivityOnProgressUpdate(goal.mentorship);

  res.status(201).json({
    success: true,
    data: progressUpdate,
  });
});

// @desc    Get progress updates for a goal
// @route   GET /api/progress/:goalId
// @access  Private
// @query   page - Page number (default: 1)
// @query   limit - Items per page (default: 20)
const getProgressUpdates = asyncHandler(async (req, res, next) => {
  const { goalId } = req.params;
  const { page, limit, skip } = parsePaginationParams(req.query);

  const goal = await Goal.findById(goalId);

  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }

  // Authorization check
  if (req.user.role === 'learner') {
    if (goal.learner.toString() !== req.user.id) {
      return next(new AppError('Not authorized to view these updates', 403));
    }
  } else if (req.user.role === 'mentor') {
    // Check if this learner is mentor's mentee
    const mentorship = await MentorshipRequest.findOne({
      mentor: req.user.id,
      learner: goal.learner,
      status: { $in: ['active', 'at-risk', 'paused'] },
    });

    if (!mentorship) {
      return next(new AppError('Not authorized to view these updates', 403));
    }
  }

  const [updates, total] = await Promise.all([
    ProgressUpdate.find({ goal: goalId })
      .populate('learner', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    ProgressUpdate.countDocuments({ goal: goalId }),
  ]);

  res.status(200).json({
    success: true,
    data: updates,
    pagination: buildPaginationMeta(total, page, limit),
  });
});

module.exports = {
  createProgressUpdate,
  getProgressUpdates,
};
