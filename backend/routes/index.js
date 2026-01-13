const express = require('express');
const authRoutes = require('./authRoutes');
const mentorProfileRoutes = require('./mentorProfileRoutes');
const mentorshipRoutes = require('./mentorshipRoutes');
const goalRoutes = require('./goalRoutes');
const progressRoutes = require('./progressRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/mentor-profiles', mentorProfileRoutes);
router.use('/mentorships', mentorshipRoutes);
router.use('/goals', goalRoutes);
router.use('/progress', progressRoutes);

module.exports = router;
