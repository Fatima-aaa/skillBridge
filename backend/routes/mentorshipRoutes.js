const express = require('express');
const { body, param } = require('express-validator');
const {
  sendRequest,
  getIncomingRequests,
  getMyRequests,
  updateRequestStatus,
  getActiveMentorship,
  getMentees,
} = require('../controllers/mentorshipController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Learner routes
router.post(
  '/',
  protect,
  authorize('learner'),
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
  [
    param('id').isMongoId().withMessage('Invalid request ID'),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['accepted', 'rejected'])
      .withMessage('Status must be either accepted or rejected'),
  ],
  validate,
  updateRequestStatus
);

module.exports = router;
