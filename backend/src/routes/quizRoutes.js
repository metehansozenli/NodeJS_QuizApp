const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');

router.get('/', quizController.getAllQuizzes);
router.get('/category/:categoryId', quizController.getQuizzesByCategory);
router.post('/', quizController.createQuiz);

module.exports = router; 