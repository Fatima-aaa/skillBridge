const mongoose = require('mongoose');

const weeklyCheckInSchema = new mongoose.Schema(
  {
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      required: [true, 'Goal reference is required'],
    },
    learner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Learner reference is required'],
    },
    mentorship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MentorshipRequest',
      required: [true, 'Mentorship reference is required'],
    },
    weekStartDate: {
      type: Date,
      required: [true, 'Week start date is required'],
    },
    weekEndDate: {
      type: Date,
      required: [true, 'Week end date is required'],
    },
    plannedTasks: {
      type: [String],
      required: [true, 'Planned tasks are required'],
      validate: {
        validator: function (arr) {
          return arr.length > 0 && arr.length <= 10;
        },
        message: 'Planned tasks must have 1-10 items',
      },
    },
    completedTasks: {
      type: [String],
      default: [],
      validate: {
        validator: function (arr) {
          return arr.length <= 10;
        },
        message: 'Completed tasks cannot exceed 10 items',
      },
    },
    blockers: {
      type: String,
      maxlength: [500, 'Blockers cannot exceed 500 characters'],
      default: '',
    },
    submittedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    isLate: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one check-in per goal per week
weeklyCheckInSchema.index(
  { goal: 1, weekStartDate: 1 },
  { unique: true }
);

// Index for querying check-ins by learner
weeklyCheckInSchema.index({ learner: 1, weekStartDate: -1 });

// Index for querying check-ins by mentorship
weeklyCheckInSchema.index({ mentorship: 1, weekStartDate: -1 });

// Index for querying check-ins by goal
weeklyCheckInSchema.index({ goal: 1, weekStartDate: -1 });

// Static method to get the week boundaries for a given date
weeklyCheckInSchema.statics.getWeekBoundaries = function (date = new Date()) {
  const d = new Date(date);
  // Get Monday of the current week (Monday = 1)
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  // Get Sunday of the current week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { weekStart: monday, weekEnd: sunday };
};

// Static method to check if a submission is late
// A submission is late if it's submitted after the week end
weeklyCheckInSchema.statics.isSubmissionLate = function (weekEndDate, submittedAt = new Date()) {
  return submittedAt > weekEndDate;
};

module.exports = mongoose.model('WeeklyCheckIn', weeklyCheckInSchema);
