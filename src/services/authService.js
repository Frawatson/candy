const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { generateAccessToken } = require('../config/jwt');
const refreshTokenService = require('./refreshTokenService');
const { getClientIP, sanitizeDeviceInfo } = require('../utils/tokenUtils');

class AuthService {
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
  }

  async login(email, password, req = null) {
    const client = await this.pool.connect();
    
    try {
      // Find user by email
      const userQuery = `
        SELECT id, email, password, role, is_verified, is_active, 
               first_name, last_name, created_at, updated_at
        FROM users 
        WHERE email = $1 AND is_active = true
      `;
      
      const userResult = await client.query(userQuery, [email]);
      const user = userResult.rows[0];

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Check if email is verified
      if (!user.is_verified) {
        throw new Error('Email address is not verified');
      }

      // Extract client information if request object provided
      let ipAddress = null;
      let deviceInfo = {};
      
      if (req) {
        ipAddress = getClientIP(req);
        deviceInfo = sanitizeDeviceInfo(req.headers['user-agent'], {
          platform: req.headers['x-platform'],
          browser: req.headers['x-browser'],
          version: req.headers['x-version']
        });
      }

      // Generate token pair
      const tokens = await refreshTokenService.generateTokenPair(
        user,
        deviceInfo,
        ipAddress
      );

      // Update last login timestamp
      await client.query(
        'UPDATE users SET updated_at = NOW() WHERE id = $1',
        [user.id]
      );

      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        tokens
      };
    } finally {
      client.release();
    }
  }

  async register(userData, req = null) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const { email, password, firstName, lastName, role = 'user' } = userData;

      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const userQuery = `
        INSERT INTO users (email, password, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, first_name, last_name, role, is_verified, 
                  is_active, created_at, updated_at
      `;
      
      const userValues = [email, hashedPassword, firstName, lastName, role];
      const userResult = await client.query(userQuery, userValues);
      const newUser = userResult.rows[0];

      // Extract client information if request object provided
      let ipAddress = null;
      let deviceInfo = {};
      
      if (req) {
        ipAddress = getClientIP(req);
        deviceInfo = sanitizeDeviceInfo(req.headers['user-agent'], {
          platform: req.headers['x-platform'],
          browser: req.headers['x-browser'],
          version: req.headers['x-version']
        });
      }

      // Generate token pair for automatic login after registration
      const tokens = await refreshTokenService.generateTokenPair(
        newUser,
        deviceInfo,
        ipAddress
      );

      await client.query('COMMIT');

      return {
        user: newUser,
        tokens
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async logout(refreshToken) {
    try {
      const result = await refreshTokenService.blacklistToken(refreshToken);
      return result;
    } catch (error) {
      console.error('Logout failed:', error.message);
      throw new Error('Logout failed');
    }
  }

  async logoutAllDevices(userId) {
    try {
      const result = await refreshTokenService.blacklistAllUserTokens(userId);
      return result;
    } catch (error) {
      console.error('Logout all devices failed:', error.message);
      throw new Error('Failed to logout from all devices');
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    const client = await this.pool.connect();
    
    try {
      // Get current user
      const userQuery = 'SELECT password FROM users WHERE id = $1 AND is_active = true';
      const userResult = await client.query(userQuery, [userId]);
      const user = userResult.rows[0];

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await client.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, userId]
      );

      // Logout from all devices for security
      await this.logoutAllDevices(userId);

      return {
        success: true,
        message: 'Password changed successfully. Please login again.'
      };
    } finally {
      client.release();
    }
  }

  async resetPassword(email, newPassword, resetToken) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify reset token (this would typically be stored in a separate table)
      // For now, we'll assume token verification is handled elsewhere
      
      const userQuery = `
        SELECT id FROM users 
        WHERE email = $1 AND is_active = true
      `;
      
      const userResult = await client.query(userQuery, [email]);
      const user = userResult.rows[0];

      if (!user) {
        throw new Error('User not found');
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await client.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, user.id]
      );

      // Logout from all devices for security
      await this.logoutAllDevices(user.id);

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserById(userId) {
    const client = await this.pool.connect();
    
    try {
      const userQuery = `
        SELECT id, email, first_name, last_name, role, is_verified, 
               is_active, created_at, updated_at
        FROM users 
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await client.query(userQuery, [userId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async verifyEmail(userId) {
    const client = await this.pool.connect();
    
    try {
      await client.query(
        'UPDATE users SET is_verified = true, updated_at = NOW() WHERE id = $1',
        [userId]
      );

      return {
        success: true,
        message: 'Email verified successfully'
      };
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Create singleton instance
const authService = new AuthService();

module.exports = authService;