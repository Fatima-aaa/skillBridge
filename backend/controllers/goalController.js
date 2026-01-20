const { Goal, MentorshipRequest, ProgressUpdate } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// @desc    Create a goal (Learner only, must have active mentorship)
// @route   POST /api/goals
// @access  Private (Learner only)
const createGoal = asyncHandler(async (req, res, next) => {
  const { title, description } = req.body;

  // Check for active mentorship (not paused)
  const activeMentorship = await MentorshipRequest.findOne({
    learner: req.user.id,
    status: { $in: ['active', 'at-risk'] },
  });

  if (!activeMentorship) {
    return next(
      new AppError('You must have an active mentorship to create goals', 400)
    );
  }

  const goal = await Goal.create({
    mentorship: activeMentorship._id,
    learner: req.user.id,
    title,
    description,
  });

  res.status(201).json({
    success: true,
    data: goal,
  });
});

// @desc    Get learner's goals
// @route   GET /api/goals
// @access  Private (Learner only)
const getMyGoals = asyncHandler(async (req, res, next) => {
  const goals = await Goal.find({ learner: req.user.id }).sort('-createdAt');

  res.status(200).json({
    success: true,
    count: goals.length,
    data: goals,
  });
});

// @desc    Get goals for a specific mentee (Mentor only)
// @route   GET /api/goals/mentee/:menteeId
// @access  Private (Mentor only)
const getMenteeGoals = asyncHandler(async (req, res, next) => {
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

  const goals = await Goal.find({
    learner: menteeId,
    mentorship: mentorship._id,
  }).sort('-createdAt');

  res.status(200).json({
    success: true,
    count: goals.length,
    data: goals,
  });
});

// @desc    Get single goal
// @route   GET /api/goals/:id
// @access  Private
const getGoal = asyncHandler(async (req, res, next) => {
  const goal = await Goal.findById(req.params.id).populate('learner', 'name');

  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }

  // Authorization: learner owns the goal OR mentor is connected to the learner
  if (req.user.role === 'learner') {
    if (goal.learner._id.toString() !== req.user.id) {
      return next(new AppError('Not authorized to view this goal', 403));
    }
  } else if (req.user.role === 'mentor') {
    const mentorship = await MentorshipRequest.findOne({
      mentor: req.user.id,
      learner: goal.learner._id,
      status: { $in: ['active', 'at-risk', 'paused'] },
    });

    if (!mentorship) {
      return next(new AppError('Not authorized to view this goal', 403));
    }
  }

  res.status(200).json({
    success: true,
    data: goal,
  });
});

// @desc    Update goal status (Learner only)
// @route   PUT /api/goals/:id
// @access  Private (Learner only)
const updateGoal = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  let goal = await Goal.findById(req.params.id);

  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }

  // Verify ownership
  if (goal.learner.toString() !== req.user.id) {
    return next(new AppError('Not authorized to update this goal', 403));
  }

  if (!['active', 'completed'].includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  goal.status = status;
  await goal.save();

  res.status(200).json({
    success: true,
    data: goal,
  });
});

module.exports = {
  createGoal,
  getMyGoals,
  getMenteeGoals,
  getGoal,
  updateGoal,
};
