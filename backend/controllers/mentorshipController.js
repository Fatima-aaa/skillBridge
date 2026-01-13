const { MentorshipRequest, MentorProfile, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// @desc    Send mentorship request (Learner)
// @route   POST /api/mentorships
// @access  Private (Learner only)
const sendRequest = asyncHandler(async (req, res, next) => {
  const { mentorId, message } = req.body;

  // Verify mentor exists and is actually a mentor
  const mentor = await User.findById(mentorId);
  if (!mentor || mentor.role !== 'mentor') {
    return next(new AppError('Mentor not found', 404));
  }

  // Check if mentor has a profile and is available
  const mentorProfile = await MentorProfile.findOne({ user: mentorId });
  if (!mentorProfile) {
    return next(new AppError('Mentor has not set up their profile yet', 400));
  }

  if (!mentorProfile.isAvailable) {
    return next(new AppError('Mentor has reached their capacity', 400));
  }

  // Check if learner already has an active mentorship
  const activeMentorship = await MentorshipRequest.findOne({
    learner: req.user.id,
    status: 'accepted',
  });

  if (activeMentorship) {
    return next(new AppError('You already have an active mentorship', 400));
  }

  // Check if there's already a pending request to this mentor
  const pendingRequest = await MentorshipRequest.findOne({
    learner: req.user.id,
    mentor: mentorId,
    status: 'pending',
  });

  if (pendingRequest) {
    return next(
      new AppError('You already have a pending request to this mentor', 400)
    );
  }

  const request = await MentorshipRequest.create({
    learner: req.user.id,
    mentor: mentorId,
    message,
  });

  res.status(201).json({
    success: true,
    data: request,
  });
});

// @desc    Get incoming requests (Mentor)
// @route   GET /api/mentorships/requests
// @access  Private (Mentor only)
const getIncomingRequests = asyncHandler(async (req, res, next) => {
  const requests = await MentorshipRequest.find({
    mentor: req.user.id,
  })
    .populate('learner', 'name email')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: requests.length,
    data: requests,
  });
});

// @desc    Get my requests as a learner
// @route   GET /api/mentorships/my-requests
// @access  Private (Learner only)
const getMyRequests = asyncHandler(async (req, res, next) => {
  const requests = await MentorshipRequest.find({
    learner: req.user.id,
  })
    .populate('mentor', 'name email')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: requests.length,
    data: requests,
  });
});

// @desc    Accept or reject mentorship request (Mentor)
// @route   PUT /api/mentorships/:id
// @access  Private (Mentor only)
const updateRequestStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  if (!['accepted', 'rejected'].includes(status)) {
    return next(new AppError('Invalid status. Use accepted or rejected', 400));
  }

  const request = await MentorshipRequest.findById(req.params.id);

  if (!request) {
    return next(new AppError('Request not found', 404));
  }

  // Verify mentor owns this request
  if (request.mentor.toString() !== req.user.id) {
    return next(new AppError('Not authorized to update this request', 403));
  }

  // Can only update pending requests
  if (request.status !== 'pending') {
    return next(new AppError('This request has already been processed', 400));
  }

  // If accepting, check mentor capacity
  if (status === 'accepted') {
    const mentorProfile = await MentorProfile.findOne({ user: req.user.id });

    if (!mentorProfile.isAvailable) {
      return next(new AppError('You have reached your mentee capacity', 400));
    }

    // Check if learner already has an active mentorship
    const activeMentorship = await MentorshipRequest.findOne({
      learner: request.learner,
      status: 'accepted',
    });

    if (activeMentorship) {
      return next(new AppError('Learner already has an active mentorship', 400));
    }

    // Increment mentor's current mentee count
    await MentorProfile.findOneAndUpdate(
      { user: req.user.id },
      { $inc: { currentMenteeCount: 1 } }
    );
  }

  request.status = status;
  await request.save();

  res.status(200).json({
    success: true,
    data: request,
  });
});

// @desc    Get active mentorship for learner
// @route   GET /api/mentorships/active
// @access  Private (Learner only)
const getActiveMentorship = asyncHandler(async (req, res, next) => {
  const mentorship = await MentorshipRequest.findOne({
    learner: req.user.id,
    status: 'accepted',
  }).populate('mentor', 'name email');

  if (!mentorship) {
    return res.status(200).json({
      success: true,
      data: null,
    });
  }

  res.status(200).json({
    success: true,
    data: mentorship,
  });
});

// @desc    Get all mentees for a mentor
// @route   GET /api/mentorships/mentees
// @access  Private (Mentor only)
const getMentees = asyncHandler(async (req, res, next) => {
  const mentorships = await MentorshipRequest.find({
    mentor: req.user.id,
    status: 'accepted',
  }).populate('learner', 'name email');

  res.status(200).json({
    success: true,
    count: mentorships.length,
    data: mentorships,
  });
});

module.exports = {
  sendRequest,
  getIncomingRequests,
  getMyRequests,
  updateRequestStatus,
  getActiveMentorship,
  getMentees,
};
