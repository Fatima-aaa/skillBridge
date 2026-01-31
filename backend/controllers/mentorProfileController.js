const { MentorProfile, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  getMentorProfileWithReputation,
  getAllMentorsWithReputation,
} = require('../services/reputationService');
const { parsePaginationParams, buildPaginationMeta } = require('../utils/pagination');

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
// @query   page - Page number (default: 1)
// @query   limit - Items per page (default: 20, max: 100)
// @query   sortBy - rating, experience, trust, reviews, newest (default: rating)
// @query   onlyAvailable - true/false (default: false)
// @query   includeReputation - true/false (default: true)
// @query   skill - Filter by skill
const getAllProfiles = asyncHandler(async (req, res, next) => {
  const { sortBy, onlyAvailable, includeReputation, skill } = req.query;
  const { page, limit, skip, sort } = parsePaginationParams(req.query);

  // If reputation not needed, return basic profiles with pagination
  if (includeReputation === 'false') {
    const query = {};
    if (skill) {
      query.skills = { $regex: skill, $options: 'i' };
    }
    if (onlyAvailable === 'true') {
      query.$expr = { $lt: ['$currentMenteeCount', '$capacity'] };
    }

    const [profiles, total] = await Promise.all([
      MentorProfile.find(query)
        .populate('user', 'name email')
        .select('-__v')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      MentorProfile.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: profiles,
      pagination: buildPaginationMeta(total, page, limit),
    });
  }

  // Get profiles with reputation data (includes pagination)
  const result = await getAllMentorsWithReputation({
    sortBy: sortBy || 'rating',
    onlyAvailable: onlyAvailable === 'true',
    skill,
    page,
    limit,
  });

  res.status(200).json({
    success: true,
    data: result.mentors || result,
    pagination: result.pagination || buildPaginationMeta(
      Array.isArray(result) ? result.length : result.mentors?.length || 0,
      page,
      limit
    ),
  });
});

// @desc    Get single mentor profile by ID
// @route   GET /api/mentor-profiles/:id
// @access  Private
// @query   includeReputation - true/false (default: true)
const getProfile = asyncHandler(async (req, res, next) => {
  const { includeReputation } = req.query;

  // If reputation not needed, return basic profile (backward compatible)
  if (includeReputation === 'false') {
    const profile = await MentorProfile.findById(req.params.id).populate(
      'user',
      'name email'
    );

    if (!profile) {
      return next(new AppError('Profile not found', 404));
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  }

  // Get profile by ID
  const profile = await MentorProfile.findById(req.params.id).populate(
    'user',
    'name email'
  );

  if (!profile) {
    return next(new AppError('Profile not found', 404));
  }

  // Get profile with reputation
  const profileWithReputation = await getMentorProfileWithReputation(profile.user._id);

  res.status(200).json({
    success: true,
    data: profileWithReputation,
  });
});

module.exports = {
  createProfile,
  updateProfile,
  getMyProfile,
  getAllProfiles,
  getProfile,
};
