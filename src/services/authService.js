const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');
const { JWT_SECRET, JWT_EXPIRY } = require('../config/jwt');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData User registration data
   * @returns {Promise<Object>} Created user data
   */
  async register(userData) {
    const { username, email, password } = userData;

    try {
      // Check if user already exists
      const existingUser = await query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User already exists');
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert new user
      const result = await query(
        `INSERT INTO users (username, email, password_hash, created_at, updated_at) 
         VALUES ($1, $2, $3, NOW(), NOW()) 
         RETURNING id, username, email, created_at`,
        [username, email, hashedPassword]
      );

      const user = result.rows[0];
      logger.info('User registered successfully', { userId: user.id, username });

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at
      };
    } catch (error) {
      logger.error('User registration failed', { username, email, error: error.message });
      throw error;
    }
  }

  /**
   * Login user with username/email and password
   * @param {Object} loginData Login credentials
   * @returns {Promise<Object>} Login result with tokens
   */
  async login(loginData) {
    const { identifier, password } = loginData;

    try {
      // Find user by username or email
      const result = await query(
        `SELECT id, username, email, password_hash, is_verified, is_active 
         FROM users 
         WHERE (username = $1 OR email = $1) AND is_active = true`,
        [identifier]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Check if user is verified (if email verification is required)
      if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.is_verified) {
        throw new Error('Email verification required');
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username,
          email: user.email 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      // Update last login
      await query(
        'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
        [user.id]
      );

      logger.info('User logged in successfully', { userId: user.id, username: user.username });

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isVerified: user.is_verified
        }
      };
    } catch (error) {
      logger.error('User login failed', { identifier, error: error.message });
      throw error;
    }
  }

  /**
   * Verify JWT token
   * @param {string} token JWT token
   * @returns {Promise<Object>} Decoded token data
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if user still exists and is active
      const result = await query(
        'SELECT id, username, email, is_active FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found or inactive');
      }

      return {
        ...decoded,
        user: result.rows[0]
      };
    } catch (error) {
      logger.error('Token verification failed', { error: error.message });
      throw new Error('Invalid token');
    }
  }

  /**
   * Change user password
   * @param {number} userId User ID
   * @param {string} currentPassword Current password
   * @param {string} newPassword New password
   * @returns {Promise<void>}
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get current password hash
      const result = await query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid current password');
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedNewPassword, userId]
      );

      logger.info('Password changed successfully', { userId });
    } catch (error) {
      logger.error('Password change failed', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Get user profile by ID
   * @param {number} userId User ID
   * @returns {Promise<Object>} User profile data
   */
  async getUserProfile(userId) {
    try {
      const result = await query(
        `SELECT id, username, email, is_verified, is_active, created_at, updated_at, last_login
         FROM users 
         WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        isVerified: user.is_verified,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login
      };
    } catch (error) {
      logger.error('Failed to get user profile', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {number} userId User ID
   * @param {Object} updateData Profile update data
   * @returns {Promise<Object>} Updated user profile
   */
  async updateUserProfile(userId, updateData) {
    const { username, email } = updateData;
    
    try {
      // Check if new username/email already exists (excluding current user)
      if (username || email) {
        const existingUser = await query(
          `SELECT id FROM users 
           WHERE (username = $1 OR email = $2) AND id != $3`,
          [username || '', email || '', userId]
        );

        if (existingUser.rows.length > 0) {
          throw new Error('Username or email already exists');
        }
      }

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (username) {
        updates.push(`username = $${paramCount++}`);
        values.push(username);
      }

      if (email) {
        updates.push(`email = $${paramCount++}`);
        values.push(email);
      }

      if (updates.length === 0) {
        throw new Error('No valid update fields provided');
      }

      updates.push(`updated_at = NOW()`);
      values.push(userId);

      const query_text = `
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE id = $${paramCount}
        RETURNING id, username, email, is_verified, updated_at
      `;

      const result = await query(query_text, values);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];
      logger.info('User profile updated successfully', { userId, username });

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        isVerified: user.is_verified,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error('Failed to update user profile', { userId, error: error.message });
      throw error;
    }
  }
}

module.exports = new AuthService();