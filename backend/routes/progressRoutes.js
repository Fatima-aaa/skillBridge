const express = require('express');
const { body, param } = require('express-validator');
const {
  createProgressUpdate,
  getProgressUpdates,
} = require('../controllers/progressController');
const { protect, authorize, checkSuspended } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Create progress update (Learner only)
router.post(
  '/:goalId',
  protect,
  authorize('learner'),
  checkSuspended,
  [
    param('goalId').isMongoId().withMessage('Invalid goal ID'),
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Content is required')
      .isLength({ max: 1000 })
      .withMessage('Content cannot exceed 1000 characters'),
  ],
  validate,
  createProgressUpdate
);

// Get progress updates (Both learner and mentor can view with proper auth)
router.get(
  '/:goalId',
  protect,
  [param('goalId').isMongoId().withMessage('Invalid goal ID')],
  validate,
  getProgressUpdates
);

module.exports = router;
