const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query, transaction } = require('../database/connection');
const { JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRY, JWT_SECRET, JWT_EXPIRY } = require('../config/jwt');
const RefreshToken = require('../models/RefreshToken');
const logger = require('../utils/logger');

class RefreshTokenService {
  /**
   * Generate a new refresh token for a user
   * @param {number} userId User ID
   * @param {string} userAgent User agent string
   * @param {string} ipAddress Client IP address
   * @returns {Promise<Object>} Refresh token data
   */
  async generateRefreshToken(userId, userAgent = null, ipAddress = null) {
    try {
      return await transaction(async (client) => {
        // Generate a secure random token
        const token = crypto.randomBytes(40).toString('hex');
        
        // Calculate expiry date
        const expiryHours = parseInt(JWT_REFRESH_EXPIRY.replace('h', '')) || 168; // Default 7 days
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiryHours);

        // Create refresh token record
        const refreshToken = new RefreshToken(client);
        const tokenData = await refreshToken.create({
          userId,
          token,
          expiresAt,
          userAgent,
          ipAddress
        });

        logger.info('Refresh token generated', { userId, tokenId: tokenData.id });
        
        return {
          id: tokenData.id,
          token: tokenData.token,
          expiresAt: tokenData.expiresAt
        };
      });
    } catch (error) {
      logger.error('Failed to generate refresh token', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Validate and use a refresh token to generate new access token
   * @param {string} token Refresh token string
   * @param {string} userAgent User agent string
   * @param {string} ipAddress Client IP address
   * @returns {Promise<Object>} New access token and refresh token
   */
  async refreshAccessToken(token, userAgent = null, ipAddress = null) {
    try {
      return await transaction(async (client) => {
        // Find and validate refresh token
        const refreshToken = new RefreshToken(client);
        const tokenData = await refreshToken.findByToken(token);

        if (!tokenData) {
          throw new Error('Invalid refresh token');
        }

        if (new Date() > tokenData.expiresAt) {
          // Remove expired token
          await refreshToken.delete(tokenData.id);
          throw new Error('Refresh token expired');
        }

        if (!tokenData.isActive) {
          throw new Error('Refresh token revoked');
        }

        // Get user data
        const userResult = await client.query(
          'SELECT id, username, email, is_active FROM users WHERE id = $1 AND is_active = true',
          [tokenData.userId]
        );

        if (userResult.rows.length === 0) {
          throw new Error('User not found or inactive');
        }

        const user = userResult.rows[0];

        // Generate new access token
        const accessToken = jwt.sign(
          {
            userId: user.id,
            username: user.username,
            email: user.email
          },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRY }
        );

        // Update refresh token usage
        await refreshToken.updateLastUsed(tokenData.id, userAgent, ipAddress);

        // Generate new refresh token for security (token rotation)
        const newRefreshTokenData = await this.generateRefreshToken(
          user.id,
          userAgent,
          ipAddress
        );

        // Revoke old refresh token
        await refreshToken.revoke(tokenData.id);

        logger.info('Access token refreshed', { userId: user.id, oldTokenId: tokenData.id, newTokenId: newRefreshTokenData.id });

        return {
          accessToken,
          refreshToken: newRefreshTokenData.token,
          expiresAt: newRefreshTokenData.expiresAt,
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        };
      });
    } catch (error) {
      logger.error('Failed to refresh access token', { error: error.message });
      throw error;
    }
  }

  /**
   * Revoke a specific refresh token
   * @param {string} token Refresh token to revoke
   * @returns {Promise<boolean>} True if revoked successfully
   */
  async revokeRefreshToken(token) {
    try {
      const result = await query(
        'UPDATE refresh_tokens SET is_active = false, revoked_at = NOW() WHERE token = $1 AND is_active = true',
        [token]
      );

      const revoked = result.rowCount > 0;
      
      if (revoked) {
        logger.info('Refresh token revoked', { token: token.substring(0, 10) + '...' });
      }

      return revoked;
    } catch (error) {
      logger.error('Failed to revoke refresh token', { error: error.message });
      throw error;
    }
  }

  /**
   * Revoke all refresh tokens for a user
   * @param {number} userId User ID
   * @returns {Promise<number>} Number of tokens revoked
   */
  async revokeAllUserTokens(userId) {
    try {
      const result = await query(
        'UPDATE refresh_tokens SET is_active = false, revoked_at = NOW() WHERE user_id = $1 AND is_active = true',
        [userId]
      );

      const revokedCount = result.rowCount;
      logger.info('All user refresh tokens revoked', { userId, count: revokedCount });
      
      return revokedCount;
    } catch (error) {
      logger.error('Failed to revoke all user tokens', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Get all active refresh tokens for a user
   * @param {number} userId User ID
   * @returns {Promise<Array>} Array of refresh token data
   */
  async getUserRefreshTokens(userId) {
    try {
      const result = await query(`
        SELECT id, token, created_at, expires_at, last_used, user_agent, ip_address
        FROM refresh_tokens 
        WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
        ORDER BY created_at DESC
      `, [userId]);

      return result.rows.map(row => ({
        id: row.id,
        token: row.token.substring(0, 10) + '...', // Partial token for security
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        lastUsed: row.last_used,
        userAgent: row.user_agent,
        ipAddress: row.ip_address
      }));
    } catch (error) {
      logger.error('Failed to get user refresh tokens', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Clean up expired refresh tokens
   * @returns {Promise<number>} Number of tokens cleaned up
   */
  async cleanupExpiredTokens() {
    try {
      const result = await query(
        'DELETE FROM refresh_tokens WHERE expires_at < NOW()'
      );

      const deletedCount = result.rowCount;
      
      if (deletedCount > 0) {
        logger.info('Expired refresh tokens cleaned up', { count: deletedCount });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired tokens', { error: error.message });
      throw error;
    }
  }

  /**
   * Get refresh token statistics
   * @returns {Promise<Object>} Token statistics
   */
  async getTokenStatistics() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_tokens,
          COUNT(*) FILTER (WHERE is_active = true) as active_tokens,
          COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_tokens,
          COUNT(*) FILTER (WHERE is_active = false AND revoked_at IS NOT NULL) as revoked_tokens
        FROM refresh_tokens
      `);

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get token statistics', { error: error.message });
      throw error;
    }
  }
}

module.exports = new RefreshTokenService();