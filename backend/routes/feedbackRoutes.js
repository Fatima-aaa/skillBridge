const express = require('express');
const { body, param } = require('express-validator');
const {
  submitFeedback,
  getMySubmittedFeedback,
  canSubmitFeedback,
  getLearnerRatings,
} = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Mentor routes

// Submit rating for learner
router.post(
  '/',
  protect,
  authorize('mentor'),
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
  submitFeedback
);

// Get my submitted ratings
router.get('/my', protect, authorize('mentor'), getMySubmittedFeedback);

// Check if can submit rating for a mentorship
router.get(
  '/can-submit/:mentorshipId',
  protect,
  authorize('mentor'),
  [param('mentorshipId').isMongoId().withMessage('Invalid mentorship ID')],
  validate,
  canSubmitFeedback
);

// Public routes (authenticated)

// Get rating stats for a learner (anonymous)
router.get(
  '/learner/:learnerId',
  protect,
  [param('learnerId').isMongoId().withMessage('Invalid learner ID')],
  validate,
  getLearnerRatings
);

module.exports = router;
