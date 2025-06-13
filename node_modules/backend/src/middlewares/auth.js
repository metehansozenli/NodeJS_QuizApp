const passport = require('passport');

const authMiddleware = {
    authenticate: (strategy) => {
        return (req, res, next) => {
            passport.authenticate(strategy, { session: false }, (err, user, info) => {
                if (err) {
                    return next(err);
                }
                if (!user) {
                    return res.status(401).json({ error: info?.message || 'Yetkilendirme başarısız' });
                }
                req.user = user;
                next();
            })(req, res, next);
        };
    },

    // JWT ile kimlik doğrulama
    authenticateJWT: (req, res, next) => {
        authMiddleware.authenticate('jwt')(req, res, next);
    },

    // Local strateji ile kimlik doğrulama
    authenticateLocal: (req, res, next) => {
        authMiddleware.authenticate('local')(req, res, next);
    }
};

module.exports = authMiddleware; 