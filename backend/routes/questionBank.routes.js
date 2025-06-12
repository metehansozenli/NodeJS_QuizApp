// Routes for question bank
const express = require('express');
const router = express.Router();
const questionBankController = require('../controllers/questionBank.controller');

router.post('/add', questionBankController.addQuestionToBank);
router.get('/', questionBankController.getQuestionBank);
router.delete('/:questionId', questionBankController.deleteQuestionFromBank);
router.put('/:questionId', questionBankController.updateQuestionInBank);
router.post('/add-to-quiz', questionBankController.addBankQuestionsToQuiz);
router.get('/categories', questionBankController.getCategories);
router.get('/random', questionBankController.getRandomQuestions);

module.exports = router;
