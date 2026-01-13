const mongoose = require('mongoose');

const progressUpdateSchema = new mongoose.Schema(
  {
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      required: true,
    },
    learner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Progress update content is required'],
      maxlength: [1000, 'Content cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
progressUpdateSchema.index({ goal: 1, createdAt: -1 });

module.exports = mongoose.model('ProgressUpdate', progressUpdateSchema);
