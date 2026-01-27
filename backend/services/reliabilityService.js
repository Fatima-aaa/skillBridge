const { LearnerFeedback, MentorshipRequest, WeeklyCheckIn, Goal } = require('../models');
const { getWeekBoundaries } = require('./inactivityService');

/**
 * Reliability Service
 * Calculates learner reliability scores for mentor decision making
 *
 * Learner Reliability is derived from:
 * - Missed weekly check-ins (from Phase 2)
 * - Mentorship completion rate
 * - Mentor feedback ratings
 */

/**
 * Calculate learner reliability score
 * @param {string} learnerId - The learner's user ID
 * @returns {Object} Reliability data
 */
const calculateLearnerReliability = async (learnerId) => {
  // Get all mentorships for this learner
  const allMentorships = await MentorshipRequest.find({
    learner: learnerId,
    status: { $in: ['active', 'at-risk', 'paused', 'completed'] },
  });

  const completedMentorships = allMentorships.filter(m => m.status === 'completed');
  const activeMentorships = allMentorships.filter(m => ['active', 'at-risk', 'paused'].includes(m.status));

  // Get all feedback for this learner
  const feedback = await LearnerFeedback.find({ learner: learnerId });

  // Calculate average ratings from feedback
  let averageRating = null;

  if (feedback.length > 0) {
    const totalFeedback = feedback.length;
    const avgOverall = feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback;

    averageRating = parseFloat(avgOverall.toFixed(2));
  }

  // Calculate check-in consistency (last 12 weeks across all mentorships)
  const checkInStats = await calculateCheckInConsistency(learnerId, 12);

  // Calculate completion rate
  const totalStarted = completedMentorships.length + activeMentorships.length;
  const completionRate = totalStarted > 0
    ? parseFloat((completedMentorships.length / totalStarted * 100).toFixed(1))
    : null;

  // Calculate early termination rate (learner-initiated ends)
  const learnerEndedCount = completedMentorships.filter(
    m => m.completionReason === 'learner_ended'
  ).length;
  const earlyTerminationRate = completedMentorships.length > 0
    ? parseFloat((learnerEndedCount / completedMentorships.length * 100).toFixed(1))
    : 0;

  // Calculate reliability score (0-100)
  // Weighted: 40% feedback rating, 30% check-in consistency, 30% completion history
  let reliabilityScore = null;

  // Calculate based on available data
  const hasEnoughData = feedback.length >= 1 || checkInStats.totalWeeks >= 4;

  if (hasEnoughData) {
    // Feedback component (0-40 points)
    let feedbackScore = 20; // Default to neutral if no feedback
    if (averageRating !== null) {
      feedbackScore = (averageRating / 5) * 40;
    }

    // Check-in consistency component (0-30 points)
    let consistencyScore = 15; // Default to neutral if no data
    if (checkInStats.totalWeeks > 0) {
      const checkInRate = checkInStats.submittedWeeks / checkInStats.totalWeeks;
      consistencyScore = checkInRate * 30;
    }

    // Completion component (0-30 points)
    let completionScore = 15; // Default to neutral if no data
    if (completionRate !== null) {
      completionScore = (completionRate / 100) * 20;
      // Bonus for not early-terminating
      const stickWithItBonus = (100 - earlyTerminationRate) / 100 * 10;
      completionScore += stickWithItBonus;
    }

    reliabilityScore = Math.round(feedbackScore + consistencyScore + completionScore);
  }

  // Determine risk level for mentor warning
  let riskLevel = 'unknown';
  if (reliabilityScore !== null) {
    if (reliabilityScore >= 70) riskLevel = 'low';
    else if (reliabilityScore >= 50) riskLevel = 'medium';
    else riskLevel = 'high';
  }

  return {
    learnerId,
    feedbackCount: feedback.length,
    averageRating,
    completedMentorships: completedMentorships.length,
    activeMentorships: activeMentorships.length,
    completionRate,
    earlyTerminationRate,
    checkInStats,
    reliabilityScore,
    riskLevel,
  };
};

/**
 * Calculate check-in consistency for a learner
 * @param {string} learnerId - The learner's user ID
 * @param {number} weeksBack - Number of weeks to look back
 * @returns {Object} Check-in stats
 */
const calculateCheckInConsistency = async (learnerId, weeksBack = 12) => {
  // Get all goals for this learner
  const goals = await Goal.find({ learner: learnerId, status: 'active' });
  const goalIds = goals.map(g => g._id);

  if (goalIds.length === 0) {
    return {
      totalWeeks: 0,
      submittedWeeks: 0,
      missedWeeks: 0,
      lateSubmissions: 0,
      consistencyRate: null,
    };
  }

  const today = new Date();
  let submittedWeeks = 0;
  let missedWeeks = 0;
  let lateSubmissions = 0;
  let countableWeeks = 0;

  for (let i = 1; i <= weeksBack; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - (i * 7));
    const { weekStart, weekEnd } = getWeekBoundaries(checkDate);

    // Skip if week hasn't ended yet
    if (weekEnd >= today) continue;

    countableWeeks++;

    const checkIns = await WeeklyCheckIn.find({
      goal: { $in: goalIds },
      weekStartDate: weekStart,
    });

    if (checkIns.length > 0) {
      submittedWeeks++;
      if (checkIns.some(ci => ci.isLate)) {
        lateSubmissions++;
      }
    } else {
      missedWeeks++;
    }
  }

  const consistencyRate = countableWeeks > 0
    ? parseFloat((submittedWeeks / countableWeeks * 100).toFixed(1))
    : null;

  return {
    totalWeeks: countableWeeks,
    submittedWeeks,
    missedWeeks,
    lateSubmissions,
    consistencyRate,
  };
};

/**
 * Get learner reliability summary for mentor warning
 * This is what mentors see before accepting a mentorship request
 * @param {string} learnerId - The learner's user ID
 * @returns {Object} Summary data for mentor decision
 */
const getLearnerReliabilitySummary = async (learnerId) => {
  const reliability = await calculateLearnerReliability(learnerId);

  // Return a summarized, non-invasive view
  return {
    learnerId,
    reliabilityScore: reliability.reliabilityScore,
    riskLevel: reliability.riskLevel,
    completedMentorships: reliability.completedMentorships,
    feedbackCount: reliability.feedbackCount,
    // Only show aggregate rating if there's feedback
    averageRating: reliability.averageRating,
    // Show check-in consistency rate
    checkInConsistencyRate: reliability.checkInStats.consistencyRate,
    // Warnings for mentor
    warnings: generateWarnings(reliability),
  };
};

/**
 * Generate warning messages based on reliability data
 */
const generateWarnings = (reliability) => {
  const warnings = [];

  if (reliability.riskLevel === 'high') {
    warnings.push('This learner has a low reliability score.');
  }

  if (reliability.earlyTerminationRate > 30) {
    warnings.push('This learner has ended mentorships early in the past.');
  }

  if (reliability.checkInStats.consistencyRate !== null && reliability.checkInStats.consistencyRate < 50) {
    warnings.push('This learner has inconsistent check-in history.');
  }

  if (reliability.averageRating !== null && reliability.averageRating < 2.5) {
    warnings.push('Previous mentors have reported concerns about this learner.');
  }

  return warnings;
};

module.exports = {
  calculateLearnerReliability,
  calculateCheckInConsistency,
  getLearnerReliabilitySummary,
};
