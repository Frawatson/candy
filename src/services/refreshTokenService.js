const RefreshToken = require('../models/RefreshToken');
const { Pool } = require('pg');
const {
  hashToken,
  createRefreshTokenData,
  sanitizeDeviceInfo,
  getClientIP,
  calculateExpiryDate
} = require('../utils/tokenUtils');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  jwtConfig
} = require('../config/jwt');

class RefreshTokenService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || undefined,
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT,
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    this.refreshTokenModel = new RefreshToken(this.pool);
    this.cleanupInterval = null;
  }

  async generateTokenPair(user, deviceInfo = {}, ipAddress = null) {
    try {
      const sanitizedDeviceInfo = sanitizeDeviceInfo(deviceInfo.userAgent, deviceInfo);
      const refreshTokenData = createRefreshTokenData(user, sanitizedDeviceInfo, ipAddress);
      
      // Create access token
      const accessTokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role || 'user'
      };
      
      const accessToken = generateAccessToken(accessTokenPayload);
      
      // Store refresh token in database
      const expiresAt = calculateExpiryDate(jwtConfig.refreshToken.expiresIn);
      
      await this.refreshTokenModel.create({
        userId: user.id,
        tokenHash: refreshTokenData.tokenHash,
        tokenFamily: refreshTokenData.tokenFamily,
        expiresAt,
        deviceInfo: sanitizedDeviceInfo,
        ipAddress
      });

      return {
        accessToken,
        refreshToken: refreshTokenData.token,
        expiresIn: jwtConfig.accessToken.expiresIn,
        tokenType: 'Bearer'
      };
    } catch (error) {
      console.error('Token generation failed:', error.message);
      throw new Error('Failed to generate authentication tokens');
    }
  }

  async rotateRefreshToken(refreshToken, deviceInfo = {}, ipAddress = null) {
    try {
      // Verify and decode the refresh token
      const decoded = verifyRefreshToken(refreshToken);
      const tokenHash = hashToken(refreshToken);
      
      // Check if token exists and is valid in database
      const tokenRecord = await this.refreshTokenModel.findByTokenHash(tokenHash);
      
      if (!tokenRecord) {
        throw new Error('Refresh token not found');
      }
      
      if (tokenRecord.is_blacklisted) {
        // Token is blacklisted - possible token theft
        await this.blacklistTokenFamily(tokenRecord.token_family);
        throw new Error('Refresh token is blacklisted');
      }
      
      if (new Date(tokenRecord.expires_at) < new Date()) {
        await this.refreshTokenModel.blacklist(tokenHash);
        throw new Error('Refresh token has expired');
      }

      // Update last used timestamp
      await this.refreshTokenModel.updateLastUsed(tokenHash, ipAddress);
      
      // Blacklist the current token
      await this.refreshTokenModel.blacklist(tokenHash);
      
      // Generate new token pair with same user
      const user = {
        id: decoded.userId,
        email: decoded.email
      };
      
      return await this.generateTokenPair(user, deviceInfo, ipAddress);
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new Error('Invalid refresh token');
      }
      
      console.error('Token rotation failed:', error.message);
      throw error;
    }
  }

  async validateRefreshToken(refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const tokenHash = hashToken(refreshToken);
      
      const validation = await this.refreshTokenModel.isValid(tokenHash);
      
      if (!validation.valid) {
        if (validation.reason === 'Token not found') {
          // Check if token family exists and blacklist if found (possible replay attack)
          const familyTokens = await this.refreshTokenModel.findByTokenFamily(decoded.tokenFamily);
          if (familyTokens.length > 0) {
            await this.blacklistTokenFamily(decoded.tokenFamily);
            throw new Error('Suspicious token activity detected');
          }
        }
        
        throw new Error(validation.reason);
      }
      
      return {
        valid: true,
        userId: decoded.userId,
        email: decoded.email,
        tokenFamily: decoded.tokenFamily,
        tokenRecord: validation.token
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new Error('Invalid or expired refresh token');
      }
      
      throw error;
    }
  }

  async blacklistToken(refreshToken) {
    try {
      const tokenHash = hashToken(refreshToken);
      const result = await this.refreshTokenModel.blacklist(tokenHash);
      
      return {
        success: !!result,
        message: result ? 'Token blacklisted successfully' : 'Token not found'
      };
    } catch (error) {
      console.error('Token blacklisting failed:', error.message);
      throw new Error('Failed to blacklist token');
    }
  }

  async blacklistTokenFamily(tokenFamily) {
    try {
      const count = await this.refreshTokenModel.blacklistTokenFamily(tokenFamily);
      
      console.log(`Blacklisted ${count} tokens in family: ${tokenFamily}`);
      
      return {
        success: true,
        blacklistedCount: count,
        message: `Blacklisted ${count} tokens in the token family`
      };
    } catch (error) {
      console.error('Token family blacklisting failed:', error.message);
      throw new Error('Failed to blacklist token family');
    }
  }

  async blacklistAllUserTokens(userId) {
    try {
      const count = await this.refreshTokenModel.blacklistByUserId(userId);
      
      console.log(`Blacklisted ${count} tokens for user: ${userId}`);
      
      return {
        success: true,
        blacklistedCount: count,
        message: `Blacklisted ${count} refresh tokens`
      };
    } catch (error) {
      console.error('User token blacklisting failed:', error.message);
      throw new Error('Failed to blacklist user tokens');
    }
  }

  async getUserActiveTokens(userId, limit = 10) {
    try {
      const tokens = await this.refreshTokenModel.findByUserId(userId, limit);
      
      return tokens.map(token => ({
        id: token.id,
        createdAt: token.created_at,
        lastUsedAt: token.last_used_at,
        expiresAt: token.expires_at,
        deviceInfo: token.device_info,
        ipAddress: token.ip_address,
        isExpired: new Date(token.expires_at) < new Date()
      }));
    } catch (error) {
      console.error('Failed to get user tokens:', error.message);
      throw new Error('Failed to retrieve user tokens');
    }
  }

  async cleanupExpiredTokens() {
    try {
      const expiredCount = await this.refreshTokenModel.deleteExpired();
      const blacklistedCount = await this.refreshTokenModel.deleteBlacklisted();
      
      console.log(`Cleanup completed: ${expiredCount} expired tokens, ${blacklistedCount} old blacklisted tokens removed`);
      
      return {
        success: true,
        expiredRemoved: expiredCount,
        blacklistedRemoved: blacklistedCount,
        totalRemoved: expiredCount + blacklistedCount
      };
    } catch (error) {
      console.error('Token cleanup failed:', error.message);
      throw new Error('Failed to cleanup tokens');
    }
  }

  async getTokenStats() {
    try {
      return await this.refreshTokenModel.getStats();
    } catch (error) {
      console.error('Failed to get token stats:', error.message);
      throw new Error('Failed to retrieve token statistics');
    }
  }

  startCleanupScheduler(intervalMinutes = 60) {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    const intervalMs = intervalMinutes * 60 * 1000;
    
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredTokens();
      } catch (error) {
        console.error('Scheduled token cleanup failed:', error.message);
      }
    }, intervalMs);
    
    console.log(`Token cleanup scheduler started (every ${intervalMinutes} minutes)`);
  }

  stopCleanupScheduler() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Token cleanup scheduler stopped');
    }
  }

  async close() {
    this.stopCleanupScheduler();
    await this.pool.end();
  }
}

// Create singleton instance
const refreshTokenService = new RefreshTokenService();

module.exports = refreshTokenService;