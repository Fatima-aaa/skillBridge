const mongoose = require('mongoose');

/**
 * LearnerFeedback Model
 * Stores mentor → learner ratings after mentorship completion
 *
 * Rules:
 * - One rating per mentorship (enforced by unique index)
 * - Can only be submitted after mentorship ends (completed status)
 * - Publicly visible on learner profile but rater is anonymous
 * - Simple 1-5 rating scale, no comments
 */
const learnerFeedbackSchema = new mongoose.Schema(
  {
    mentorship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MentorshipRequest',
      required: true,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    learner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Simple 1-5 rating
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
  },
  {
    timestamps: true,
  }
);

// One feedback per mentorship (strict)
learnerFeedbackSchema.index({ mentorship: 1 }, { unique: true });

// Query feedback by learner for profile display
learnerFeedbackSchema.index({ learner: 1, createdAt: -1 });

// Query feedback given by mentor
learnerFeedbackSchema.index({ mentor: 1, createdAt: -1 });

module.exports = mongoose.model('LearnerFeedback', learnerFeedbackSchema);
