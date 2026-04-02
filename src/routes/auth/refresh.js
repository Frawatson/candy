const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const RefreshToken = require('../../models/RefreshToken');
const User = require('../../models/User');
const { generateTokens, hashToken } = require('../../utils/tokenUtils');
const refreshTokenAuth = require('../../middleware/refreshTokenAuth');

const { 
  ValidationError, 
  UnauthorizedError, 
  NotFoundError 
} = require('../../utils/errorTypes');

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshTokenResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/', [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { refreshToken } = req.body;
    const tokenHash = hashToken(refreshToken);

    // Find and validate refresh token
    const tokenData = await RefreshToken.findByTokenHash(tokenHash);
    
    if (!tokenData) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (tokenData.is_revoked) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    if (new Date() > tokenData.expires_at) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    // Get user data
    const user = await User.findById(tokenData.user_id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Generate new tokens (token rotation)
    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      sub: user.id,
      email: user.email,
      isEmailVerified: user.is_email_verified
    });

    // Revoke old refresh token
    await RefreshToken.revokeToken(tokenData.id);

    // Store new refresh token
    const deviceId = req.headers['x-device-id'] || tokenData.device_id;
    await RefreshToken.create({
      tokenHash: hashToken(newRefreshToken),
      userId: user.id,
      deviceId,
      deviceName: req.headers['x-device-name'] || tokenData.device_name,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/refresh/logout:
 *   post:
 *     summary: Logout from current device
 *     tags: [Auth]
 *     security:
 *       - RefreshTokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/logout', [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { refreshToken } = req.body;
    const tokenHash = hashToken(refreshToken);

    // Find and revoke refresh token
    const tokenData = await RefreshToken.findByTokenHash(tokenHash);
    
    if (tokenData && !tokenData.is_revoked) {
      await RefreshToken.revokeToken(tokenData.id);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/refresh/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags: [Auth]
 *     security:
 *       - RefreshTokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out from all devices successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/logout-all', [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { refreshToken } = req.body;
    const tokenHash = hashToken(refreshToken);

    // Find token to get user ID
    const tokenData = await RefreshToken.findByTokenHash(tokenHash);
    
    if (!tokenData) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Revoke all refresh tokens for this user
    await RefreshToken.revokeAllByUserId(tokenData.user_id);

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/refresh/tokens:
 *   get:
 *     summary: Get active refresh tokens for user
 *     tags: [Auth]
 *     security:
 *       - RefreshTokenAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: "Bearer your-refresh-token-here"
 *     responses:
 *       200:
 *         description: Active tokens retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActiveTokensResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/tokens', refreshTokenAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get active tokens for user
    const activeTokens = await RefreshToken.getActiveTokensByUserId(userId);

    // Extract current token from authorization header safely
    const authHeader = req.headers.authorization;
    let currentTokenHash = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const currentToken = authHeader.substring(7);
      if (currentToken) {
        currentTokenHash = hashToken(currentToken);
      }
    }

    // Format tokens for response (remove sensitive data)
    const formattedTokens = activeTokens.map(token => ({
      id: token.id,
      deviceId: token.device_id,
      deviceName: token.device_name,
      ipAddress: token.ip_address,
      userAgent: token.user_agent,
      createdAt: token.created_at,
      lastUsedAt: token.last_used_at,
      expiresAt: token.expires_at,
      isCurrent: currentTokenHash ? token.token_hash === currentTokenHash : false
    }));

    res.json({
      success: true,
      message: 'Active tokens retrieved successfully',
      data: {
        tokens: formattedTokens,
        total: formattedTokens.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/refresh/revoke:
 *   post:
 *     summary: Revoke specific refresh token
 *     tags: [Auth]
 *     security:
 *       - RefreshTokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenId
 *             properties:
 *               tokenId:
 *                 type: integer
 *                 description: ID of the token to revoke
 *     responses:
 *       200:
 *         description: Token revoked successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/revoke', [
  refreshTokenAuth,
  body('tokenId')
    .isInt({ min: 1 })
    .withMessage('Valid token ID is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { tokenId } = req.body;
    const userId = req.user.id;

    // Find token and verify ownership
    const token = await RefreshToken.findById(tokenId);
    
    if (!token) {
      throw new NotFoundError('Token not found');
    }

    if (token.user_id !== userId) {
      throw new UnauthorizedError('You can only revoke your own tokens');
    }

    if (token.is_revoked) {
      throw new ValidationError('Token is already revoked');
    }

    // Revoke token
    await RefreshToken.revokeToken(tokenId);

    res.json({
      success: true,
      message: 'Token revoked successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;