const express = require('express');
const { body, param } = require('express-validator');
const {
  submitReview,
  getMentorReviews,
  getMySubmittedReviews,
  canReviewMentorship,
} = require('../controllers/reviewController');
const { protect, authorize, checkSuspended } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Learner routes

// Submit a rating for mentor
router.post(
  '/',
  protect,
  authorize('learner'),
  checkSuspended,
  [
    body('mentorshipId')
      .notEmpty()
      .withMessage('Mentorship ID is required')
      .isMongoId()
      .withMessage('Invalid mentorship ID'),
    body('rating')
      .notEmpty()
      .withMessage('Rating is required')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
  ],
  validate,
  submitReview
);

// Get my submitted ratings
router.get('/my', protect, authorize('learner'), getMySubmittedReviews);

// Check if can rate a mentorship
router.get(
  '/can-review/:mentorshipId',
  protect,
  authorize('learner'),
  [param('mentorshipId').isMongoId().withMessage('Invalid mentorship ID')],
  validate,
  canReviewMentorship
);

// Public routes (authenticated)

// Get rating stats for a mentor (anonymous, for mentor discovery)
router.get(
  '/mentor/:mentorId',
  protect,
  [param('mentorId').isMongoId().withMessage('Invalid mentor ID')],
  validate,
  getMentorReviews
);

module.exports = router;
