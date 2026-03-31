const express = require('express');
const crypto = require('crypto');
const { asyncHandler } = require('../middleware/asyncHandler');
const { logger } = require('../utils/logger');
const { 
  ValidationError, 
  AuthenticationError, 
  NotFoundError, 
  ConflictError 
} = require('../utils/errorTypes');
const { HTTP_STATUS } = require('../utils/httpStatusCodes');
const { validateBody } = require('../validation');
const { auth: authSchemas } = require('../validation');

const router = express.Router();

// Secure token generation functions
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateMockJwtToken = (type = 'access') => {
  const payload = {
    type,
    timestamp: Date.now(),
    random: crypto.randomBytes(16).toString('hex')
  };
  return `mock-jwt-${type}-${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user account
 *     description: Create a new user account with email and password. An email verification will be sent to the provided email address.
 *     operationId: registerUser
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           examples:
 *             registerUser:
 *               $ref: '#/components/examples/RegisterRequestExample'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterResponse'
 *             examples:
 *               success:
 *                 $ref: '#/components/examples/RegisterSuccessExample'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         description: User already exists with this email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               conflict:
 *                 $ref: '#/components/examples/RegisterConflictExample'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/register', 
  validateBody(authSchemas.registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;
    
    logger.info('User registration attempt', {
      correlationId: req.correlationId,
      email: email.toLowerCase()
    });

    // Check if user already exists (this would normally check database)
    if (email.toLowerCase() === 'existing@example.com') {
      throw new ConflictError('User already exists with this email', {
        email: email.toLowerCase(),
        resource: 'user'
      });
    }

    // Simulate user creation
    const userData = {
      id: Math.floor(Math.random() * 10000),
      email: email.toLowerCase(),
      name,
      createdAt: new Date().toISOString(),
      emailVerified: false
    };

    logger.info('User registered successfully', {
      correlationId: req.correlationId,
      userId: userData.id,
      email: userData.email
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userData,
        message: 'Please check your email to verify your account'
      }
    });
  })
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Authenticate user and get tokens
 *     description: Login with email and password to receive access and refresh tokens for API authentication.
 *     operationId: loginUser
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             loginUser:
 *               $ref: '#/components/examples/LoginRequestExample'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             examples:
 *               success:
 *                 $ref: '#/components/examples/LoginSuccessExample'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidCredentials:
 *                 $ref: '#/components/examples/LoginFailureExample'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/login',
  validateBody(authSchemas.loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    logger.info('User login attempt', {
      correlationId: req.correlationId,
      email: email.toLowerCase()
    });

    // Simulate user lookup (this would normally check database)
    if (email.toLowerCase() !== 'test@example.com') {
      throw new AuthenticationError('Invalid email or password');
    }

    // Simulate password check (this would normally use bcrypt comparison)
    if (password !== 'password123') {
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate secure tokens
    const tokens = {
      accessToken: generateMockJwtToken('access'),
      refreshToken: generateMockJwtToken('refresh')
    };

    const userData = {
      id: 1,
      email: email.toLowerCase(),
      name: 'Test User',
      emailVerified: true
    };

    logger.info('User logged in successfully', {
      correlationId: req.correlationId,
      userId: userData.id,
      email: userData.email
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        tokens
      }
    });
  })
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset
 *     description: Send password reset instructions to the specified email address. A reset token will be emailed if the account exists.
 *     operationId: forgotPassword
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *           examples:
 *             forgotPassword:
 *               $ref: '#/components/examples/ForgotPasswordRequestExample'
 *     responses:
 *       200:
 *         description: Password reset instructions sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForgotPasswordResponse'
 *             examples:
 *               success:
 *                 $ref: '#/components/examples/ForgotPasswordSuccessExample'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         description: No user found with this email address
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               notFound:
 *                 $ref: '#/components/examples/ForgotPasswordNotFoundExample'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/forgot-password',
  validateBody(authSchemas.forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    logger.info('Password reset requested', {
      correlationId: req.correlationId,
      email: email.toLowerCase()
    });

    // Simulate user lookup
    if (email.toLowerCase() === 'nonexistent@example.com') {
      throw new NotFoundError('No user found with this email address', {
        resource: 'user',
        email: email.toLowerCase()
      });
    }

    // Generate secure password reset token
    const resetToken = generateSecureToken();

    logger.info('Password reset token generated', {
      correlationId: req.correlationId,
      email: email.toLowerCase(),
      tokenLength: resetToken.length
    });

    res.json({
      success: true,
      message: 'Password reset instructions sent to your email',
      data: {
        email: email.toLowerCase(),
        expiresIn: '1 hour'
      }
    });
  })
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password with token
 *     description: Reset user password using the token received via email. The token expires after 1 hour.
 *     operationId: resetPassword
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *           examples:
 *             resetPassword:
 *               $ref: '#/components/examples/ResetPasswordRequestExample'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResetPasswordResponse'
 *             examples:
 *               success:
 *                 $ref: '#/components/examples/ResetPasswordSuccessExample'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Invalid or expired reset token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidToken:
 *                 $ref: '#/components/examples/ResetPasswordInvalidTokenExample'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/reset-password',
  validateBody(authSchemas.resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    logger.info('Password reset attempt', {
      correlationId: req.correlationId,
      tokenProvided: !!token
    });

    // Simulate token validation (this would normally check database for valid, non-expired token)
    if (!token || token.length < 32) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    logger.info('Password reset successful', {
      correlationId: req.correlationId,
      userId: 1 // This would be from token
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        message: 'You can now login with your new password'
      }
    });
  })
);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify email address
 *     description: Verify user email address using the token received in the verification email.
 *     operationId: verifyEmail
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyEmailRequest'
 *           examples:
 *             verifyEmail:
 *               $ref: '#/components/examples/VerifyEmailRequestExample'
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifyEmailResponse'
 *             examples:
 *               success:
 *                 $ref: '#/components/examples/VerifyEmailSuccessExample'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Invalid or expired verification token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidToken:
 *                 $ref: '#/components/examples/VerifyEmailInvalidTokenExample'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/verify-email',
  validateBody(authSchemas.verifyEmailSchema),
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    logger.info('Email verification attempt', {
      correlationId: req.correlationId,
      tokenProvided: !!token
    });

    // Simulate token validation (this would normally check database for valid token)
    if (!token || token.length < 32) {
      throw new AuthenticationError('Invalid or expired verification token');
    }

    logger.info('Email verified successfully', {
      correlationId: req.correlationId,
      userId: 1 // This would be from token
    });

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        message: 'Your account is now fully activated'
      }
    });
  })
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     description: Use a refresh token to obtain a new access token. The refresh token will be rotated for security.
 *     operationId: refreshToken
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *           examples:
 *             refreshToken:
 *               $ref: '#/components/examples/RefreshTokenRequestExample'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshTokenResponse'
 *             examples:
 *               success:
 *                 $ref: '#/components/examples/RefreshTokenSuccessExample'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Invalid refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidToken:
 *                 $ref: '#/components/examples/RefreshTokenInvalidExample'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/refresh',
  validateBody(authSchemas.refreshTokenSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    logger.info('Token refresh attempt', {
      correlationId: req.correlationId,
      tokenProvided: !!refreshToken
    });

    // Simulate token validation (this would normally verify JWT signature and check database)
    if (!refreshToken || !refreshToken.startsWith('mock-jwt-refresh-')) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Generate new secure tokens
    const newTokens = {
      accessToken: generateMockJwtToken('access'),
      refreshToken: generateMockJwtToken('refresh')
    };

    logger.info('Token refreshed successfully', {
      correlationId: req.correlationId,
      userId: 1 // This would be from token
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens: newTokens
      }
    });
  })
);

module.exports = router;