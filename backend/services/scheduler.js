const cron = require('node-cron');
const { processAllInactivity } = require('./inactivityService');

/**
 * Scheduler Service
 * Handles automated periodic tasks for the SkillBridge platform
 */

let inactivityJob = null;

/**
 * Initialize all scheduled jobs
 */
const initializeScheduler = () => {
  console.log('Initializing scheduler...');

  // Schedule inactivity check to run every Monday at 9:00 AM
  // Cron format: second(optional) minute hour day-of-month month day-of-week
  // '0 9 * * 1' = At 09:00 on Monday
  inactivityJob = cron.schedule('0 9 * * 1', async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled inactivity check...`);

    try {
      const results = await processAllInactivity();

      const statusChanges = results.filter(r => r.status !== 'active');
      console.log(`[${new Date().toISOString()}] Inactivity check complete:`);
      console.log(`  - Total mentorships processed: ${results.length}`);
      console.log(`  - Status changes: ${statusChanges.length}`);

      if (statusChanges.length > 0) {
        console.log('  - Changed mentorships:');
        statusChanges.forEach(r => {
          console.log(`    * ${r.mentorshipId}: ${r.status} (${r.consecutiveMissedWeeks} missed weeks)`);
        });
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Inactivity check failed:`, error.message);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('Scheduler initialized:');
  console.log('  - Inactivity check: Every Monday at 9:00 AM UTC');
};

/**
 * Run inactivity check immediately (for testing or manual trigger)
 */
const runInactivityCheckNow = async () => {
  console.log(`[${new Date().toISOString()}] Running immediate inactivity check...`);

  try {
    const results = await processAllInactivity();

    console.log(`[${new Date().toISOString()}] Inactivity check complete:`);
    console.log(`  - Total mentorships processed: ${results.length}`);

    results.forEach(r => {
      console.log(`  - Mentorship ${r.mentorshipId}: ${r.status} (${r.consecutiveMissedWeeks} missed weeks)`);
    });

    return results;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Inactivity check failed:`, error.message);
    throw error;
  }
};

/**
 * Stop all scheduled jobs (for graceful shutdown)
 */
const stopScheduler = () => {
  if (inactivityJob) {
    inactivityJob.stop();
    console.log('Scheduler stopped.');
  }
};

/**
 * Get scheduler status
 */
const getSchedulerStatus = () => {
  return {
    inactivityCheck: {
      running: inactivityJob ? inactivityJob.running : false,
      schedule: 'Every Monday at 9:00 AM UTC',
    },
  };
};

module.exports = {
  initializeScheduler,
  runInactivityCheckNow,
  stopScheduler,
  getSchedulerStatus,
};
