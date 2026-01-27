const mongoose = require('mongoose');

const mentorshipStatusLogSchema = new mongoose.Schema(
  {
    mentorship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MentorshipRequest',
      required: [true, 'Mentorship reference is required'],
    },
    previousStatus: {
      type: String,
      enum: ['pending', 'active', 'at-risk', 'paused', 'rejected'],
      required: [true, 'Previous status is required'],
    },
    newStatus: {
      type: String,
      enum: ['pending', 'active', 'at-risk', 'paused', 'rejected'],
      required: [true, 'New status is required'],
    },
    reason: {
      type: String,
      required: [true, 'Reason for status change is required'],
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    triggeredBy: {
      type: String,
      enum: ['system', 'mentor'],
      required: [true, 'Trigger source is required'],
    },
    // Additional context for system-triggered changes
    systemContext: {
      consecutiveMissedWeeks: {
        type: Number,
        default: null,
      },
      lastCheckInDate: {
        type: Date,
        default: null,
      },
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false, // We use our own timestamp field
  }
);

// Index for querying logs by mentorship
mentorshipStatusLogSchema.index({ mentorship: 1, timestamp: -1 });

// Index for querying system-triggered changes
mentorshipStatusLogSchema.index({ triggeredBy: 1, timestamp: -1 });

module.exports = mongoose.model('MentorshipStatusLog', mentorshipStatusLogSchema);
