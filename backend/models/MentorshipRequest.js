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
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    message: {
      type: String,
      maxlength: [300, 'Message cannot exceed 300 characters'],
      default: '',
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

module.exports = mongoose.model('MentorshipRequest', mentorshipRequestSchema);
