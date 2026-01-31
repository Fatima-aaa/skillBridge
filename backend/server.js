const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars first
dotenv.config();

const { config, validateEnv } = require('./config/env');
const connectDB = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { initializeScheduler, stopScheduler } = require('./services/scheduler');

// Validate environment variables
try {
  validateEnv();
} catch (error) {
  console.error(`Configuration Error: ${error.message}`);
  process.exit(1);
}

// Connect to database
connectDB().then(() => {
  // Initialize scheduler after DB connection is established
  if (config.scheduler.enabled) {
    initializeScheduler();
  }
});

const app = express();

// Security & CORS middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
}));

// Body parser
app.use(express.json({ limit: '10kb' })); // Limit body size

// Request logging in development
if (config.isDevelopment) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SkillBridge API is running',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.use('/api', routes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

const server = app.listen(config.port, config.host, () => {
  console.log(`Server running in ${config.env} mode on port ${config.port}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  stopScheduler();
  server.close(() => process.exit(1));
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  stopScheduler();
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
