const databaseConnection = require('../database/connection');
const { hashToken, calculateExpiryDate } = require('../utils/tokenUtils');
const { jwtConfig } = require('../config/jwt');
const logger = require('../utils/logger');

class RefreshToken {
  constructor() {
    this.db = databaseConnection;
  }

  async create({ userId, tokenHash, tokenFamily, expiresAt, deviceInfo = null, ipAddress = null }) {
    try {
      const query = `
        INSERT INTO refresh_tokens (
          user_id, token_hash, expires_at, device_info, ip_address, token_family
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, user_id, token_hash, expires_at, is_blacklisted, 
                  created_at, updated_at, last_used_at, device_info, ip_address
      `;
      
      const values = [
        userId,
        tokenHash,
        expiresAt || calculateExpiryDate(jwtConfig.refreshToken.expiresIn),
        deviceInfo ? JSON.stringify(deviceInfo) : null,
        ipAddress,
        tokenFamily
      ];

      const result = await this.db.query(query, values);
      
      logger.debug('Refresh token created', {
        tokenId: result.rows[0].id,
        userId,
        tokenFamily
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create refresh token', {
        error: error.message,
        userId,
        tokenFamily
      });
      throw error;
    }
  }

  async findByTokenHash(tokenHash) {
    try {
      const query = `
        SELECT id, user_id, token_hash, expires_at, is_blacklisted,
               created_at, updated_at, last_used_at, device_info, ip_address, token_family
        FROM refresh_tokens 
        WHERE token_hash = $1
      `;
      
      const result = await this.db.query(query, [tokenHash]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find refresh token by hash', {
        error: error.message,
        hasTokenHash: !!tokenHash
      });
      throw error;
    }
  }

  async findByUserId(userId, limit = 10) {
    try {
      const query = `
        SELECT id, user_id, token_hash, expires_at, is_blacklisted,
               created_at, updated_at, last_used_at, device_info, ip_address, token_family
        FROM refresh_tokens 
        WHERE user_id = $1 AND is_blacklisted = false
        ORDER BY created_at DESC
        LIMIT $2
      `;
      
      const result = await this.db.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find refresh tokens by user ID', {
        error: error.message,
        userId,
        limit
      });
      throw error;
    }
  }

  async findByTokenFamily(tokenFamily) {
    try {
      const query = `
        SELECT id, user_id, token_hash, expires_at, is_blacklisted,
               created_at, updated_at, last_used_at, device_info, ip_address, token_family
        FROM refresh_tokens 
        WHERE token_family = $1
        ORDER BY created_at DESC
      `;
      
      const result = await this.db.query(query, [tokenFamily]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find refresh tokens by token family', {
        error: error.message,
        tokenFamily
      });
      throw error;
    }
  }

  async updateLastUsed(tokenHash, ipAddress = null) {
    try {
      const query = `
        UPDATE refresh_tokens 
        SET last_used_at = NOW(), 
            updated_at = NOW(),
            ip_address = COALESCE($2, ip_address)
        WHERE token_hash = $1 AND is_blacklisted = false
        RETURNING id, user_id, token_hash, expires_at, is_blacklisted,
                  created_at, updated_at, last_used_at, device_info, ip_address, token_family
      `;
      
      const result = await this.db.query(query, [tokenHash, ipAddress]);
      
      if (result.rows[0]) {
        logger.debug('Refresh token last used updated', {
          tokenId: result.rows[0].id,
          userId: result.rows[0].user_id,
          ipAddress
        });
      }

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to update refresh token last used', {
        error: error.message,
        hasTokenHash: !!tokenHash,
        ipAddress
      });
      throw error;
    }
  }

  async blacklist(tokenHash) {
    try {
      const query = `
        UPDATE refresh_tokens 
        SET is_blacklisted = true, updated_at = NOW()
        WHERE token_hash = $1
        RETURNING id, user_id, is_blacklisted
      `;
      
      const result = await this.db.query(query, [tokenHash]);
      
      if (result.rows[0]) {
        logger.info('Refresh token blacklisted', {
          tokenId: result.rows[0].id,
          userId: result.rows[0].user_id
        });
      }

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to blacklist refresh token', {
        error: error.message,
        hasTokenHash: !!tokenHash
      });
      throw error;
    }
  }

  async blacklistByUserId(userId) {
    try {
      const query = `
        UPDATE refresh_tokens 
        SET is_blacklisted = true, updated_at = NOW()
        WHERE user_id = $1 AND is_blacklisted = false
      `;
      
      const result = await this.db.query(query, [userId]);
      
      logger.info('Refresh tokens blacklisted by user ID', {
        userId,
        tokensBlacklisted: result.rowCount
      });

      return result.rowCount;
    } catch (error) {
      logger.error('Failed to blacklist refresh tokens by user ID', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  async blacklistTokenFamily(tokenFamily) {
    try {
      const query = `
        UPDATE refresh_tokens 
        SET is_blacklisted = true, updated_at = NOW()
        WHERE token_family = $1 AND is_blacklisted = false
      `;
      
      const result = await this.db.query(query, [tokenFamily]);
      
      logger.info('Refresh token family blacklisted', {
        tokenFamily,
        tokensBlacklisted: result.rowCount
      });

      return result.rowCount;
    } catch (error) {
      logger.error('Failed to blacklist refresh token family', {
        error: error.message,
        tokenFamily
      });
      throw error;
    }
  }

  async deleteExpired() {
    try {
      const query = `
        DELETE FROM refresh_tokens 
        WHERE expires_at < NOW()
      `;
      
      const result = await this.db.query(query);
      
      if (result.rowCount > 0) {
        logger.info('Expired refresh tokens deleted', {
          tokensDeleted: result.rowCount
        });
      }

      return result.rowCount;
    } catch (error) {
      logger.error('Failed to delete expired refresh tokens', {
        error: error.message
      });
      throw error;
    }
  }

  async deleteBlacklisted(olderThanDays = 30) {
    try {
      const query = `
        DELETE FROM refresh_tokens 
        WHERE is_blacklisted = true 
        AND updated_at < NOW() - INTERVAL '${olderThanDays} days'
      `;
      
      const result = await this.db.query(query);
      
      if (result.rowCount > 0) {
        logger.info('Old blacklisted refresh tokens deleted', {
          tokensDeleted: result.rowCount,
          olderThanDays
        });
      }

      return result.rowCount;
    } catch (error) {
      logger.error('Failed to delete blacklisted refresh tokens', {
        error: error.message,
        olderThanDays
      });
      throw error;
    }
  }

  async deleteByUserId(userId) {
    try {
      const query = `
        DELETE FROM refresh_tokens 
        WHERE user_id = $1
      `;
      
      const result = await this.db.query(query, [userId]);
      
      logger.info('Refresh tokens deleted by user ID', {
        userId,
        tokensDeleted: result.rowCount
      });

      return result.rowCount;
    } catch (error) {
      logger.error('Failed to delete refresh tokens by user ID', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  async getStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_tokens,
          COUNT(CASE WHEN is_blacklisted = true THEN 1 END) as blacklisted_tokens,
          COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_tokens,
          COUNT(CASE WHEN is_blacklisted = false AND expires_at >= NOW() THEN 1 END) as active_tokens
        FROM refresh_tokens
      `;
      
      const result = await this.db.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get refresh token stats', {
        error: error.message
      });
      throw error;
    }
  }

  async isValid(tokenHash) {
    try {
      const token = await this.findByTokenHash(tokenHash);
      
      if (!token) {
        return { valid: false, reason: 'Token not found' };
      }
      
      if (token.is_blacklisted) {
        return { valid: false, reason: 'Token is blacklisted' };
      }
      
      if (new Date(token.expires_at) < new Date()) {
        return { valid: false, reason: 'Token expired' };
      }
      
      return { valid: true, token };
    } catch (error) {
      logger.error('Failed to validate refresh token', {
        error: error.message,
        hasTokenHash: !!tokenHash
      });
      throw error;
    }
  }
}

module.exports = RefreshToken;