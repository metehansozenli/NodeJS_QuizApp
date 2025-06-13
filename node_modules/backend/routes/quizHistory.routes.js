// Routes for quiz history
const express = require('express');
const router = express.Router();
const quizHistoryController = require('../controllers/quizHistory.controller');

// Specific routes before generic
router.get('/player/:userId', quizHistoryController.getPlayerHistory);
router.get('/host/:hostId', quizHistoryController.getHostHistory);
router.get('/session/:sessionId/detail', quizHistoryController.getSessionHistory);
router.get('/quiz/:quizId', quizHistoryController.getQuizHistoryByQuiz);
router.get('/session/:sessionId', quizHistoryController.getQuizHistoryDetail);

// Generic fallback (by userId)
router.get('/:userId', quizHistoryController.getQuizHistory);

router.post('/', quizHistoryController.addQuizHistory);

module.exports = router;
