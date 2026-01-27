const mongoose = require('mongoose');

const mentorshipRequestSchema = new mongoose.Schema(
  {
    learner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'at-risk', 'paused', 'rejected', 'completed'],
      default: 'pending',
    },
    // Track consecutive missed check-in weeks for inactivity detection
    consecutiveMissedWeeks: {
      type: Number,
      default: 0,
      min: 0,
    },
    message: {
      type: String,
      maxlength: [300, 'Message cannot exceed 300 characters'],
      default: '',
    },
    // Phase 3: Completion tracking
    completedAt: {
      type: Date,
      default: null,
    },
    completionReason: {
      type: String,
      enum: ['goals_achieved', 'mutual_agreement', 'mentor_ended', 'learner_ended', null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate pending requests
mentorshipRequestSchema.index(
  { learner: 1, mentor: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

// Index for querying by mentor and status
mentorshipRequestSchema.index({ mentor: 1, status: 1 });

// Index for querying learner's active mentorship
mentorshipRequestSchema.index({ learner: 1, status: 1 });

// Index for querying completed mentorships (for reputation calculations)
mentorshipRequestSchema.index({ mentor: 1, status: 1, completedAt: -1 });
mentorshipRequestSchema.index({ learner: 1, status: 1, completedAt: -1 });

// Virtual to check if review can be submitted
mentorshipRequestSchema.virtual('canBeReviewed').get(function () {
  return this.status === 'completed';
});

module.exports = mongoose.model('MentorshipRequest', mentorshipRequestSchema);
