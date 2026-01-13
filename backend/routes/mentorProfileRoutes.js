const express = require('express');
const { body } = require('express-validator');
const {
  createProfile,
  updateProfile,
  getMyProfile,
  getAllProfiles,
  getProfile,
} = require('../controllers/mentorProfileController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Public routes (still need auth to view)
router.get('/', protect, getAllProfiles);
router.get('/me', protect, authorize('mentor'), getMyProfile);
router.get('/:id', protect, getProfile);

// Mentor-only routes
router.post(
  '/',
  protect,
  authorize('mentor'),
  [
    body('skills')
      .isArray({ min: 1 })
      .withMessage('At least one skill is required'),
    body('skills.*')
      .trim()
      .notEmpty()
      .withMessage('Skill cannot be empty'),
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters'),
    body('capacity')
      .notEmpty()
      .withMessage('Capacity is required')
      .isInt({ min: 1, max: 20 })
      .withMessage('Capacity must be between 1 and 20'),
  ],
  validate,
  createProfile
);

router.put(
  '/',
  protect,
  authorize('mentor'),
  [
    body('skills')
      .optional()
      .isArray({ min: 1 })
      .withMessage('At least one skill is required'),
    body('skills.*')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Skill cannot be empty'),
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters'),
    body('capacity')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Capacity must be between 1 and 20'),
  ],
  validate,
  updateProfile
);

module.exports = router;
