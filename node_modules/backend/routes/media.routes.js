const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/media.controller');
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/fileUpload.middleware');

// Tüm route'lar için kimlik doğrulama gerekli
router.use(authMiddleware);

// Dosya yükleme
router.post('/upload', upload.single('media'), mediaController.uploadMedia);

// Dosya silme
router.delete('/:id', mediaController.deleteFile);

// Dosya listesi
router.get('/list', mediaController.listMedia);
router.get('/:filename', mediaController.getMedia);

module.exports = router;