const { User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  calculateMentorReputation,
  getMentorProfileWithReputation,
  getAllMentorsWithReputation,
} = require('../services/reputationService');
const {
  calculateLearnerReliability,
  getLearnerReliabilitySummary,
} = require('../services/reliabilityService');

/**
 * Reputation Controller
 * Handles reputation and reliability score endpoints
 */

// @desc    Get mentor reputation by ID
// @route   GET /api/reputation/mentor/:mentorId
// @access  Private (any authenticated user)
const getMentorReputation = asyncHandler(async (req, res, next) => {
  const { mentorId } = req.params;

  // Verify mentor exists
  const mentor = await User.findById(mentorId);
  if (!mentor || mentor.role !== 'mentor') {
    return next(new AppError('Mentor not found', 404));
  }

  const profileWithReputation = await getMentorProfileWithReputation(mentorId);

  if (!profileWithReputation) {
    return next(new AppError('Mentor profile not found', 404));
  }

  res.status(200).json({
    success: true,
    data: profileWithReputation,
  });
});

// @desc    Get all mentors with reputation (for discovery)
// @route   GET /api/reputation/mentors
// @access  Private (any authenticated user)
const getAllMentorsReputation = asyncHandler(async (req, res, next) => {
  const { sortBy, onlyAvailable } = req.query;

  const mentors = await getAllMentorsWithReputation({
    sortBy: sortBy || 'rating',
    onlyAvailable: onlyAvailable === 'true',
  });

  res.status(200).json({
    success: true,
    count: mentors.length,
    data: mentors,
  });
});

// @desc    Get learner reliability summary (for mentor decision making)
// @route   GET /api/reputation/learner/:learnerId
// @access  Private (Mentor only)
const getLearnerReliabilityInfo = asyncHandler(async (req, res, next) => {
  const { learnerId } = req.params;

  // Verify learner exists
  const learner = await User.findById(learnerId);
  if (!learner || learner.role !== 'learner') {
    return next(new AppError('Learner not found', 404));
  }

  const summary = await getLearnerReliabilitySummary(learnerId);

  res.status(200).json({
    success: true,
    data: summary,
  });
});

// @desc    Get my own reputation (for mentor to see their own stats)
// @route   GET /api/reputation/me
// @access  Private (Mentor only)
const getMyReputation = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'mentor') {
    return next(new AppError('Only mentors have reputation scores', 400));
  }

  const profileWithReputation = await getMentorProfileWithReputation(req.user.id);

  if (!profileWithReputation) {
    return next(new AppError('Please set up your mentor profile first', 404));
  }

  res.status(200).json({
    success: true,
    data: profileWithReputation,
  });
});

// @desc    Get my reliability (for learner to see their own score)
// @route   GET /api/reputation/my-reliability
// @access  Private (Learner only)
const getMyReliability = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'learner') {
    return next(new AppError('Only learners have reliability scores', 400));
  }

  const reliability = await calculateLearnerReliability(req.user.id);

  res.status(200).json({
    success: true,
    data: reliability,
  });
});

module.exports = {
  getMentorReputation,
  getAllMentorsReputation,
  getLearnerReliabilityInfo,
  getMyReputation,
  getMyReliability,
};
