const User = require('./User');
const MentorProfile = require('./MentorProfile');
const MentorshipRequest = require('./MentorshipRequest');
const Goal = require('./Goal');
const ProgressUpdate = require('./ProgressUpdate');
const WeeklyCheckIn = require('./WeeklyCheckIn');
const MentorshipStatusLog = require('./MentorshipStatusLog');
// Phase 3: Trust, Feedback & Reputation
const MentorReview = require('./MentorReview');
const LearnerFeedback = require('./LearnerFeedback');
// Phase 4: Admin & Moderation
const AdminAuditLog = require('./AdminAuditLog');

module.exports = {
  User,
  MentorProfile,
  MentorshipRequest,
  Goal,
  ProgressUpdate,
  WeeklyCheckIn,
  MentorshipStatusLog,
  // Phase 3
  MentorReview,
  LearnerFeedback,
  // Phase 4
  AdminAuditLog,
};
