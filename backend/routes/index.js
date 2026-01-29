const express = require('express');
const authRoutes = require('./authRoutes');
const mentorProfileRoutes = require('./mentorProfileRoutes');
const mentorshipRoutes = require('./mentorshipRoutes');
const goalRoutes = require('./goalRoutes');
const progressRoutes = require('./progressRoutes');
const weeklyCheckInRoutes = require('./weeklyCheckInRoutes');
// Reviews and Feedback (anonymous ratings)
const reviewRoutes = require('./reviewRoutes');
const feedbackRoutes = require('./feedbackRoutes');
const reputationRoutes = require('./reputationRoutes');
// Admin routes (separate namespace)
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/mentor-profiles', mentorProfileRoutes);
router.use('/mentorships', mentorshipRoutes);
router.use('/goals', goalRoutes);
router.use('/progress', progressRoutes);
router.use('/check-ins', weeklyCheckInRoutes);
// Reviews and Feedback (anonymous ratings)
router.use('/reviews', reviewRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/reputation', reputationRoutes);

// Admin routes (completely separate namespace)
router.use('/admin', adminRoutes);

module.exports = router;
