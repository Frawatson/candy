const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const authConfig = require('../config/auth.config');

class JWTUtil {
  /**
   * Generate access token
   * @param {Object} payload - Token payload
   * @returns {string} JWT token
   */
  static generateAccessToken(payload) {
    try {
      return jwt.sign(
        {
          ...payload,
          type: 'access'
        },
        authConfig.jwt.secret,
        {
          expiresIn: authConfig.jwt.expiresIn,
          issuer: authConfig.jwt.issuer,
          audience: authConfig.jwt.audience
        }
      );
    } catch (error) {
      throw new Error('Token generation failed');
    }
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Token payload
   * @returns {string} JWT refresh token
   */
  static generateRefreshToken(payload) {
    try {
      return jwt.sign(
        {
          ...payload,
          type: 'refresh',
          jti: crypto.randomUUID() // Unique token ID for tracking
        },
        authConfig.jwt.refreshSecret,
        {
          expiresIn: authConfig.jwt.refreshExpiresIn,
          issuer: authConfig.jwt.issuer,
          audience: authConfig.jwt.audience
        }
      );
    } catch (error) {
      throw new Error('Refresh token generation failed');
    }
  }

  /**
   * Verify access token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  static verifyAccessToken(token) {
    try {
      // Check if token is blacklisted
      if (authConfig.security.tokenBlacklist.has(token)) {
        throw new Error('Token is blacklisted');
      }

      const decoded = jwt.verify(token, authConfig.jwt.secret, {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience
      });

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   * @param {string} token - JWT refresh token to verify
   * @returns {Object} Decoded token payload
   */
  static verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, authConfig.jwt.refreshSecret, {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      throw error;
    }
  }

  /**
   * Decode token without verification (for inspection)
   * @param {string} token - JWT token to decode
   * @returns {Object} Decoded token payload
   */
  static decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      throw new Error('Token decode failed');
    }
  }

  /**
   * Get token expiration time
   * @param {string} token - JWT token
   * @returns {Date} Expiration date
   */
  static getTokenExpiration(token) {
    try {
      const decoded = this.decodeToken(token);
      return new Date(decoded.exp * 1000);
    } catch (error) {
      throw new Error('Cannot get token expiration');
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} True if token is expired
   */
  static isTokenExpired(token) {
    try {
      const expiration = this.getTokenExpiration(token);
      return Date.now() >= expiration.getTime();
    } catch (error) {
      return true; // Consider invalid tokens as expired
    }
  }

  /**
   * Blacklist a token (logout)
   * @param {string} token - Token to blacklist
   */
  static blacklistToken(token) {
    authConfig.security.tokenBlacklist.add(token);
    
    // Clean up expired tokens from blacklist periodically
    // In production, use Redis with TTL or database
    if (authConfig.security.tokenBlacklist.size > 10000) {
      this.cleanupBlacklist();
    }
  }

  /**
   * Clean up expired tokens from blacklist
   */
  static cleanupBlacklist() {
    const tokensToRemove = [];
    
    for (const token of authConfig.security.tokenBlacklist) {
      if (this.isTokenExpired(token)) {
        tokensToRemove.push(token);
      }
    }
    
    tokensToRemove.forEach(token => {
      authConfig.security.tokenBlacklist.delete(token);
    });
  }

  /**
   * Generate token pair (access + refresh)
   * @param {Object} payload - User payload
   * @returns {Object} Token pair
   */
  static generateTokenPair(payload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }
}

module.exports = JWTUtil;