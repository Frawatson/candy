const logger = require('../utils/logger');

/**
 * RefreshToken model for managing refresh token database operations
 */
class RefreshToken {
  constructor(dbClient = null) {
    this.client = dbClient;
  }

  /**
   * Set database client for this instance
   * @param {Object} client Database client
   */
  setClient(client) {
    this.client = client;
  }

  /**
   * Execute query using the provided client or default connection
   * @param {string} text SQL query text
   * @param {Array} params Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(text, params) {
    if (this.client) {
      return await this.client.query(text, params);
    }
    
    // If no client provided, use the global connection
    const { query } = require('../database/connection');
    return await query(text, params);
  }

  /**
   * Create a new refresh token
   * @param {Object} tokenData Token data
   * @returns {Promise<Object>} Created token data
   */
  async create(tokenData) {
    const { userId, token, expiresAt, userAgent = null, ipAddress = null } = tokenData;

    try {
      const result = await this.query(`
        INSERT INTO refresh_tokens (user_id, token, expires_at, user_agent, ip_address, created_at, is_active)
        VALUES ($1, $2, $3, $4, $5, NOW(), true)
        RETURNING id, user_id, token, expires_at, created_at, is_active
      `, [userId, token, expiresAt, userAgent, ipAddress]);

      const createdToken = result.rows[0];
      logger.debug('Refresh token created', { id: createdToken.id, userId });

      return {
        id: createdToken.id,
        userId: createdToken.user_id,
        token: createdToken.token,
        expiresAt: createdToken.expires_at,
        createdAt: createdToken.created_at,
        isActive: createdToken.is_active
      };
    } catch (error) {
      logger.error('Failed to create refresh token', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Find refresh token by token string
   * @param {string} token Token string
   * @returns {Promise<Object|null>} Token data or null if not found
   */
  async findByToken(token) {
    try {
      const result = await this.query(`
        SELECT id, user_id, token, expires_at, created_at, last_used, is_active, user_agent, ip_address
        FROM refresh_tokens
        WHERE token = $1
      `, [token]);

      if (result.rows.length === 0) {
        return null;
      }

      const tokenData = result.rows[0];
      return {
        id: tokenData.id,
        userId: tokenData.user_id,
        token: tokenData.token,
        expiresAt: tokenData.expires_at,
        createdAt: tokenData.created_at,
        lastUsed: tokenData.last_used,
        isActive: tokenData.is_active,
        userAgent: tokenData.user_agent,
        ipAddress: tokenData.ip_address
      };
    } catch (error) {
      logger.error('Failed to find refresh token', { error: error.message });
      throw error;
    }
  }

  /**
   * Find refresh token by ID
   * @param {number} id Token ID
   * @returns {Promise<Object|null>} Token data or null if not found
   */
  async findById(id) {
    try {
      const result = await this.query(`
        SELECT id, user_id, token, expires_at, created_at, last_used, is_active, user_agent, ip_address
        FROM refresh_tokens
        WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const tokenData = result.rows[0];
      return {
        id: tokenData.id,
        userId: tokenData.user_id,
        token: tokenData.token,
        expiresAt: tokenData.expires_at,
        createdAt: tokenData.created_at,
        lastUsed: tokenData.last_used,
        isActive: tokenData.is_active,
        userAgent: tokenData.user_agent,
        ipAddress: tokenData.ip_address
      };
    } catch (error) {
      logger.error('Failed to find refresh token by ID', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Update last used timestamp and usage information
   * @param {number} id Token ID
   * @param {string} userAgent User agent string
   * @param {string} ipAddress IP address
   * @returns {Promise<boolean>} True if updated successfully
   */
  async updateLastUsed(id, userAgent = null, ipAddress = null) {
    try {
      const result = await this.query(`
        UPDATE refresh_tokens 
        SET last_used = NOW(), user_agent = COALESCE($2, user_agent), ip_address = COALESCE($3, ip_address)
        WHERE id = $1 AND is_active = true
      `, [id, userAgent, ipAddress]);

      const updated = result.rowCount > 0;
      
      if (updated) {
        logger.debug('Refresh token last used updated', { id });
      }

      return updated;
    } catch (error) {
      logger.error('Failed to update refresh token last used', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Revoke a refresh token
   * @param {number} id Token ID
   * @returns {Promise<boolean>} True if revoked successfully
   */
  async revoke(id) {
    try {
      const result = await this.query(`
        UPDATE refresh_tokens 
        SET is_active = false, revoked_at = NOW()
        WHERE id = $1 AND is_active = true
      `, [id]);

      const revoked = result.rowCount > 0;
      
      if (revoked) {
        logger.debug('Refresh token revoked', { id });
      }

      return revoked;
    } catch (error) {
      logger.error('Failed to revoke refresh token', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Delete a refresh token permanently
   * @param {number} id Token ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async delete(id) {
    try {
      const result = await this.query(
        'DELETE FROM refresh_tokens WHERE id = $1',
        [id]
      );

      const deleted = result.rowCount > 0;
      
      if (deleted) {
        logger.debug('Refresh token deleted', { id });
      }

      return deleted;
    } catch (error) {
      logger.error('Failed to delete refresh token', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Get all active refresh tokens for a user
   * @param {number} userId User ID
   * @returns {Promise<Array>} Array of token data
   */
  async findByUserId(userId) {
    try {
      const result = await this.query(`
        SELECT id, user_id, token, expires_at, created_at, last_used, is_active, user_agent, ip_address
        FROM refresh_tokens
        WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
        ORDER BY created_at DESC
      `, [userId]);

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        token: row.token,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        lastUsed: row.last_used,
        isActive: row.is_active,
        userAgent: row.user_agent,
        ipAddress: row.ip_address
      }));
    } catch (error) {
      logger.error('Failed to find refresh tokens by user ID', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Clean up expired tokens for a specific user
   * @param {number} userId User ID
   * @returns {Promise<number>} Number of tokens cleaned up
   */
  async cleanupExpiredForUser(userId) {
    try {
      const result = await this.query(
        'DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at < NOW()',
        [userId]
      );

      const deletedCount = result.rowCount;
      
      if (deletedCount > 0) {
        logger.debug('Expired refresh tokens cleaned up for user', { userId, count: deletedCount });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired tokens for user', { userId, error: error.message });
      throw error;
    }
  }
}

module.exports = RefreshToken;