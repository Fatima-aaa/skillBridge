const { LearnerFeedback, MentorshipRequest, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Feedback Controller
 * Handles mentor → learner anonymous ratings after mentorship completion
 */

// @desc    Submit a rating for learner (Mentor only)
// @route   POST /api/feedback
// @access  Private (Mentor only)
const submitFeedback = asyncHandler(async (req, res, next) => {
  const { mentorshipId, rating } = req.body;

  // Validate rating
  if (!rating || rating < 1 || rating > 5) {
    return next(new AppError('Rating must be between 1 and 5', 400));
  }

  // Find the mentorship
  const mentorship = await MentorshipRequest.findById(mentorshipId);

  if (!mentorship) {
    return next(new AppError('Mentorship not found', 404));
  }

  // Verify mentor owns this mentorship
  if (mentorship.mentor.toString() !== req.user.id) {
    return next(new AppError('Not authorized to rate this mentorship', 403));
  }

  // Verify mentorship is completed
  if (mentorship.status !== 'completed') {
    return next(new AppError('Can only rate completed mentorships', 400));
  }

  // Check if rating already exists
  const existingFeedback = await LearnerFeedback.findOne({ mentorship: mentorshipId });
  if (existingFeedback) {
    return next(new AppError('Rating already submitted for this mentorship', 400));
  }

  // Create the rating
  const feedback = await LearnerFeedback.create({
    mentorship: mentorshipId,
    mentor: req.user.id,
    learner: mentorship.learner,
    rating,
  });

  res.status(201).json({
    success: true,
    data: feedback,
    message: 'Rating submitted successfully',
  });
});

// @desc    Get my submitted ratings (Mentor only)
// @route   GET /api/feedback/my
// @access  Private (Mentor only)
const getMySubmittedFeedback = asyncHandler(async (req, res, next) => {
  const feedback = await LearnerFeedback.find({ mentor: req.user.id })
    .populate('learner', 'name')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: feedback.length,
    data: feedback,
  });
});

// @desc    Check if mentor can rate a mentorship
// @route   GET /api/feedback/can-submit/:mentorshipId
// @access  Private (Mentor only)
const canSubmitFeedback = asyncHandler(async (req, res, next) => {
  const { mentorshipId } = req.params;

  const mentorship = await MentorshipRequest.findById(mentorshipId);

  if (!mentorship) {
    return next(new AppError('Mentorship not found', 404));
  }

  // Verify mentor owns this mentorship
  if (mentorship.mentor.toString() !== req.user.id) {
    return next(new AppError('Not authorized to view this mentorship', 403));
  }

  const existingFeedback = await LearnerFeedback.findOne({ mentorship: mentorshipId });

  res.status(200).json({
    success: true,
    data: {
      canSubmit: mentorship.status === 'completed' && !existingFeedback,
      status: mentorship.status,
      hasSubmitted: !!existingFeedback,
    },
  });
});

// @desc    Get rating stats for a specific learner (public, anonymous)
// @route   GET /api/feedback/learner/:learnerId
// @access  Private (any authenticated user)
const getLearnerRatings = asyncHandler(async (req, res, next) => {
  const { learnerId } = req.params;

  // Verify learner exists
  const learner = await User.findById(learnerId);
  if (!learner || learner.role !== 'learner') {
    return next(new AppError('Learner not found', 404));
  }

  // Get all ratings for this learner
  const feedback = await LearnerFeedback.find({ learner: learnerId });

  // Calculate aggregate stats (anonymous - no details)
  let stats = null;
  if (feedback.length > 0) {
    const totalRatings = feedback.length;
    const avgRating = feedback.reduce((sum, f) => sum + f.rating, 0) / totalRatings;

    stats = {
      totalRatings,
      averageRating: parseFloat(avgRating.toFixed(1)),
    };
  }

  res.status(200).json({
    success: true,
    data: {
      learnerId,
      stats,
    },
  });
});

module.exports = {
  submitFeedback,
  getMySubmittedFeedback,
  canSubmitFeedback,
  getLearnerRatings,
};
