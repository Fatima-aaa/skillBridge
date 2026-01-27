const { MentorshipRequest, MentorshipStatusLog, Goal, ProgressUpdate } = require('../models');

/**
 * Inactivity Detection Service
 * Handles system-enforced accountability based on goal progress updates
 *
 * Rules:
 * - 1 week without progress update on any goal → at-risk
 * - 2 weeks without progress update → paused
 * - Only mentor can resume a paused mentorship
 */

/**
 * Get the date X days ago
 */
const getDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Log a mentorship status change
 */
const logStatusChange = async (mentorship, previousStatus, newStatus, reason, triggeredBy, context = {}) => {
  await MentorshipStatusLog.create({
    mentorship: mentorship._id,
    previousStatus,
    newStatus,
    reason,
    triggeredBy,
    systemContext: {
      consecutiveMissedWeeks: context.consecutiveMissedWeeks || null,
      lastCheckInDate: context.lastCheckInDate || null,
    },
    timestamp: new Date(),
  });
};

/**
 * Update mentorship status with logging
 */
const updateMentorshipStatus = async (mentorship, newStatus, reason, triggeredBy, context = {}) => {
  const previousStatus = mentorship.status;

  if (previousStatus === newStatus) {
    return mentorship;
  }

  // Log the status change
  await logStatusChange(mentorship, previousStatus, newStatus, reason, triggeredBy, context);

  // Update the mentorship
  mentorship.status = newStatus;
  await mentorship.save();

  return mentorship;
};

/**
 * Check for inactivity based on progress updates for a specific mentorship
 * Returns the number of days since last progress update
 */
const checkInactivity = async (mentorshipId) => {
  const mentorship = await MentorshipRequest.findById(mentorshipId);
  if (!mentorship || !['active', 'at-risk'].includes(mentorship.status)) {
    return { daysSinceUpdate: 0, lastProgressUpdate: null };
  }

  // Get all goals for this mentorship
  const goals = await Goal.find({
    mentorship: mentorshipId,
  });

  if (goals.length === 0) {
    // No goals set by mentor yet - don't penalize learner
    return { daysSinceUpdate: 0, lastProgressUpdate: null };
  }

  const goalIds = goals.map(g => g._id);

  // Find the most recent progress update across all goals
  const lastUpdate = await ProgressUpdate.findOne({
    goal: { $in: goalIds },
  }).sort({ createdAt: -1 });

  if (!lastUpdate) {
    // No progress updates yet - check how long since mentorship became active or first goal was created
    const oldestGoal = goals.reduce((oldest, goal) =>
      goal.createdAt < oldest.createdAt ? goal : oldest
    );
    const daysSinceGoalCreated = Math.floor(
      (new Date() - new Date(oldestGoal.createdAt)) / (1000 * 60 * 60 * 24)
    );
    return { daysSinceUpdate: daysSinceGoalCreated, lastProgressUpdate: null };
  }

  const daysSinceUpdate = Math.floor(
    (new Date() - new Date(lastUpdate.createdAt)) / (1000 * 60 * 60 * 24)
  );

  return { daysSinceUpdate, lastProgressUpdate: lastUpdate.createdAt };
};

/**
 * Process inactivity for a single mentorship
 * Called on dashboard load to check if status should change
 *
 * Rules:
 * - 7+ days without progress update → at-risk
 * - 14+ days without progress update → paused
 */
const processInactivityForMentorship = async (mentorshipId) => {
  const mentorship = await MentorshipRequest.findById(mentorshipId);

  if (!mentorship) {
    return null;
  }

  // Only process active or at-risk mentorships
  if (!['active', 'at-risk'].includes(mentorship.status)) {
    return mentorship;
  }

  const { daysSinceUpdate, lastProgressUpdate } = await checkInactivity(mentorshipId);

  const context = {
    daysSinceUpdate,
    lastProgressUpdate,
  };

  // Apply state transitions based on days since last progress update
  if (daysSinceUpdate >= 14 && mentorship.status === 'at-risk') {
    // 2 weeks without progress while at-risk -> paused
    await updateMentorshipStatus(
      mentorship,
      'paused',
      `Mentorship paused: ${daysSinceUpdate} days without progress update`,
      'system',
      context
    );
  } else if (daysSinceUpdate >= 14 && mentorship.status === 'active') {
    // Jump straight to paused if 2+ weeks inactive
    await updateMentorshipStatus(
      mentorship,
      'paused',
      `Mentorship paused: ${daysSinceUpdate} days without progress update`,
      'system',
      context
    );
  } else if (daysSinceUpdate >= 7 && mentorship.status === 'active') {
    // 1 week without progress -> at-risk
    await updateMentorshipStatus(
      mentorship,
      'at-risk',
      `Inactivity warning: ${daysSinceUpdate} days without progress update`,
      'system',
      context
    );
  }

  return mentorship;
};

/**
 * Process inactivity for all active mentorships
 * This should be called by a scheduled job
 */
const processAllInactivity = async () => {
  const activeMentorships = await MentorshipRequest.find({
    status: { $in: ['active', 'at-risk'] },
  });

  const results = [];
  for (const mentorship of activeMentorships) {
    const result = await processInactivityForMentorship(mentorship._id);
    results.push({
      mentorshipId: mentorship._id,
      status: result ? result.status : 'not_found',
      consecutiveMissedWeeks: result ? result.consecutiveMissedWeeks : 0,
    });
  }

  return results;
};

/**
 * Reset inactivity when a progress update is submitted
 * This should be called after a successful progress update submission
 */
const resetInactivityOnProgressUpdate = async (mentorshipId) => {
  const mentorship = await MentorshipRequest.findById(mentorshipId);

  if (!mentorship) {
    return null;
  }

  // If mentorship was at-risk due to inactivity, move back to active
  if (mentorship.status === 'at-risk') {
    const previousStatus = mentorship.status;
    mentorship.status = 'active';

    await logStatusChange(
      mentorship,
      previousStatus,
      'active',
      'Progress update submitted, mentorship restored to active',
      'system',
      { lastProgressUpdate: new Date() }
    );

    await mentorship.save();
  }

  return mentorship;
};

/**
 * Get learner activity summary for a mentorship
 * Returns progress update history
 */
const getLearnerConsistencySummary = async (mentorshipId, daysBack = 30) => {
  const mentorship = await MentorshipRequest.findById(mentorshipId)
    .populate('learner', 'name email');

  if (!mentorship) {
    return null;
  }

  const goals = await Goal.find({ mentorship: mentorshipId });
  const goalIds = goals.map(g => g._id);

  // Get progress updates in the time period
  const startDate = getDaysAgo(daysBack);
  const progressUpdates = await ProgressUpdate.find({
    goal: { $in: goalIds },
    createdAt: { $gte: startDate },
  })
    .populate('goal', 'title')
    .sort({ createdAt: -1 });

  // Calculate stats
  const { daysSinceUpdate, lastProgressUpdate } = await checkInactivity(mentorshipId);

  const summary = {
    mentorship: {
      id: mentorship._id,
      status: mentorship.status,
      daysSinceLastUpdate: daysSinceUpdate,
    },
    learner: mentorship.learner,
    progressUpdates: progressUpdates.map(pu => ({
      id: pu._id,
      goal: pu.goal,
      content: pu.content,
      createdAt: pu.createdAt,
    })),
    stats: {
      totalGoals: goals.length,
      activeGoals: goals.filter(g => g.status === 'active').length,
      completedGoals: goals.filter(g => g.status === 'completed').length,
      totalProgressUpdates: progressUpdates.length,
      daysSinceLastUpdate: daysSinceUpdate,
      lastProgressUpdate,
    },
  };

  return summary;
};

/**
 * Mentor action: Pause mentorship with reason
 */
const pauseMentorshipByMentor = async (mentorshipId, mentorId, reason) => {
  const mentorship = await MentorshipRequest.findById(mentorshipId);

  if (!mentorship) {
    return { success: false, error: 'Mentorship not found' };
  }

  if (mentorship.mentor.toString() !== mentorId) {
    return { success: false, error: 'Not authorized' };
  }

  if (!['active', 'at-risk'].includes(mentorship.status)) {
    return { success: false, error: 'Can only pause active or at-risk mentorships' };
  }

  await updateMentorshipStatus(
    mentorship,
    'paused',
    reason,
    'mentor',
    { consecutiveMissedWeeks: mentorship.consecutiveMissedWeeks }
  );

  return { success: true, mentorship };
};

/**
 * Mentor action: Reactivate a paused mentorship
 */
const reactivateMentorshipByMentor = async (mentorshipId, mentorId, reason) => {
  const mentorship = await MentorshipRequest.findById(mentorshipId);

  if (!mentorship) {
    return { success: false, error: 'Mentorship not found' };
  }

  if (mentorship.mentor.toString() !== mentorId) {
    return { success: false, error: 'Not authorized' };
  }

  if (mentorship.status !== 'paused') {
    return { success: false, error: 'Can only reactivate paused mentorships' };
  }

  // Reset missed weeks counter when reactivating
  mentorship.consecutiveMissedWeeks = 0;

  await updateMentorshipStatus(
    mentorship,
    'active',
    reason || 'Mentorship reactivated by mentor',
    'mentor',
    { consecutiveMissedWeeks: 0 }
  );

  return { success: true, mentorship };
};

/**
 * Get status change history for a mentorship
 */
const getMentorshipStatusHistory = async (mentorshipId) => {
  const logs = await MentorshipStatusLog.find({ mentorship: mentorshipId })
    .sort({ timestamp: -1 });

  return logs;
};

module.exports = {
  getDaysAgo,
  checkInactivity,
  processInactivityForMentorship,
  processAllInactivity,
  resetInactivityOnProgressUpdate,
  getLearnerConsistencySummary,
  pauseMentorshipByMentor,
  reactivateMentorshipByMentor,
  getMentorshipStatusHistory,
  logStatusChange,
};
