const databaseConnection = require('../database/connection');
const RefreshToken = require('../models/RefreshToken');
const logger = require('../utils/logger');

class RefreshTokenService {
  constructor() {
    this.db = databaseConnection;
    this.refreshTokenModel = new RefreshToken();
  }

  async createToken(tokenData) {
    try {
      const token = await this.refreshTokenModel.create(tokenData);
      
      logger.debug('Refresh token created via service', {
        tokenId: token.id,
        userId: token.user_id,
        tokenFamily: token.token_family
      });

      return token;
    } catch (error) {
      logger.error('Failed to create refresh token via service', {
        error: error.message,
        userId: tokenData.userId
      });
      throw error;
    }
  }

  async findTokenByHash(tokenHash) {
    try {
      return await this.refreshTokenModel.findByTokenHash(tokenHash);
    } catch (error) {
      logger.error('Failed to find token by hash via service', {
        error: error.message
      });
      throw error;
    }
  }

  async findTokensByUserId(userId, limit = 10) {
    try {
      return await this.refreshTokenModel.findByUserId(userId, limit);
    } catch (error) {
      logger.error('Failed to find tokens by user ID via service', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  async findTokensByFamily(tokenFamily) {
    try {
      return await this.refreshTokenModel.findByTokenFamily(tokenFamily);
    } catch (error) {
      logger.error('Failed to find tokens by family via service', {
        error: error.message,
        tokenFamily
      });
      throw error;
    }
  }

  async updateTokenLastUsed(tokenHash, ipAddress = null) {
    try {
      const updatedToken = await this.refreshTokenModel.updateLastUsed(tokenHash, ipAddress);
      
      if (updatedToken) {
        logger.debug('Token last used updated via service', {
          tokenId: updatedToken.id,
          userId: updatedToken.user_id
        });
      }

      return updatedToken;
    } catch (error) {
      logger.error('Failed to update token last used via service', {
        error: error.message,
        ipAddress
      });
      throw error;
    }
  }

  async blacklistToken(tokenHash) {
    try {
      const blacklistedToken = await this.refreshTokenModel.blacklist(tokenHash);
      
      if (blacklistedToken) {
        logger.info('Token blacklisted via service', {
          tokenId: blacklistedToken.id,
          userId: blacklistedToken.user_id
        });
      }

      return blacklistedToken;
    } catch (error) {
      logger.error('Failed to blacklist token via service', {
        error: error.message
      });
      throw error;
    }
  }

  async blacklistUserTokens(userId) {
    try {
      const blacklistedCount = await this.refreshTokenModel.blacklistByUserId(userId);
      
      logger.info('User tokens blacklisted via service', {
        userId,
        tokensBlacklisted: blacklistedCount
      });

      return blacklistedCount;
    } catch (error) {
      logger.error('Failed to blacklist user tokens via service', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  async blacklistTokenFamily(tokenFamily) {
    try {
      const blacklistedCount = await this.refreshTokenModel.blacklistTokenFamily(tokenFamily);
      
      logger.info('Token family blacklisted via service', {
        tokenFamily,
        tokensBlacklisted: blacklistedCount
      });

      return blacklistedCount;
    } catch (error) {
      logger.error('Failed to blacklist token family via service', {
        error: error.message,
        tokenFamily
      });
      throw error;
    }
  }

  async validateToken(tokenHash) {
    try {
      const validation = await this.refreshTokenModel.isValid(tokenHash);
      
      logger.debug('Token validation completed via service', {
        valid: validation.valid,
        reason: validation.reason
      });

      return validation;
    } catch (error) {
      logger.error('Failed to validate token via service', {
        error: error.message
      });
      throw error;
    }
  }

  async cleanupExpiredTokens() {
    try {
      const deletedCount = await this.refreshTokenModel.deleteExpired();
      
      if (deletedCount > 0) {
        logger.info('Expired tokens cleaned up via service', {
          tokensDeleted: deletedCount
        });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired tokens via service', {
        error: error.message
      });
      throw error;
    }
  }

  async cleanupBlacklistedTokens(olderThanDays = 30) {
    try {
      const deletedCount = await this.refreshTokenModel.deleteBlacklisted(olderThanDays);
      
      if (deletedCount > 0) {
        logger.info('Blacklisted tokens cleaned up via service', {
          tokensDeleted: deletedCount,
          olderThanDays
        });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup blacklisted tokens via service', {
        error: error.message,
        olderThanDays
      });
      throw error;
    }
  }

  async deleteUserTokens(userId) {
    try {
      const deletedCount = await this.refreshTokenModel.deleteByUserId(userId);
      
      logger.info('User tokens deleted via service', {
        userId,
        tokensDeleted: deletedCount
      });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to delete user tokens via service', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  async getTokenStats() {
    try {
      const stats = await this.refreshTokenModel.getStats();
      
      logger.debug('Token stats retrieved via service', stats);

      return {
        totalTokens: parseInt(stats.total_tokens),
        blacklistedTokens: parseInt(stats.blacklisted_tokens),
        expiredTokens: parseInt(stats.expired_tokens),
        activeTokens: parseInt(stats.active_tokens)
      };
    } catch (error) {
      logger.error('Failed to get token stats via service', {
        error: error.message
      });
      throw error;
    }
  }

  async performMaintenance() {
    try {
      logger.info('Starting refresh token maintenance');

      const expiredDeleted = await this.cleanupExpiredTokens();
      const blacklistedDeleted = await this.cleanupBlacklistedTokens();
      const stats = await this.getTokenStats();

      const maintenanceResult = {
        expiredTokensDeleted: expiredDeleted,
        blacklistedTokensDeleted: blacklistedDeleted,
        currentStats: stats,
        completedAt: new Date()
      };

      logger.info('Refresh token maintenance completed', maintenanceResult);

      return maintenanceResult;
    } catch (error) {
      logger.error('Refresh token maintenance failed', {
        error: error.message
      });
      throw error;
    }
  }

  async getActiveSessionsForUser(userId) {
    try {
      const tokens = await this.findTokensByUserId(userId);
      
      const sessions = tokens.map(token => ({
        id: token.id,
        deviceInfo: token.device_info ? JSON.parse(token.device_info) : null,
        ipAddress: token.ip_address,
        createdAt: token.created_at,
        lastUsedAt: token.last_used_at,
        tokenFamily: token.token_family
      }));

      logger.debug('Active sessions retrieved for user via service', {
        userId,
        sessionCount: sessions.length
      });

      return sessions;
    } catch (error) {
      logger.error('Failed to get active sessions for user via service', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  async revokeSession(userId, tokenFamily) {
    try {
      const blacklistedCount = await this.blacklistTokenFamily(tokenFamily);
      
      if (blacklistedCount === 0) {
        throw new Error('Session not found or already revoked');
      }

      logger.info('Session revoked via service', {
        userId,
        tokenFamily,
        tokensRevoked: blacklistedCount
      });

      return { success: true, tokensRevoked: blacklistedCount };
    } catch (error) {
      logger.error('Failed to revoke session via service', {
        error: error.message,
        userId,
        tokenFamily
      });
      throw error;
    }
  }
}

module.exports = RefreshTokenService;