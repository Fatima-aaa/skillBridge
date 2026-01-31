const { Goal, MentorshipRequest, ProgressUpdate } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { parsePaginationParams, buildPaginationMeta } = require('../utils/pagination');

// @desc    Create a goal for mentee (Mentor only)
// @route   POST /api/goals
// @access  Private (Mentor only)
const createGoal = asyncHandler(async (req, res, next) => {
  const { title, description, menteeId } = req.body;

  // Find the mentorship where the current user is the mentor and menteeId is the learner
  const mentorship = await MentorshipRequest.findOne({
    mentor: req.user.id,
    learner: menteeId,
    status: { $in: ['active', 'at-risk'] },
  });

  if (!mentorship) {
    return next(
      new AppError('You do not have an active mentorship with this learner', 400)
    );
  }

  const goal = await Goal.create({
    mentorship: mentorship._id,
    learner: menteeId,
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
// @query   page - Page number (default: 1)
// @query   limit - Items per page (default: 20)
// @query   status - Filter by status (active, completed)
const getMyGoals = asyncHandler(async (req, res, next) => {
  const { status } = req.query;
  const { page, limit, skip } = parsePaginationParams(req.query);

  const query = { learner: req.user.id };
  if (status && ['active', 'completed'].includes(status)) {
    query.status = status;
  }

  const [goals, total] = await Promise.all([
    Goal.find(query).sort('-createdAt').skip(skip).limit(limit),
    Goal.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: goals,
    pagination: buildPaginationMeta(total, page, limit),
  });
});

// @desc    Get goals for a specific mentee (Mentor only)
// @route   GET /api/goals/mentee/:menteeId
// @access  Private (Mentor only)
// @query   page - Page number (default: 1)
// @query   limit - Items per page (default: 20)
// @query   status - Filter by status (active, completed)
const getMenteeGoals = asyncHandler(async (req, res, next) => {
  const { menteeId } = req.params;
  const { status } = req.query;
  const { page, limit, skip } = parsePaginationParams(req.query);

  // Verify this is the mentor's mentee
  const mentorship = await MentorshipRequest.findOne({
    mentor: req.user.id,
    learner: menteeId,
    status: { $in: ['active', 'at-risk', 'paused'] },
  });

  if (!mentorship) {
    return next(new AppError('This learner is not your mentee', 403));
  }

  const query = { learner: menteeId, mentorship: mentorship._id };
  if (status && ['active', 'completed'].includes(status)) {
    query.status = status;
  }

  const [goals, total] = await Promise.all([
    Goal.find(query).sort('-createdAt').skip(skip).limit(limit),
    Goal.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: goals,
    pagination: buildPaginationMeta(total, page, limit),
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

// @desc    Update goal status (Mentor only - mark as completed)
// @route   PUT /api/goals/:id
// @access  Private (Mentor only)
const updateGoal = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  let goal = await Goal.findById(req.params.id);

  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }

  // Verify mentor has mentorship with this learner
  const mentorship = await MentorshipRequest.findOne({
    mentor: req.user.id,
    learner: goal.learner,
    status: { $in: ['active', 'at-risk', 'paused'] },
  });

  if (!mentorship) {
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
