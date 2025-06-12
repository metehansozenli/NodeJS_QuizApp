const authService = require('../services/authService');
const jwt = require('jsonwebtoken');

const authController = {
    register: async (req, res) => {
        try {
            const user = await authService.register(req.body);
            res.status(201).json(user);
        } catch (error) {
            console.error('Kullanıcı kaydı hatası:', error);
            res.status(500).json({ error: 'Sunucu hatası' });
        }
    },

    login: async (req, res) => {
        try {
            const token = jwt.sign(
                { userId: req.user.id },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.json({
                token,
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    name: req.user.name
                }
            });
        } catch (error) {
            console.error('Giriş hatası:', error);
            res.status(500).json({ error: 'Sunucu hatası' });
        }
    },

    getProfile: async (req, res) => {
        try {
            res.json({
                id: req.user.id,
                email: req.user.email,
                name: req.user.name
            });
        } catch (error) {
            console.error('Profil bilgisi alma hatası:', error);
            res.status(500).json({ error: 'Sunucu hatası' });
        }
    }
};

module.exports = authController; 