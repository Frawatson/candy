const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const databaseConnection = require('../database/connection');
const { jwtConfig } = require('../config/jwt');
const RefreshToken = require('../models/RefreshToken');
const { hashToken, generateTokenFamily } = require('../utils/tokenUtils');
const logger = require('../utils/logger');

class AuthService {
  constructor() {
    this.db = databaseConnection;
    this.refreshTokenModel = new RefreshToken();
  }

  async register({ username, email, password, firstName, lastName }) {
    return await this.db.transaction(async (client) => {
      try {
        // Check if user already exists
        const existingUser = await client.query(
          'SELECT id FROM users WHERE username = $1 OR email = $2',
          [username, email]
        );

        if (existingUser.rows.length > 0) {
          throw new Error('User already exists');
        }

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const userResult = await client.query(
          `INSERT INTO users (username, email, password_hash, first_name, last_name, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING id, username, email, first_name, last_name, is_verified, created_at`,
          [username, email, hashedPassword, firstName, lastName]
        );

        const user = userResult.rows[0];

        logger.info('User registered successfully', {
          userId: user.id,
          username: user.username,
          email: user.email
        });

        return {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            isVerified: user.is_verified,
            createdAt: user.created_at
          }
        };
      } catch (error) {
        logger.error('User registration failed', {
          error: error.message,
          username,
          email
        });
        throw error;
      }
    });
  }

  async login({ username, password, deviceInfo, ipAddress }) {
    try {
      // Find user by username or email
      const userResult = await this.db.query(
        `SELECT id, username, email, password_hash, first_name, last_name, 
                is_verified, is_active, failed_login_attempts, locked_until
         FROM users 
         WHERE (username = $1 OR email = $1) AND is_active = true`,
        [username]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = userResult.rows[0];

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        throw new Error('Account is temporarily locked due to multiple failed login attempts');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        // Increment failed login attempts
        await this.db.query(
          `UPDATE users 
           SET failed_login_attempts = failed_login_attempts + 1,
               locked_until = CASE 
                 WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
                 ELSE NULL
               END,
               updated_at = NOW()
           WHERE id = $1`,
          [user.id]
        );

        throw new Error('Invalid credentials');
      }

      // Reset failed login attempts on successful login
      await this.db.query(
        `UPDATE users 
         SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [user.id]
      );

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user, deviceInfo, ipAddress);

      logger.info('User logged in successfully', {
        userId: user.id,
        username: user.username,
        ipAddress
      });

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          isVerified: user.is_verified
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: jwtConfig.accessToken.expiresIn
        }
      };
    } catch (error) {
      logger.error('User login failed', {
        error: error.message,
        username,
        ipAddress
      });
      throw error;
    }
  }

  async refreshAccessToken({ refreshToken, deviceInfo, ipAddress }) {
    try {
      const tokenHash = hashToken(refreshToken);
      const validation = await this.refreshTokenModel.isValid(tokenHash);

      if (!validation.valid) {
        // If token is not found or expired, it might be a rotation attack
        if (validation.reason === 'Token not found') {
          // Check if this token belongs to a token family and blacklist the entire family
          try {
            const decoded = jwt.decode(refreshToken);
            if (decoded && decoded.tokenFamily) {
              await this.refreshTokenModel.blacklistTokenFamily(decoded.tokenFamily);
              logger.warn('Token rotation attack detected - blacklisted token family', {
                tokenFamily: decoded.tokenFamily,
                ipAddress
              });
            }
          } catch (decodeError) {
            logger.error('Failed to decode potentially malicious refresh token', {
              error: decodeError.message,
              ipAddress
            });
          }
        }
        throw new Error(`Invalid refresh token: ${validation.reason}`);
      }

      const storedToken = validation.token;

      // Verify JWT signature and extract payload
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, jwtConfig.refreshToken.secret);
      } catch (jwtError) {
        await this.refreshTokenModel.blacklist(tokenHash);
        throw new Error('Invalid refresh token signature');
      }

      // Get user information
      const userResult = await this.db.query(
        'SELECT id, username, email, first_name, last_name, is_verified, is_active FROM users WHERE id = $1 AND is_active = true',
        [storedToken.user_id]
      );

      if (userResult.rows.length === 0) {
        await this.refreshTokenModel.blacklist(tokenHash);
        throw new Error('User not found or inactive');
      }

      const user = userResult.rows[0];

      // Update last used timestamp
      await this.refreshTokenModel.updateLastUsed(tokenHash, ipAddress);

      // Generate new tokens (token rotation)
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = await this.generateRefreshToken(user, deviceInfo, ipAddress, decoded.tokenFamily);

      // Blacklist the old refresh token
      await this.refreshTokenModel.blacklist(tokenHash);

      logger.info('Access token refreshed successfully', {
        userId: user.id,
        username: user.username,
        tokenFamily: decoded.tokenFamily,
        ipAddress
      });

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          isVerified: user.is_verified
        },
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: jwtConfig.accessToken.expiresIn
        }
      };
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error.message,
        ipAddress
      });
      throw error;
    }
  }

  async logout({ refreshToken, ipAddress }) {
    try {
      if (refreshToken) {
        const tokenHash = hashToken(refreshToken);
        await this.refreshTokenModel.blacklist(tokenHash);
        
        logger.info('User logged out successfully', {
          ipAddress,
          hasRefreshToken: true
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('Logout failed', {
        error: error.message,
        ipAddress
      });
      throw error;
    }
  }

  async logoutAll(userId, ipAddress) {
    try {
      const blacklistedCount = await this.refreshTokenModel.blacklistByUserId(userId);
      
      logger.info('User logged out from all devices', {
        userId,
        tokensBlacklisted: blacklistedCount,
        ipAddress
      });

      return { success: true, tokensRevoked: blacklistedCount };
    } catch (error) {
      logger.error('Logout all failed', {
        error: error.message,
        userId,
        ipAddress
      });
      throw error;
    }
  }

  generateAccessToken(user) {
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      isVerified: user.is_verified
    };

    return jwt.sign(payload, jwtConfig.accessToken.secret, {
      expiresIn: jwtConfig.accessToken.expiresIn,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });
  }

  async generateRefreshToken(user, deviceInfo = null, ipAddress = null, existingTokenFamily = null) {
    const tokenFamily = existingTokenFamily || generateTokenFamily();
    
    const payload = {
      userId: user.id,
      tokenFamily,
      type: 'refresh'
    };

    const token = jwt.sign(payload, jwtConfig.refreshToken.secret, {
      expiresIn: jwtConfig.refreshToken.expiresIn,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });

    const tokenHash = hashToken(token);

    // Store in database
    await this.refreshTokenModel.create({
      userId: user.id,
      tokenHash,
      tokenFamily,
      deviceInfo,
      ipAddress
    });

    return token;
  }

  async verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, jwtConfig.accessToken.secret);
      
      // Verify user is still active
      const userResult = await this.db.query(
        'SELECT id, username, email, is_verified, is_active FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found or inactive');
      }

      return {
        valid: true,
        user: userResult.rows[0],
        decoded
      };
    } catch (error) {
      logger.error('Access token verification failed', {
        error: error.message
      });
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async cleanupExpiredTokens() {
    try {
      const expiredCount = await this.refreshTokenModel.deleteExpired();
      const blacklistedCount = await this.refreshTokenModel.deleteBlacklisted();
      
      logger.info('Token cleanup completed', {
        expiredTokensDeleted: expiredCount,
        blacklistedTokensDeleted: blacklistedCount
      });

      return {
        expiredTokensDeleted: expiredCount,
        blacklistedTokensDeleted: blacklistedCount
      };
    } catch (error) {
      logger.error('Token cleanup failed', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = AuthService;