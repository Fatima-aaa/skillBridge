const mongoose = require('mongoose');

/**
 * MentorReview Model
 * Stores learner → mentor ratings after mentorship completion
 *
 * Rules:
 * - One rating per mentorship (enforced by unique index)
 * - Can only be submitted after mentorship ends (completed status)
 * - Cannot be edited or deleted after submission (immutable)
 * - Publicly visible (for mentor discovery) but reviewer is anonymous
 * - Simple 1-5 rating scale, no comments
 */
const mentorReviewSchema = new mongoose.Schema(
  {
    mentorship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MentorshipRequest',
      required: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mentor: {
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

// One rating per mentorship (strict)
mentorReviewSchema.index({ mentorship: 1 }, { unique: true });

// Query reviews by mentor for reputation calculation
mentorReviewSchema.index({ mentor: 1, createdAt: -1 });

// Query reviews by reviewer (for user's submitted reviews)
mentorReviewSchema.index({ reviewer: 1, createdAt: -1 });

module.exports = mongoose.model('MentorReview', mentorReviewSchema);
