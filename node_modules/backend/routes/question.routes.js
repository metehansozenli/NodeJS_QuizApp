// Routes for questions
const express = require('express');
const router = express.Router();
const questionController = require('../controllers/question.controller');
const upload = require('../middleware/fileUpload.middleware');

router.post('/add', upload.single('multimedia'), questionController.addQuestion);
router.get('/:quizId', questionController.getQuestions);

module.exports = router;
