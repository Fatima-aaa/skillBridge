const express = require('express');
const { body, param, query } = require('express-validator');
const {
  sendRequest,
  getIncomingRequests,
  getMyRequests,
  updateRequestStatus,
  getActiveMentorship,
  getMentees,
  pauseMentorship,
  reactivateMentorship,
  getStatusHistory,
  flagPoorCommitment,
  getMenteeDetails,
  completeMentorship,
  getCompletedMentorships,
} = require('../controllers/mentorshipController');
const { protect, authorize, checkSuspended } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Learner routes
router.post(
  '/',
  protect,
  authorize('learner'),
  checkSuspended,
  [
    body('mentorId')
      .notEmpty()
      .withMessage('Mentor ID is required')
      .isMongoId()
      .withMessage('Invalid mentor ID'),
    body('message')
      .optional()
      .isLength({ max: 300 })
      .withMessage('Message cannot exceed 300 characters'),
  ],
  validate,
  sendRequest
);

router.get('/my-requests', protect, authorize('learner'), getMyRequests);
router.get('/active', protect, authorize('learner'), getActiveMentorship);

// Mentor routes
router.get('/requests', protect, authorize('mentor'), getIncomingRequests);
router.get('/mentees', protect, authorize('mentor'), getMentees);

router.put(
  '/:id',
  protect,
  authorize('mentor'),
  checkSuspended,
  [
    param('id').isMongoId().withMessage('Invalid request ID'),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['active', 'rejected'])
      .withMessage('Status must be either active or rejected'),
  ],
  validate,
  updateRequestStatus
);

// Mentor oversight routes

// Get mentee details with consistency summary
router.get(
  '/mentee/:menteeId/details',
  protect,
  authorize('mentor'),
  [
    param('menteeId').isMongoId().withMessage('Invalid mentee ID'),
    query('weeks')
      .optional()
      .isInt({ min: 1, max: 52 })
      .withMessage('Weeks must be between 1 and 52'),
  ],
  validate,
  getMenteeDetails
);

// Get mentorship status history
router.get(
  '/:id/history',
  protect,
  authorize('mentor'),
  [
    param('id').isMongoId().withMessage('Invalid mentorship ID'),
  ],
  validate,
  getStatusHistory
);

// Pause mentorship
router.put(
  '/:id/pause',
  protect,
  authorize('mentor'),
  checkSuspended,
  [
    param('id').isMongoId().withMessage('Invalid mentorship ID'),
    body('reason')
      .notEmpty()
      .withMessage('Reason is required')
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters'),
  ],
  validate,
  pauseMentorship
);

// Reactivate paused mentorship
router.put(
  '/:id/reactivate',
  protect,
  authorize('mentor'),
  checkSuspended,
  [
    param('id').isMongoId().withMessage('Invalid mentorship ID'),
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters'),
  ],
  validate,
  reactivateMentorship
);

// Flag poor commitment
router.put(
  '/:id/flag',
  protect,
  authorize('mentor'),
  checkSuspended,
  [
    param('id').isMongoId().withMessage('Invalid mentorship ID'),
    body('reason')
      .notEmpty()
      .withMessage('Reason is required')
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters'),
  ],
  validate,
  flagPoorCommitment
);

// Phase 3: Completion routes

// Get completed mentorships (both roles)
router.get(
  '/completed',
  protect,
  authorize('mentor', 'learner'),
  getCompletedMentorships
);

// Complete mentorship (learner only, only when active)
router.put(
  '/:id/complete',
  protect,
  authorize('learner'),
  checkSuspended,
  [
    param('id').isMongoId().withMessage('Invalid mentorship ID'),
  ],
  validate,
  completeMentorship
);

module.exports = router;
