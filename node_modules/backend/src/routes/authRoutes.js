const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/auth');
const validationMiddleware = require('../middlewares/validation');

// Kayıt ol
router.post('/register',
    validationMiddleware.validate(validationMiddleware.userValidation),
    authController.register
);

// Giriş yap
router.post('/login',
    validationMiddleware.validate(validationMiddleware.userValidation),
    authMiddleware.authenticateLocal,
    authController.login
);

// Profil bilgilerini getir
router.get('/profile',
    authMiddleware.authenticateJWT,
    authController.getProfile
);

module.exports = router; 