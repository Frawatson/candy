const rateLimit = require('express-rate-limit');
const rateLimitConfig = require('../config/rateLimit');

/**
 * Rate limiter for authentication endpoints
 * Uses environment variables RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX_ATTEMPTS
 */
const authRateLimit = rateLimit(rateLimitConfig.getAuthConfig());

/**
 * Rate limiter for general endpoints
 * More lenient than auth endpoints
 */
const generalRateLimit = rateLimit(rateLimitConfig.getGeneralConfig());

/**
 * Strict rate limiter for sensitive operations
 * More restrictive than auth endpoints
 */
const strictRateLimit = rateLimit(rateLimitConfig.getStrictConfig());

/**
 * Create a custom rate limiter with specific configuration
 * @param {Object} options - Rate limit options
 * @returns {Function} Rate limiting middleware
 */
const createRateLimit = (options) => {
  return rateLimit({
    ...rateLimitConfig.getGeneralConfig(),
    ...options
  });
};

module.exports = {
  authRateLimit,
  generalRateLimit,
  strictRateLimit,
  createRateLimit
};