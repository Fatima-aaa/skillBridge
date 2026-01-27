const express = require('express');
const { body, param, query } = require('express-validator');
const {
  submitCheckIn,
  getMyCheckInsForGoal,
  getAllMyCheckIns,
  getMenteeCheckInsForGoal,
  getMenteeAllCheckIns,
  getMenteeConsistencySummary,
  getGoalTimeline,
} = require('../controllers/weeklyCheckInController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Learner routes

// Submit a check-in for a goal
router.post(
  '/:goalId',
  protect,
  authorize('learner'),
  [
    param('goalId')
      .isMongoId()
      .withMessage('Invalid goal ID'),
    body('plannedTasks')
      .isArray({ min: 1, max: 10 })
      .withMessage('Planned tasks must be an array with 1-10 items'),
    body('plannedTasks.*')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Each planned task must be a non-empty string')
      .isLength({ max: 200 })
      .withMessage('Each planned task cannot exceed 200 characters'),
    body('completedTasks')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Completed tasks must be an array with max 10 items'),
    body('completedTasks.*')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Each completed task cannot exceed 200 characters'),
    body('blockers')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Blockers cannot exceed 500 characters'),
    body('weekStartDate')
      .optional()
      .isISO8601()
      .withMessage('Week start date must be a valid ISO date'),
  ],
  validate,
  submitCheckIn
);

// Get all my check-ins
router.get(
  '/my',
  protect,
  authorize('learner'),
  getAllMyCheckIns
);

// Get my check-ins for a specific goal
router.get(
  '/goal/:goalId',
  protect,
  authorize('learner'),
  [
    param('goalId')
      .isMongoId()
      .withMessage('Invalid goal ID'),
  ],
  validate,
  getMyCheckInsForGoal
);

// Goal timeline (available to both learner and mentor with authorization)
router.get(
  '/timeline/:goalId',
  protect,
  [
    param('goalId')
      .isMongoId()
      .withMessage('Invalid goal ID'),
    query('weeks')
      .optional()
      .isInt({ min: 1, max: 52 })
      .withMessage('Weeks must be between 1 and 52'),
  ],
  validate,
  getGoalTimeline
);

// Mentor routes

// Get all check-ins for a mentee
router.get(
  '/mentee/:menteeId',
  protect,
  authorize('mentor'),
  [
    param('menteeId')
      .isMongoId()
      .withMessage('Invalid mentee ID'),
  ],
  validate,
  getMenteeAllCheckIns
);

// Get mentee consistency summary
router.get(
  '/mentee/:menteeId/summary',
  protect,
  authorize('mentor'),
  [
    param('menteeId')
      .isMongoId()
      .withMessage('Invalid mentee ID'),
    query('weeks')
      .optional()
      .isInt({ min: 1, max: 52 })
      .withMessage('Weeks must be between 1 and 52'),
  ],
  validate,
  getMenteeConsistencySummary
);

// Get check-ins for a specific goal of a mentee
router.get(
  '/mentee/:menteeId/goal/:goalId',
  protect,
  authorize('mentor'),
  [
    param('menteeId')
      .isMongoId()
      .withMessage('Invalid mentee ID'),
    param('goalId')
      .isMongoId()
      .withMessage('Invalid goal ID'),
  ],
  validate,
  getMenteeCheckInsForGoal
);

module.exports = router;
