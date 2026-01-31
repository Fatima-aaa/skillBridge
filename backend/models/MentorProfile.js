const mongoose = require('mongoose');

const mentorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    skills: {
      type: [String],
      required: [true, 'At least one skill is required'],
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: 'At least one skill is required',
      },
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [20, 'Capacity cannot exceed 20'],
    },
    currentMenteeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for checking availability
mentorProfileSchema.virtual('isAvailable').get(function () {
  return this.currentMenteeCount < this.capacity;
});

// Indexes for efficient queries
mentorProfileSchema.index({ skills: 1 });
mentorProfileSchema.index({ currentMenteeCount: 1, capacity: 1 }); // Availability queries
mentorProfileSchema.index({ createdAt: -1 }); // Newest mentors

module.exports = mongoose.model('MentorProfile', mentorProfileSchema);
