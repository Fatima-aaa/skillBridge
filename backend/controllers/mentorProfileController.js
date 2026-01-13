const { MentorProfile, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// @desc    Create mentor profile
// @route   POST /api/mentor-profiles
// @access  Private (Mentor only)
const createProfile = asyncHandler(async (req, res, next) => {
  // Check if profile already exists
  const existingProfile = await MentorProfile.findOne({ user: req.user.id });
  if (existingProfile) {
    return next(new AppError('Profile already exists. Use update instead.', 400));
  }

  const profile = await MentorProfile.create({
    user: req.user.id,
    skills: req.body.skills,
    bio: req.body.bio,
    capacity: req.body.capacity,
  });

  res.status(201).json({
    success: true,
    data: profile,
  });
});

// @desc    Update mentor profile
// @route   PUT /api/mentor-profiles
// @access  Private (Mentor only)
const updateProfile = asyncHandler(async (req, res, next) => {
  let profile = await MentorProfile.findOne({ user: req.user.id });

  if (!profile) {
    return next(new AppError('Profile not found', 404));
  }

  // Only allow updating specific fields
  const allowedFields = ['skills', 'bio', 'capacity'];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Validate capacity is not less than current mentee count
  if (updates.capacity !== undefined && updates.capacity < profile.currentMenteeCount) {
    return next(
      new AppError(
        `Capacity cannot be less than current mentee count (${profile.currentMenteeCount})`,
        400
      )
    );
  }

  profile = await MentorProfile.findOneAndUpdate(
    { user: req.user.id },
    updates,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: profile,
  });
});

// @desc    Get current mentor's profile
// @route   GET /api/mentor-profiles/me
// @access  Private (Mentor only)
const getMyProfile = asyncHandler(async (req, res, next) => {
  const profile = await MentorProfile.findOne({ user: req.user.id }).populate(
    'user',
    'name email'
  );

  if (!profile) {
    return next(new AppError('Profile not found', 404));
  }

  res.status(200).json({
    success: true,
    data: profile,
  });
});

// @desc    Get all mentor profiles (for learners to browse)
// @route   GET /api/mentor-profiles
// @access  Private
const getAllProfiles = asyncHandler(async (req, res, next) => {
  const profiles = await MentorProfile.find()
    .populate('user', 'name email')
    .select('-__v');

  res.status(200).json({
    success: true,
    count: profiles.length,
    data: profiles,
  });
});

// @desc    Get single mentor profile by ID
// @route   GET /api/mentor-profiles/:id
// @access  Private
const getProfile = asyncHandler(async (req, res, next) => {
  const profile = await MentorProfile.findById(req.params.id).populate(
    'user',
    'name email'
  );

  if (!profile) {
    return next(new AppError('Profile not found', 404));
  }

  res.status(200).json({
    success: true,
    data: profile,
  });
});

module.exports = {
  createProfile,
  updateProfile,
  getMyProfile,
  getAllProfiles,
  getProfile,
};
