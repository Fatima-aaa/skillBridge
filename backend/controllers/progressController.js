const { ProgressUpdate, Goal, MentorshipRequest } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

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

  res.status(201).json({
    success: true,
    data: progressUpdate,
  });
});

// @desc    Get progress updates for a goal
// @route   GET /api/progress/:goalId
// @access  Private
const getProgressUpdates = asyncHandler(async (req, res, next) => {
  const { goalId } = req.params;

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

  const updates = await ProgressUpdate.find({ goal: goalId })
    .populate('learner', 'name')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: updates.length,
    data: updates,
  });
});

module.exports = {
  createProgressUpdate,
  getProgressUpdates,
};
