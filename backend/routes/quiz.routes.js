// Routes for quizzes
const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Public routes
router.get('/fetchQuizList', quizController.getQuizzes);

// Protected routes (temporarily disabled for testing)
// router.use(authMiddleware);

// Quiz management routes - specific routes first
router.post('/createQuiz', quizController.createQuiz);
router.get('/host', quizController.getHostQuizzes);

// Dynamic routes last
router.get('/:quizId', quizController.getQuiz);
router.delete('/:quizId', quizController.deleteQuiz);

// Question management routes
router.post('/:quizId/questions', quizController.addQuestion);
router.put('/:quizId/questions/:questionId', quizController.updateQuestion);
router.delete('/:quizId/questions/:questionId', quizController.deleteQuestion);

module.exports = router;
