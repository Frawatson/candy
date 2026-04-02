const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { generateTokens, generateSecureToken, hashToken } = require('../utils/tokenUtils');
const PasswordUtils = require('../utils/passwordUtils');
const emailService = require('../services/emailService');
const pool = require('../database/pool');

const { 
  ValidationError, 
  UnauthorizedError, 
  NotFoundError,
  ConflictError 
} = require('../utils/errorTypes');

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 */
router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
], async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { email, password, username } = req.body;

    // Validate password strength
    PasswordUtils.validatePasswordOrThrow(password);

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create user
    const user = await User.create({
      email,
      password,
      username
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      sub: user.id,
      email: user.email,
      isEmailVerified: user.is_email_verified
    });

    // Store refresh token
    const deviceId = req.headers['x-device-id'] || crypto.randomUUID();
    await RefreshToken.create({
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      deviceId,
      deviceName: req.headers['x-device-name'] || 'Unknown Device',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Generate email verification token
    const verificationToken = generateSecureToken();
    const verificationTokenHash = hashToken(verificationToken);
    
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO email_verification_tokens (token_hash, user_id, email, expires_at)
        VALUES ($1, $2, $3, $4)
      `, [
        verificationTokenHash,
        user.id,
        user.email,
        new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      ]);
    } finally {
      client.release();
    }

    // Send verification email
    try {
      await emailService.sendEmailVerification(user.email, verificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isEmailVerified: user.is_email_verified
        },
        accessToken,
        refreshToken,
        tokenType: 'Bearer'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      sub: user.id,
      email: user.email,
      isEmailVerified: user.is_email_verified
    });

    // Store refresh token
    const deviceId = req.headers['x-device-id'] || crypto.randomUUID();
    await RefreshToken.create({
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      deviceId,
      deviceName: req.headers['x-device-name'] || 'Unknown Device',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isEmailVerified: user.is_email_verified
        },
        accessToken,
        refreshToken,
        tokenType: 'Bearer'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Verify user email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Email verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/verify-email', [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { token } = req.body;
    const tokenHash = hashToken(token);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Find and validate token
      const tokenResult = await client.query(`
        SELECT user_id, email, expires_at, is_used
        FROM email_verification_tokens
        WHERE token_hash = $1
      `, [tokenHash]);

      if (tokenResult.rows.length === 0) {
        throw new NotFoundError('Invalid verification token');
      }

      const tokenData = tokenResult.rows[0];

      if (tokenData.is_used) {
        throw new ValidationError('Token has already been used');
      }

      if (new Date() > tokenData.expires_at) {
        throw new ValidationError('Token has expired');
      }

      // Mark token as used
      await client.query(`
        UPDATE email_verification_tokens
        SET is_used = true, used_at = NOW(), updated_at = NOW(),
            ip_address = $1, user_agent = $2
        WHERE token_hash = $3
      `, [req.ip, req.headers['user-agent'], tokenHash]);

      // Update user email verification status
      const updatedUser = await User.updateEmailVerification(tokenData.user_id, true);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            isEmailVerified: updatedUser.is_email_verified
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
 * /auth/resend-verification:
 *   post:
 *     summary: Resend email verification
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Verification email sent
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/resend-verification', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { email } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.is_email_verified) {
      throw new ValidationError('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = generateSecureToken();
    const verificationTokenHash = hashToken(verificationToken);

    const client = await pool.connect();
    try {
      // Invalidate existing tokens
      await client.query(`
        UPDATE email_verification_tokens
        SET is_used = true, used_at = NOW()
        WHERE user_id = $1 AND is_used = false
      `, [user.id]);

      // Create new token
      await client.query(`
        INSERT INTO email_verification_tokens (token_hash, user_id, email, expires_at)
        VALUES ($1, $2, $3, $4)
      `, [
        verificationTokenHash,
        user.id,
        user.email,
        new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      ]);
    } finally {
      client.release();
    }

    // Send verification email
    await emailService.sendEmailVerification(user.email, verificationToken);

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         $ref: '#/components/responses/NotFoundError'