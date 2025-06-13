// Routes for sound effects
const express = require('express');
const router = express.Router();
const soundController = require('../controllers/sound.controller');
const upload = require('../middleware/fileUpload.middleware');

router.post('/upload', upload.single('sound'), soundController.uploadSound);
router.get('/list', soundController.listSounds);
router.get('/:filename', soundController.getSound);

module.exports = router;
