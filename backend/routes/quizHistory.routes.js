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

// Admin/maintenance routes
router.get('/compare/:sessionId', quizHistoryController.compareScores);
router.post('/rebuild/:sessionId', quizHistoryController.rebuildQuizHistory);
router.post('/rebuild-all', quizHistoryController.rebuildAllQuizHistory);

// Generic fallback (by userId)
router.get('/:userId', quizHistoryController.getQuizHistory);

router.post('/', quizHistoryController.addQuizHistory);

module.exports = router;
