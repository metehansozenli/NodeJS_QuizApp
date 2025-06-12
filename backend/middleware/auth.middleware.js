const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const config = require('../config/config');

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwt.secret,
};

passport.use(
  new JwtStrategy(options, (payload, done) => {
    try {
      // Attach all payload fields to req.user
      return done(null, payload);
    } catch (error) {
      return done(error, false);
    }
  })
);

module.exports = passport.authenticate('jwt', { session: false });
