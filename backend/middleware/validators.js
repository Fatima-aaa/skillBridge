const { body, param, query } = require('express-validator');

/**
 * Validation Rules
 * Reusable validation chains for different endpoints
 */

const validators = {
  // Pagination query parameters
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('sortBy')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Sort field is too long'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
  ],

  // MongoDB ObjectId parameter
  mongoId: (field) => [
    param(field)
      .notEmpty()
      .withMessage(`${field} is required`)
      .isMongoId()
      .withMessage(`${field} must be a valid ID`),
  ],

  // Auth validators
  auth: {
    register: [
      body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be 2-50 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
      body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
      body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
      body('role')
        .notEmpty()
        .withMessage('Role is required')
        .isIn(['learner', 'mentor'])
        .withMessage('Role must be learner or mentor'),
    ],
    login: [
      body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
      body('password')
        .notEmpty()
        .withMessage('Password is required'),
    ],
  },

  // Mentor profile validators
  mentorProfile: {
    create: [
      body('skills')
        .isArray({ min: 1 })
        .withMessage('At least one skill is required'),
      body('skills.*')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Each skill must be 1-50 characters'),
      body('bio')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio cannot exceed 500 characters'),
      body('capacity')
        .notEmpty()
        .withMessage('Capacity is required')
        .isInt({ min: 1, max: 20 })
        .withMessage('Capacity must be between 1 and 20'),
    ],
    update: [
      body('skills')
        .optional()
        .isArray({ min: 1 })
        .withMessage('At least one skill is required'),
      body('skills.*')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Each skill must be 1-50 characters'),
      body('bio')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio cannot exceed 500 characters'),
      body('capacity')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('Capacity must be between 1 and 20'),
    ],
  },

  // Mentorship validators
  mentorship: {
    create: [
      body('mentorId')
        .notEmpty()
        .withMessage('Mentor ID is required')
        .isMongoId()
        .withMessage('Invalid mentor ID'),
      body('message')
        .optional()
        .trim()
        .isLength({ max: 300 })
        .withMessage('Message cannot exceed 300 characters'),
    ],
    updateStatus: [
      body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['active', 'rejected'])
        .withMessage('Status must be active or rejected'),
    ],
    pause: [
      body('reason')
        .trim()
        .notEmpty()
        .withMessage('Reason is required')
        .isLength({ min: 5, max: 500 })
        .withMessage('Reason must be 5-500 characters'),
    ],
  },

  // Goal validators
  goal: {
    create: [
      body('menteeId')
        .notEmpty()
        .withMessage('Mentee ID is required')
        .isMongoId()
        .withMessage('Invalid mentee ID'),
      body('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ min: 3, max: 100 })
        .withMessage('Title must be 3-100 characters'),
      body('description')
        .trim()
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ min: 10, max: 500 })
        .withMessage('Description must be 10-500 characters'),
    ],
    updateStatus: [
      body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['active', 'completed'])
        .withMessage('Status must be active or completed'),
    ],
  },

  // Progress validators
  progress: {
    create: [
      body('content')
        .trim()
        .notEmpty()
        .withMessage('Content is required')
        .isLength({ min: 10, max: 1000 })
        .withMessage('Content must be 10-1000 characters'),
    ],
  },

  // Weekly check-in validators
  weeklyCheckIn: {
    create: [
      body('goalId')
        .notEmpty()
        .withMessage('Goal ID is required')
        .isMongoId()
        .withMessage('Invalid goal ID'),
      body('plannedTasks')
        .isArray({ min: 1, max: 10 })
        .withMessage('Planned tasks must have 1-10 items'),
      body('plannedTasks.*')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Each task must be 1-200 characters'),
      body('completedTasks')
        .optional()
        .isArray({ max: 10 })
        .withMessage('Completed tasks cannot exceed 10 items'),
      body('completedTasks.*')
        .optional()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Each task must be 1-200 characters'),
      body('blockers')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Blockers cannot exceed 500 characters'),
    ],
  },

  // Review/feedback validators
  review: {
    create: [
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
  },

  // Admin validators
  admin: {
    userAction: [
      body('reason')
        .trim()
        .notEmpty()
        .withMessage('Reason is required')
        .isLength({ min: 10, max: 500 })
        .withMessage('Reason must be 10-500 characters'),
    ],
    search: [
      query('search')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Search query is too long')
        .escape(),
    ],
  },
};

module.exports = validators;
