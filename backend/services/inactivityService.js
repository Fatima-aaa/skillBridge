const { MentorshipRequest, WeeklyCheckIn, MentorshipStatusLog, Goal } = require('../models');

/**
 * Inactivity Detection Service
 * Handles system-enforced accountability for missed check-ins
 */

/**
 * Get the week boundaries for a given date (Monday to Sunday)
 */
const getWeekBoundaries = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { weekStart: monday, weekEnd: sunday };
};

/**
 * Get the previous week boundaries
 */
const getPreviousWeekBoundaries = (date = new Date()) => {
  const d = new Date(date);
  d.setDate(d.getDate() - 7);
  return getWeekBoundaries(d);
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
 * Check for missed check-ins for a specific mentorship
 * Returns the number of consecutive weeks without check-ins
 */
const checkMissedCheckIns = async (mentorshipId) => {
  const mentorship = await MentorshipRequest.findById(mentorshipId);
  if (!mentorship || !['active', 'at-risk'].includes(mentorship.status)) {
    return { missed: 0, lastCheckIn: null };
  }

  // Get all active goals for this mentorship
  const goals = await Goal.find({
    mentorship: mentorshipId,
    status: 'active',
  });

  if (goals.length === 0) {
    return { missed: 0, lastCheckIn: null };
  }

  // Check the last few weeks for check-ins
  let consecutiveMissed = 0;
  let lastCheckInDate = null;
  const today = new Date();

  // Check up to 4 weeks back
  for (let weeksBack = 1; weeksBack <= 4; weeksBack++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - (weeksBack * 7));
    const { weekStart, weekEnd } = getWeekBoundaries(checkDate);

    // Check if any goal has a check-in for this week
    const checkInsForWeek = await WeeklyCheckIn.find({
      mentorship: mentorshipId,
      weekStartDate: weekStart,
    });

    if (checkInsForWeek.length === 0) {
      consecutiveMissed++;
    } else {
      // Found a check-in, stop counting
      if (!lastCheckInDate) {
        lastCheckInDate = checkInsForWeek[0].submittedAt;
      }
      break;
    }
  }

  return { missed: consecutiveMissed, lastCheckIn: lastCheckInDate };
};

/**
 * Process inactivity for a single mentorship
 * This should be called periodically (e.g., via cron job) or on-demand
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

  const { missed, lastCheckIn } = await checkMissedCheckIns(mentorshipId);

  // Update consecutive missed weeks counter
  mentorship.consecutiveMissedWeeks = missed;
  await mentorship.save();

  const context = {
    consecutiveMissedWeeks: missed,
    lastCheckInDate: lastCheckIn,
  };

  // Apply state transitions based on missed weeks
  if (missed >= 3 && mentorship.status === 'at-risk') {
    // Continued inactivity after at-risk -> pause
    await updateMentorshipStatus(
      mentorship,
      'paused',
      `Continued inactivity: ${missed} consecutive weeks without check-ins`,
      'system',
      context
    );
  } else if (missed >= 2 && mentorship.status === 'active') {
    // 2 missed weeks -> at-risk
    await updateMentorshipStatus(
      mentorship,
      'at-risk',
      `Inactivity detected: ${missed} consecutive weeks without check-ins`,
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
 * Reset inactivity when a check-in is submitted
 * This should be called after a successful check-in submission
 */
const resetInactivityOnCheckIn = async (mentorshipId) => {
  const mentorship = await MentorshipRequest.findById(mentorshipId);

  if (!mentorship) {
    return null;
  }

  // Reset consecutive missed weeks
  mentorship.consecutiveMissedWeeks = 0;

  // If mentorship was at-risk due to inactivity, move back to active
  if (mentorship.status === 'at-risk') {
    const previousStatus = mentorship.status;
    mentorship.status = 'active';

    await logStatusChange(
      mentorship,
      previousStatus,
      'active',
      'Check-in submitted, inactivity counter reset',
      'system',
      { consecutiveMissedWeeks: 0, lastCheckInDate: new Date() }
    );
  }

  await mentorship.save();
  return mentorship;
};

/**
 * Get learner consistency summary for a mentorship
 * Returns check-in history with missed weeks clearly marked
 */
const getLearnerConsistencySummary = async (mentorshipId, weeksBack = 12) => {
  const mentorship = await MentorshipRequest.findById(mentorshipId)
    .populate('learner', 'name email');

  if (!mentorship) {
    return null;
  }

  const goals = await Goal.find({ mentorship: mentorshipId });
  const goalIds = goals.map(g => g._id);

  const summary = {
    mentorship: {
      id: mentorship._id,
      status: mentorship.status,
      consecutiveMissedWeeks: mentorship.consecutiveMissedWeeks,
    },
    learner: mentorship.learner,
    weeks: [],
    stats: {
      totalWeeks: weeksBack,
      submittedWeeks: 0,
      missedWeeks: 0,
      lateSubmissions: 0,
    },
  };

  const today = new Date();

  // Build week-by-week summary
  for (let i = 0; i < weeksBack; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - (i * 7));
    const { weekStart, weekEnd } = getWeekBoundaries(checkDate);

    const checkIns = await WeeklyCheckIn.find({
      goal: { $in: goalIds },
      weekStartDate: weekStart,
    }).populate('goal', 'title');

    const weekData = {
      weekStart,
      weekEnd,
      checkIns: checkIns.map(ci => ({
        id: ci._id,
        goal: ci.goal,
        plannedTasks: ci.plannedTasks.length,
        completedTasks: ci.completedTasks.length,
        submittedAt: ci.submittedAt,
        isLate: ci.isLate,
      })),
      status: 'missed',
    };

    if (checkIns.length > 0) {
      weekData.status = checkIns.some(ci => ci.isLate) ? 'late' : 'submitted';
      summary.stats.submittedWeeks++;
      if (checkIns.some(ci => ci.isLate)) {
        summary.stats.lateSubmissions++;
      }
    } else {
      // Only count as missed if the week has ended
      if (weekEnd < today) {
        summary.stats.missedWeeks++;
      } else {
        weekData.status = 'current';
      }
    }

    summary.weeks.push(weekData);
  }

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
  getWeekBoundaries,
  getPreviousWeekBoundaries,
  checkMissedCheckIns,
  processInactivityForMentorship,
  processAllInactivity,
  resetInactivityOnCheckIn,
  getLearnerConsistencySummary,
  pauseMentorshipByMentor,
  reactivateMentorshipByMentor,
  getMentorshipStatusHistory,
  logStatusChange,
};
