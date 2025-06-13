// Routes for sessions
const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session.controller');
const authMiddleware = require('../middleware/auth.middleware');

// router.use(authMiddleware); // AUTHENTICATION DEVRE DIŞI

// Session management routes
router.post('/start', sessionController.startSession);
router.post('/end', sessionController.endSession);

// En spesifik route'lar en üstte olmalı
router.put('/state/:sessionId', sessionController.updateSessionState);
router.get('/state/:sessionId', sessionController.getSessionState);

// Status check route
router.get('/status/:sessionId', sessionController.checkSessionStatus);

// Participant management - SPESİFİK ROUTE'LAR
router.post('/addParticipant', sessionController.addParticipant);

// Frontend uyumluluğu için ek route'lar - SPESİFİK ROUTE'LAR ÖNCE
router.get('/:sessionId/game', sessionController.getSessionGame);
router.get('/:sessionId/participants', sessionController.getParticipants);
router.get('/:sessionId/leaderboard', sessionController.getLeaderboard);
router.get('/:sessionId/state', sessionController.getSessionState);
router.put('/:sessionId/state', sessionController.updateSessionState);
router.put('/:sessionId/remove-participant/:userId', sessionController.removeParticipant);
router.post('/:sessionId/answer', sessionController.submitAnswer);

// En genel route en sonda
router.get('/public-active', sessionController.getActivePublicSessions);
router.get('/:sessionId', sessionController.getSessionById);

module.exports = router;
