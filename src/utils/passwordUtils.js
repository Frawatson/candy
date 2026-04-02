const bcrypt = require('bcrypt');
const { BCRYPT_ROUNDS } = require('../config/jwt');
const { ValidationError } = require('../utils/errorTypes');

class PasswordUtils {
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password) {
    try {
      return await bcrypt.hash(password, BCRYPT_ROUNDS);
    } catch (error) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  /**
   * Compare a plain password with a hashed password
   */
  static async comparePassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw new Error(`Password comparison failed: ${error.message}`);
    }
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password) {
    const errors = [];

    if (!password) {
      errors.push('Password is required');
      return errors;
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = [
      'password', 'password123', '123456', '123456789', 'qwerty',
      'abc123', 'password1', 'admin', 'letmein', 'welcome'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a more secure password');
    }

    return errors;
  }

  /**
   * Validate and throw if password is weak
   */
  static validatePasswordOrThrow(password) {
    const errors = this.validatePasswordStrength(password);
    if (errors.length > 0) {
      throw new ValidationError(`Password validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Generate a secure random password
   */
  static generateSecurePassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';

    // Ensure at least one character from each required category
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specials = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specials[Math.floor(Math.random() * specials.length)];

    // Fill remaining length with random characters
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password to randomize character positions
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check if password needs rehashing (e.g., if BCRYPT_ROUNDS changed)
   */
  static needsRehash(hashedPassword) {
    try {
      const rounds = bcrypt.getRounds(hashedPassword);
      return rounds !== BCRYPT_ROUNDS;
    } catch (error) {
      // If we can't determine rounds, assume rehash is needed
      return true;
    }
  }
}

module.exports = PasswordUtils;