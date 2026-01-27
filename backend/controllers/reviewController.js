const { MentorReview, MentorshipRequest, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Review Controller
 * Handles learner → mentor anonymous ratings after mentorship completion
 */

// @desc    Submit a rating for mentor (Learner only)
// @route   POST /api/reviews
// @access  Private (Learner only)
const submitReview = asyncHandler(async (req, res, next) => {
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

  // Verify learner owns this mentorship
  if (mentorship.learner.toString() !== req.user.id) {
    return next(new AppError('Not authorized to rate this mentorship', 403));
  }

  // Verify mentorship is completed
  if (mentorship.status !== 'completed') {
    return next(new AppError('Can only rate completed mentorships', 400));
  }

  // Check if rating already exists
  const existingReview = await MentorReview.findOne({ mentorship: mentorshipId });
  if (existingReview) {
    return next(new AppError('Rating already submitted for this mentorship', 400));
  }

  // Create the rating
  const review = await MentorReview.create({
    mentorship: mentorshipId,
    reviewer: req.user.id,
    mentor: mentorship.mentor,
    rating,
  });

  res.status(201).json({
    success: true,
    data: review,
    message: 'Rating submitted successfully',
  });
});

// @desc    Get rating stats for a specific mentor (public, anonymous)
// @route   GET /api/reviews/mentor/:mentorId
// @access  Private (any authenticated user)
const getMentorReviews = asyncHandler(async (req, res, next) => {
  const { mentorId } = req.params;

  // Verify mentor exists
  const mentor = await User.findById(mentorId);
  if (!mentor || mentor.role !== 'mentor') {
    return next(new AppError('Mentor not found', 404));
  }

  // Get all ratings for this mentor (anonymous - don't expose reviewer)
  const reviews = await MentorReview.find({ mentor: mentorId })
    .select('-reviewer -mentorship') // Anonymous
    .sort('-createdAt');

  // Calculate aggregate stats
  let stats = null;
  if (reviews.length > 0) {
    const totalRatings = reviews.length;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

    stats = {
      totalRatings,
      averageRating: parseFloat(avgRating.toFixed(1)),
    };
  }

  res.status(200).json({
    success: true,
    count: reviews.length,
    stats,
    // Don't return individual reviews for anonymity - just stats
  });
});

// @desc    Get my submitted ratings (Learner)
// @route   GET /api/reviews/my
// @access  Private (Learner only)
const getMySubmittedReviews = asyncHandler(async (req, res, next) => {
  const reviews = await MentorReview.find({ reviewer: req.user.id })
    .populate('mentor', 'name')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: reviews.length,
    data: reviews,
  });
});

// @desc    Check if learner can rate a mentorship
// @route   GET /api/reviews/can-review/:mentorshipId
// @access  Private (Learner only)
const canReviewMentorship = asyncHandler(async (req, res, next) => {
  const { mentorshipId } = req.params;

  const mentorship = await MentorshipRequest.findById(mentorshipId);

  if (!mentorship) {
    return next(new AppError('Mentorship not found', 404));
  }

  // Verify learner owns this mentorship
  if (mentorship.learner.toString() !== req.user.id) {
    return next(new AppError('Not authorized to view this mentorship', 403));
  }

  const existingReview = await MentorReview.findOne({ mentorship: mentorshipId });

  res.status(200).json({
    success: true,
    data: {
      canReview: mentorship.status === 'completed' && !existingReview,
      status: mentorship.status,
      hasReviewed: !!existingReview,
    },
  });
});

module.exports = {
  submitReview,
  getMentorReviews,
  getMySubmittedReviews,
  canReviewMentorship,
};
