const { ValidationError } = require('../utils/errorTypes');

/**
 * Rate limiting configuration
 * Validates environment variables and provides defaults
 */
class RateLimitConfig {
  constructor() {
    this.windowMs = this.validateWindowMs();
    this.maxAttempts = this.validateMaxAttempts();
  }

  validateWindowMs() {
    const windowMs = process.env.RATE_LIMIT_WINDOW_MS;
    
    if (!windowMs) {
      return 15 * 60 * 1000; // Default: 15 minutes
    }

    const parsed = parseInt(windowMs, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new ValidationError('RATE_LIMIT_WINDOW_MS must be a positive integer');
    }

    return parsed;
  }

  validateMaxAttempts() {
    const maxAttempts = process.env.RATE_LIMIT_MAX_ATTEMPTS;
    
    if (!maxAttempts) {
      return 5; // Default: 5 attempts
    }

    const parsed = parseInt(maxAttempts, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new ValidationError('RATE_LIMIT_MAX_ATTEMPTS must be a positive integer');
    }

    return parsed;
  }

  /**
   * Get configuration for authentication endpoints
   */
  getAuthConfig() {
    return {
      windowMs: this.windowMs,
      max: this.maxAttempts,
      message: {
        success: false,
        message: `Too many authentication attempts. Please try again in ${Math.ceil(this.windowMs / 60000)} minutes.`,
        error: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req) => {
        // Use IP address and user agent for key generation
        return `${req.ip}:${req.headers['user-agent'] || 'unknown'}`;
      }
    };
  }
        // Rate limiting is scoped per IP address only — do NOT include User-Agent
        // or other attacker-controlled headers, as rotating them trivially bypasses limits
        return req.ip;
  /**
   * Get configuration for general endpoints
   */
  getGeneralConfig() {
    return {
      windowMs: this.windowMs,
      max: this.maxAttempts * 10, // More lenient for general endpoints
      message: {
        success: false,
        message: `Too many requests. Please try again in ${Math.ceil(this.windowMs / 60000)} minutes.`,
        error: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
      skipFailedRequests: false,
      skipSuccessfulRequests: false,
        return req.ip;
      }
    };
  }

  /**
   * Get configuration for strict endpoints (sensitive operations)
   */
  getStrictConfig() {
    return {
      windowMs: this.windowMs,
      max: Math.ceil(this.maxAttempts / 2) || 1, // Stricter limit
      message: {
        success: false,
        message: `Too many attempts for sensitive operation. Please try again in ${Math.ceil(this.windowMs / 60000)} minutes.`,
        error: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req) => {
        // Include user ID if authenticated for more granular limiting
        const userId = req.user?.id || 'anonymous';
        return `${req.ip}:${userId}:${req.headers['user-agent'] || 'unknown'}`;
      }
    };
  }
}

module.exports = new RateLimitConfig();