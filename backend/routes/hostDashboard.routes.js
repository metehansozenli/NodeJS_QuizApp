// Routes for host dashboard (host-specific)
const express = require('express');
const router = express.Router();
const hostDashboardController = require('../controllers/hostDashboard.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/quizzes', hostDashboardController.getHostQuizzes);
router.get('/sessions', hostDashboardController.getHostSessions);
router.get('/quiz/:quizId/questions', hostDashboardController.getQuizQuestions);
router.get('/analytics', hostDashboardController.getHostAnalytics);

module.exports = router;
