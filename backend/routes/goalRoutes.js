const express = require('express');
const { body, param } = require('express-validator');
const {
  createGoal,
  getMyGoals,
  getMenteeGoals,
  getGoal,
  updateGoal,
} = require('../controllers/goalController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Learner routes
router.post(
  '/',
  protect,
  authorize('learner'),
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 100 })
      .withMessage('Title cannot exceed 100 characters'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
  ],
  validate,
  createGoal
);

router.get('/', protect, authorize('learner'), getMyGoals);

router.put(
  '/:id',
  protect,
  authorize('learner'),
  [
    param('id').isMongoId().withMessage('Invalid goal ID'),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['active', 'completed'])
      .withMessage('Status must be either active or completed'),
  ],
  validate,
  updateGoal
);

// Mentor routes
router.get(
  '/mentee/:menteeId',
  protect,
  authorize('mentor'),
  [param('menteeId').isMongoId().withMessage('Invalid mentee ID')],
  validate,
  getMenteeGoals
);

// Shared route - both can access with proper authorization
router.get(
  '/:id',
  protect,
  [param('id').isMongoId().withMessage('Invalid goal ID')],
  validate,
  getGoal
);

module.exports = router;
