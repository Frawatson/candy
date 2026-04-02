const pool = require('../database/pool');
const bcrypt = require('bcrypt');
const { DatabaseError } = require('../utils/errorTypes');
const { BCRYPT_ROUNDS } = require('../config/jwt');

class User {
  /**
   * Create a new user
   */
  static async create({ email, password, username = null }) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      
      const query = `
        INSERT INTO users (email, password, username, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id, email, username, is_email_verified, created_at, updated_at
      `;
      
      const values = [email, hashedPassword, username];
      const result = await client.query(query, values);
      
      await client.query('COMMIT');
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error.constraint === 'users_email_unique') {
        throw new DatabaseError('Email already exists');
      }
      
      throw new DatabaseError(`Failed to create user: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    try {
      const query = `
        SELECT id, email, password, username, is_email_verified, created_at, updated_at
        FROM users
        WHERE email = $1 AND deleted_at IS NULL
      `;
      
      const result = await pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      throw new DatabaseError(`Failed to find user by email: ${error.message}`);
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    try {
      const query = `
        SELECT id, email, username, is_email_verified, created_at, updated_at
        FROM users
        WHERE id = $1 AND deleted_at IS NULL
      `;
      
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new DatabaseError(`Failed to find user by ID: ${error.message}`);
    }
  }

  /**
   * Verify user password
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw new DatabaseError(`Password verification failed: ${error.message}`);
    }
  }

  /**
   * Update user email verification status
   */
  static async updateEmailVerification(userId, isVerified = true) {
    try {
      const query = `
        UPDATE users
        SET is_email_verified = $1, email_verified_at = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING id, email, is_email_verified, email_verified_at
      `;
      
      const values = [isVerified, isVerified ? new Date() : null, userId];
      const result = await pool.query(query, values);
      
      return result.rows[0] || null;
    } catch (error) {
      throw new DatabaseError(`Failed to update email verification: ${error.message}`);
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(userId, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      
      const query = `
        UPDATE users
        SET password = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, email, updated_at
      `;
      
      const result = await pool.query(query, [hashedPassword, userId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new DatabaseError(`Failed to update password: ${error.message}`);
    }
  }

  /**
   * Check if email exists
   */
  static async emailExists(email) {
    try {
      const query = 'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL';
      const result = await pool.query(query, [email]);
      return result.rows.length > 0;
    } catch (error) {
      throw new DatabaseError(`Failed to check email existence: ${error.message}`);
    }
  }

  /**
   * Get user profile (without sensitive data)
   */
  static async getProfile(userId) {
    try {
      const query = `
        SELECT id, email, username, is_email_verified, created_at, updated_at
        FROM users
        WHERE id = $1 AND deleted_at IS NULL
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new DatabaseError(`Failed to get user profile: ${error.message}`);
    }
  }
}

module.exports = User;