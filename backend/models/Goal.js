const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    mentorship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MentorshipRequest',
      required: true,
    },
    learner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Goal description is required'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
goalSchema.index({ mentorship: 1 });
goalSchema.index({ learner: 1 });

module.exports = mongoose.model('Goal', goalSchema);
