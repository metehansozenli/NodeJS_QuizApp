// Routes for admin dashboard
const express = require('express');
const router = express.Router();
const adminDashboardController = require('../controllers/adminDashboard.controller');

router.get('/analytics', adminDashboardController.getAnalytics);
router.get('/users', adminDashboardController.getUsers);
router.delete('/users/:userId', adminDashboardController.deleteUser);
router.get('/quizzes', adminDashboardController.getQuizzes);
router.delete('/quizzes/:quizId', adminDashboardController.deleteQuiz);
router.get('/questions', adminDashboardController.getQuestions);
router.delete('/questions/:questionId', adminDashboardController.deleteQuestion);

module.exports = router;
