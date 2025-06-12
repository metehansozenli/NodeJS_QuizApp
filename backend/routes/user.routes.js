// Routes for user data and leaderboard
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/data', userController.getUserData);
router.get('/leaderboard', userController.getLeaderboard);

module.exports = router;
