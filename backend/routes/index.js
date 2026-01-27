const express = require('express');
const authRoutes = require('./authRoutes');
const mentorProfileRoutes = require('./mentorProfileRoutes');
const mentorshipRoutes = require('./mentorshipRoutes');
const goalRoutes = require('./goalRoutes');
const progressRoutes = require('./progressRoutes');
// Reviews and Feedback (anonymous ratings)
const reviewRoutes = require('./reviewRoutes');
const feedbackRoutes = require('./feedbackRoutes');
const reputationRoutes = require('./reputationRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/mentor-profiles', mentorProfileRoutes);
router.use('/mentorships', mentorshipRoutes);
router.use('/goals', goalRoutes);
router.use('/progress', progressRoutes);
// Reviews and Feedback (anonymous ratings)
router.use('/reviews', reviewRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/reputation', reputationRoutes);

module.exports = router;
