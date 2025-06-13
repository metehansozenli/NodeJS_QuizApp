// Routes for answers
const express = require('express');
const router = express.Router();
const answerController = require('../controllers/answer.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Real-time quiz answer submission (no auth required for players)
router.post('/submit', answerController.submitRealTimeAnswer);

// Original submit with auth (for future use)
router.post('/submit-auth', authMiddleware, answerController.submitAnswer);

module.exports = router;
