const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const RefreshToken = require('../../models/RefreshToken');
const { generateTokens, generateSecureToken, hashToken } = require('../../utils/tokenUtils');
const refreshTokenAuth = require('../../middleware/refreshTokenAuth');
const { authRateLimit } = require('../../middleware/rateLimiter');

const { 
  UnauthorizedError, 
  NotFoundError,
  ValidationError 
} = require('../../utils/errorTypes');

// Apply rate limiting to all refresh token routes
router.use(authRateLimit);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security:
 *       - refreshToken: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/', refreshTokenAuth, async (req, res, next) => {
  try {
    const { user, refreshTokenData } = req;

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      sub: user.id,
      email: user.email,
      isEmailVerified: user.is_email_verified
    });

    // Update refresh token in database
    const deviceId = req.headers['x-device-id'] || refreshTokenData.device_id;
    await RefreshToken.updateToken(
      refreshTokenData.id,
      hashToken(newRefreshToken),
      {
        deviceId,
        deviceName: req.headers['x-device-name'] || refreshTokenData.device_name,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isEmailVerified: user.is_email_verified
        },
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
 *       - refreshToken: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/logout', refreshTokenAuth, async (req, res, next) => {
  try {
    const { refreshTokenData } = req;

    // Revoke the current refresh token
    await RefreshToken.revokeToken(refreshTokenData.id);

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
 *       - refreshToken: []
 *     responses:
 *       200:
 *         description: Logged out from all devices successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/logout-all', refreshTokenAuth, async (req, res, next) => {
  try {
    const { user } = req;

    // Revoke all refresh tokens for the user
    await RefreshToken.revokeAllForUser(user.id);

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
 *     summary: Get all active tokens for current user
 *     tags: [Auth]
 *     security:
 *       - refreshToken: []
 *     responses:
 *       200:
 *         description: Active tokens retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokensResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/tokens', refreshTokenAuth, async (req, res, next) => {
  try {
    const { user } = req;

    // Get all active tokens for the user
    const tokens = await RefreshToken.getActiveTokensForUser(user.id);

    // Map to safe format (without sensitive data)
    const safeTokens = tokens.map(token => ({
      id: token.id,
      deviceId: token.device_id,
      deviceName: token.device_name,
      ipAddress: token.ip_address,
      userAgent: token.user_agent,
      createdAt: token.created_at,
      lastUsedAt: token.last_used_at,
      isCurrent: token.id === req.refreshTokenData.id
    }));

    res.json({
      success: true,
      message: 'Active tokens retrieved successfully',
      data: {
        tokens: safeTokens
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
 *     summary: Revoke a specific token
 *     tags: [Auth]
 *     security:
 *       - refreshToken: []
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
 *                 type: string
 *                 format: uuid
 *                 description: ID of the token to revoke
 *     responses:
 *       200:
 *         description: Token revoked successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/revoke', refreshTokenAuth, async (req, res, next) => {
  try {
    const { user } = req;
    const { tokenId } = req.body;

    if (!tokenId) {
      throw new ValidationError('Token ID is required');
    }

    // Verify the token belongs to the current user
    const token = await RefreshToken.findById(tokenId);
    if (!token) {
      throw new NotFoundError('Token not found');
    }

    if (token.user_id !== user.id) {
      throw new UnauthorizedError('Not authorized to revoke this token');
    }

    // Revoke the token
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