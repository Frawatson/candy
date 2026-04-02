const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const PasswordUtils = require('../utils/passwordUtils');
const auth = require('../middleware/auth');

const { 
  ValidationError, 
  UnauthorizedError, 
  NotFoundError 
} = require('../utils/errorTypes');

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/profile', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user profile
    const user = await User.getProfile(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isEmailVerified: user.is_email_verified,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/profile', [
  auth,
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const userId = req.user.id;
    const { username, email } = req.body;

    // Get current user data
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      throw new NotFoundError('User not found');
    }

    const pool = require('../database/pool');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let updateFields = [];
      let updateValues = [];
      let paramIndex = 1;

      // Build dynamic update query
      if (username !== undefined && username !== currentUser.username) {
        updateFields.push(`username = $${paramIndex++}`);
        updateValues.push(username);
      }

      if (email !== undefined && email !== currentUser.email) {
        // Check if new email already exists
        const emailExists = await User.emailExists(email);
        if (emailExists) {
          throw new ValidationError('Email already exists');
        }

        updateFields.push(`email = $${paramIndex++}`);
        updateFields.push(`is_email_verified = $${paramIndex++}`);
        updateFields.push(`email_verified_at = $${paramIndex++}`);
        updateValues.push(email, false, null);

        // TODO: Send email verification for new email
      }

      if (updateFields.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(userId);

      const updateQuery = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND deleted_at IS NULL
        RETURNING id, email, username, is_email_verified, created_at, updated_at
      `;

      const result = await client.query(updateQuery, updateValues);

      if (result.rows.length === 0) {
        throw new NotFoundError('User not found');
      }

      await client.query('COMMIT');

      const updatedUser = result.rows[0];

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            username: updatedUser.username,
            isEmailVerified: updatedUser.is_email_verified,
            createdAt: updatedUser.created_at,
            updatedAt: updatedUser.updated_at
          }
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /users/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/change-password', [
  auth,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validate new password strength
    PasswordUtils.validatePasswordOrThrow(newPassword);

    // Get current user with password
    const user = await User.findByEmail(req.user.email);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isValidPassword = await User.verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Check if new password is different from current
    const isSamePassword = await User.verifyPassword(newPassword, user.password);
    if (isSamePassword) {
      throw new ValidationError('New password must be different from current password');
    }

    // Update password
    await User.updatePassword(userId, newPassword);

    // Revoke all refresh tokens for security (force re-login)
    await RefreshToken.revokeAllByUserId(userId);

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again with your new password.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /users/delete-account:
 *   delete:
 *     summary: Delete user account
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *               confirmation:
 *                 type: string
 *                 enum: ['DELETE_MY_ACCOUNT']
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.delete('/delete-account', [
  auth,
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('confirmation')
    .equals('DELETE_MY_ACCOUNT')
    .withMessage('Confirmation must be "DELETE_MY_ACCOUNT"')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const userId = req.user.id;
    const { password } = req.body;

    // Get current user with password
    const user = await User.findByEmail(req.user.email);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Password is incorrect');
    }

    const pool = require('../database/pool');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Soft delete user (set deleted_at timestamp)
      await client.query(`
        UPDATE users 
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [userId]);

      // Revoke all refresh tokens
      await RefreshToken.revokeAllByUserId(userId);

      // Mark all verification tokens as used
      await client.query(`
        UPDATE email_verification_tokens 
        SET is_used = true, used_at = NOW()
        WHERE user_id = $1
      `, [userId]);

      await client.query(`
        UPDATE password_reset_tokens 
        SET is_used = true, used_at = NOW()
        WHERE user_id = $1
      `, [userId]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;