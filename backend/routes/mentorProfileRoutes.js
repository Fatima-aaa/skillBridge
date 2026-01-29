const express = require('express');
const { body, query, param } = require('express-validator');
const {
  createProfile,
  updateProfile,
  getMyProfile,
  getAllProfiles,
  getProfile,
} = require('../controllers/mentorProfileController');
const { protect, authorize, checkSuspended } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Public routes (still need auth to view)
// Phase 3: Enhanced with reputation data and sorting
router.get(
  '/',
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
    query('includeReputation')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('includeReputation must be true or false'),
  ],
  validate,
  getAllProfiles
);

router.get('/me', protect, authorize('mentor'), getMyProfile);

router.get(
  '/:id',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid profile ID'),
    query('includeReputation')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('includeReputation must be true or false'),
  ],
  validate,
  getProfile
);

// Mentor-only routes
router.post(
  '/',
  protect,
  authorize('mentor'),
  checkSuspended,
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
  checkSuspended,
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
