const { MentorReview, MentorshipRequest, MentorProfile } = require('../models');

/**
 * Reputation Service
 * Calculates and manages mentor reputation scores
 *
 * Mentor Reputation is derived from:
 * - Average rating across all reviews
 * - Number of completed mentorships
 * - Dropout/early termination rate
 */

/**
 * Calculate mentor reputation score
 * @param {string} mentorId - The mentor's user ID
 * @returns {Object} Reputation data
 */
const calculateMentorReputation = async (mentorId) => {
  // Get all mentorships for this mentor
  const allMentorships = await MentorshipRequest.find({
    mentor: mentorId,
    status: { $in: ['active', 'at-risk', 'paused', 'completed', 'rejected'] },
  });

  // Filter different categories
  const completedMentorships = allMentorships.filter(m => m.status === 'completed');
  const activeMentorships = allMentorships.filter(m => ['active', 'at-risk', 'paused'].includes(m.status));

  // Get all reviews
  const reviews = await MentorReview.find({ mentor: mentorId });

  // Calculate average ratings
  let averageRating = null;

  if (reviews.length > 0) {
    const totalReviews = reviews.length;
    const avgOverall = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    averageRating = parseFloat(avgOverall.toFixed(2));
  }

  // Calculate completion rate
  const totalStarted = completedMentorships.length + activeMentorships.length;
  const completionRate = totalStarted > 0
    ? parseFloat((completedMentorships.length / totalStarted * 100).toFixed(1))
    : null;

  // Calculate dropout rate based on completion reasons
  const earlyTerminations = completedMentorships.filter(
    m => m.completionReason === 'mentor_ended' || m.completionReason === 'learner_ended'
  );
  const dropoutRate = completedMentorships.length > 0
    ? parseFloat((earlyTerminations.length / completedMentorships.length * 100).toFixed(1))
    : 0;

  // Calculate trust score (0-100)
  // Weighted: 50% rating, 30% completion rate, 20% experience
  let trustScore = null;
  if (reviews.length >= 1) {
    const ratingScore = averageRating ? (averageRating / 5) * 50 : 0;
    const completionScore = completionRate ? (completionRate / 100) * 30 : 15; // Default to 50% if no data
    const experienceScore = Math.min(completedMentorships.length * 2, 20); // Cap at 20 points

    trustScore = Math.round(ratingScore + completionScore + experienceScore);
  }

  return {
    mentorId,
    reviewCount: reviews.length,
    averageRating,
    completedMentorships: completedMentorships.length,
    activeMentorships: activeMentorships.length,
    completionRate,
    dropoutRate,
    trustScore,
    // Experience level based on completed mentorships
    experienceLevel: getExperienceLevel(completedMentorships.length),
  };
};

/**
 * Get experience level label based on completed mentorships
 */
const getExperienceLevel = (completedCount) => {
  if (completedCount === 0) return 'new';
  if (completedCount < 3) return 'beginner';
  if (completedCount < 10) return 'intermediate';
  if (completedCount < 25) return 'experienced';
  return 'expert';
};

/**
 * Get mentor profile with reputation data
 * @param {string} mentorId - The mentor's user ID
 * @returns {Object} Profile with reputation
 */
const getMentorProfileWithReputation = async (mentorId) => {
  const profile = await MentorProfile.findOne({ user: mentorId }).populate('user', 'name email');

  if (!profile) {
    return null;
  }

  const reputation = await calculateMentorReputation(mentorId);

  return {
    profile: {
      id: profile._id,
      user: profile.user,
      skills: profile.skills,
      bio: profile.bio,
      capacity: profile.capacity,
      currentMenteeCount: profile.currentMenteeCount,
      isAvailable: profile.isAvailable,
      createdAt: profile.createdAt,
    },
    reputation,
  };
};

/**
 * Get all mentors with reputation for discovery
 * @param {Object} options - Sorting and filtering options
 * @returns {Array} List of mentor profiles with reputation
 */
const getAllMentorsWithReputation = async (options = {}) => {
  const { sortBy = 'rating', onlyAvailable = false } = options;

  // Get all profiles
  let query = {};
  const profiles = await MentorProfile.find(query).populate('user', 'name email');

  // Calculate reputation for each
  const mentorsWithReputation = await Promise.all(
    profiles.map(async (profile) => {
      const reputation = await calculateMentorReputation(profile.user._id);
      return {
        profile: {
          id: profile._id,
          user: profile.user,
          skills: profile.skills,
          bio: profile.bio,
          capacity: profile.capacity,
          currentMenteeCount: profile.currentMenteeCount,
          isAvailable: profile.isAvailable,
          createdAt: profile.createdAt,
        },
        reputation,
      };
    })
  );

  // Filter if needed
  let filtered = mentorsWithReputation;
  if (onlyAvailable) {
    filtered = filtered.filter(m => m.profile.isAvailable);
  }

  // Sort based on option
  switch (sortBy) {
    case 'rating':
      // Sort by average rating (null ratings go to end)
      filtered.sort((a, b) => {
        if (a.reputation.averageRating === null && b.reputation.averageRating === null) return 0;
        if (a.reputation.averageRating === null) return 1;
        if (b.reputation.averageRating === null) return -1;
        return b.reputation.averageRating - a.reputation.averageRating;
      });
      break;
    case 'experience':
      // Sort by completed mentorships count
      filtered.sort((a, b) => b.reputation.completedMentorships - a.reputation.completedMentorships);
      break;
    case 'trust':
      // Sort by trust score (null scores go to end)
      filtered.sort((a, b) => {
        if (a.reputation.trustScore === null && b.reputation.trustScore === null) return 0;
        if (a.reputation.trustScore === null) return 1;
        if (b.reputation.trustScore === null) return -1;
        return b.reputation.trustScore - a.reputation.trustScore;
      });
      break;
    case 'reviews':
      // Sort by number of reviews
      filtered.sort((a, b) => b.reputation.reviewCount - a.reputation.reviewCount);
      break;
    default:
      // Default: newest first
      filtered.sort((a, b) => new Date(b.profile.createdAt) - new Date(a.profile.createdAt));
  }

  return filtered;
};

module.exports = {
  calculateMentorReputation,
  getMentorProfileWithReputation,
  getAllMentorsWithReputation,
  getExperienceLevel,
};
