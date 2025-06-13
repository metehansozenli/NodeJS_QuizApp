const jwt = require('jsonwebtoken');
const config = require('../config/config');

const SECRET_KEY = config.jwt.secret;

/**
 * Generates a JWT token with the given payload.
 * @param {Object} payload - The data to embed in the token.
 * @param {Object} options - Additional options like expiration.
 * @returns {string} - The generated JWT token.
 */
exports.generateToken = (payload, options = { expiresIn: '1h' }) => {
  if (!SECRET_KEY) {
    throw new Error('JWT secret key is not configured');
  }
  return jwt.sign(payload, SECRET_KEY, options);
};

/**
 * Verifies and decodes a JWT token.
 * @param {string} token - The JWT token to verify.
 * @returns {Object} - The decoded token payload.
 */
exports.verifyToken = (token) => {
  try {
    if (!SECRET_KEY) {
      throw new Error('JWT secret key is not configured');
    }
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

const tokenBlacklist = new Set();

/**
 * Adds a token to the blacklist.
 * @param {string} token - The token to blacklist.
 */
exports.addToBlacklist = (token) => {
  tokenBlacklist.add(token);
};

/**
 * Checks if a token is blacklisted.
 * @param {string} token - The token to check.
 * @returns {boolean} - True if the token is blacklisted, false otherwise.
 */
exports.isBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

/**
 * Removes a token from the blacklist.
 * @param {string} token - The token to remove.
 */
exports.removeFromBlacklist = (token) => {
  tokenBlacklist.delete(token);
};
