// Main entry point
require('dotenv').config();
const express = require('express');
const http = require('http');
const setupSocket = require('./config/socket_config');
const passport = require('passport');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const config = require('./config/config');
const db = require('./config/db_config');

require('./middleware/auth.middleware'); // Passport configuration

const app = express();
const server = http.createServer(app);

// Test database connection on startup
db.testConnection().then(connected => {
  if (!connected) {
    console.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }
});

const io = setupSocket(server);

// Make io available globally for other modules
global.io = io;

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
// app.use(limiter); // GEÇICI OLARAK DEVRE DIŞI
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(passport.initialize());

// Configure routes with '/api' prefix
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/quiz', require('./routes/quiz.routes'));
app.use('/api/question', require('./routes/question.routes'));
app.use('/api/session', require('./routes/session.routes'));
app.use('/api/answer', require('./routes/answer.routes'));
app.use('/api/user', require('./routes/user.routes'));
app.use('/api/admin', require('./routes/adminDashboard.routes'));
app.use('/api/question-bank', require('./routes/questionBank.routes'));
app.use('/api/quiz-history', require('./routes/quizHistory.routes'));
app.use('/api/media', require('./routes/media.routes'));
app.use('/api/sounds', require('./routes/sound.routes'));
app.use('/media', express.static(require('path').join(__dirname, '../media')));
app.use('/sounds', express.static(require('path').join(__dirname, '../sounds')));
app.use('/api/hostDashboard', require('./routes/hostDashboard.routes'));

// Serve test HTML/CSS/JS files for session testing
app.use('/test', express.static(path.join(__dirname, 'tests')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
