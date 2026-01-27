const express = require('express');
const { param, query } = require('express-validator');
const {
  getMentorReputation,
  getAllMentorsReputation,
  getLearnerReliabilityInfo,
  getMyReputation,
  getMyReliability,
} = require('../controllers/reputationController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Self-view routes

// Get my reputation (mentor)
router.get('/me', protect, authorize('mentor'), getMyReputation);

// Get my reliability (learner)
router.get('/my-reliability', protect, authorize('learner'), getMyReliability);

// Mentor discovery routes

// Get all mentors with reputation (for discovery, sorting)
router.get(
  '/mentors',
  protect,
  [
    query('sortBy')
      .optional()
      .isIn(['rating', 'experience', 'trust', 'reviews', 'newest'])
      .withMessage('Invalid sort option'),
    query('onlyAvailable')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('onlyAvailable must be true or false'),
  ],
  validate,
  getAllMentorsReputation
);

// Get specific mentor reputation
router.get(
  '/mentor/:mentorId',
  protect,
  [param('mentorId').isMongoId().withMessage('Invalid mentor ID')],
  validate,
  getMentorReputation
);

// Mentor-only routes

// Get learner reliability (for mentor decision making before accepting)
router.get(
  '/learner/:learnerId',
  protect,
  authorize('mentor'),
  [param('learnerId').isMongoId().withMessage('Invalid learner ID')],
  validate,
  getLearnerReliabilityInfo
);

module.exports = router;
