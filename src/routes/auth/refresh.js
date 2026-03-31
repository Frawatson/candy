const express = require('express');
const { refreshTokenAuth, logTokenUsage } = require('../../middleware/refreshTokenAuth');
const { validation } = require('../../middleware/validation');
const refreshTokenService = require('../../services/refreshTokenService');
const { httpStatusCodes } = require('../../utils/httpStatusCodes');
const { ErrorTypes } = require('../../utils/errorTypes');
const asyncHandler = require('../../middleware/asyncHandler');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required',
      'string.empty': 'Refresh token cannot be empty'
    })
});

const logoutSchema = Joi.object({
  refreshToken: Joi.string().optional(),
  logoutAll: Joi.boolean().default(false)
});

// POST /auth/refresh - Rotate refresh token and get new access token
router.post('/refresh',
  validation(refreshTokenSchema),
  refreshTokenAuth,
  logTokenUsage,
  asyncHandler(async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const { ipAddress, deviceInfo } = req.clientInfo;

      // Rotate the refresh token
      const tokens = await refreshTokenService.rotateRefreshToken(
        refreshToken,
        deviceInfo,
        ipAddress
      );

      res.status(httpStatusCodes.OK).json({
        success: true,
        message: 'Tokens refreshed successfully',
        data: tokens
      });
    } catch (error) {
      console.error('Token refresh failed:', error.message);

      let statusCode = httpStatusCodes.UNAUTHORIZED;
      let errorCode = ErrorTypes.AUTHENTICATION_ERROR;

      if (error.message.includes('blacklisted')) {
        statusCode = httpStatusCodes.FORBIDDEN;
        errorCode = ErrorTypes.TOKEN_REVOKED;
      } else if (error.message.includes('expired')) {
        errorCode = ErrorTypes.TOKEN_EXPIRED;
      } else if (error.message.includes('Suspicious')) {
        statusCode = httpStatusCodes.FORBIDDEN;
        errorCode = ErrorTypes.SECURITY_ERROR;
      }

      res.status(statusCode).json({
        success: false,
        error: error.message || 'Token refresh failed',
        code: errorCode
      });
    }
  })
);

// POST /auth/logout - Blacklist refresh token(s)
router.post('/logout',
  validation(logoutSchema),
  asyncHandler(async (req, res) => {
    try {
      const { refreshToken, logoutAll = false } = req.body;

      if (logoutAll && req.tokenData && req.tokenData.userId) {
        // Logout from all devices
        const result = await refreshTokenService.blacklistAllUserTokens(req.tokenData.userId);
        
        return res.status(httpStatusCodes.OK).json({
          success: true,
          message: `Logged out from all devices (${result.blacklistedCount} tokens revoked)`,
          data: {
            tokensRevoked: result.blacklistedCount
          }
        });
      }

      if (refreshToken) {
        // Logout from current device
        const result = await refreshTokenService.blacklistToken(refreshToken);
        
        return res.status(httpStatusCodes.OK).json({
          success: true,
          message: result.message,
          data: {
            tokenRevoked: result.success
          }
        });
      }

      // No token provided and not logout all
      res.status(httpStatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Refresh token required or set logoutAll to true',
        code: ErrorTypes.VALIDATION_ERROR
      });
    } catch (error) {
      console.error('Logout failed:', error.message);
      
      res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Logout failed',
        code: ErrorTypes.SERVER_ERROR
      });
    }
  })
);

// POST /auth/revoke - Revoke specific refresh token (admin/user)
router.post('/revoke',
  refreshTokenAuth,
  validation(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const { userId } = req.tokenData;

      // Additional security: verify token belongs to the authenticated user
      const validation = await refreshTokenService.validateRefreshToken(refreshToken);
      
      if (!validation.valid || validation.userId !== userId) {
        return res.status(httpStatusCodes.FORBIDDEN).json({
          success: false,
          error: 'Cannot revoke token belonging to another user',
          code: ErrorTypes.AUTHORIZATION_ERROR
        });
      }

      const result = await refreshTokenService.blacklistToken(refreshToken);
      
      res.status(httpStatusCodes.OK).json({
        success: true,
        message: 'Token revoked successfully',
        data: {
          tokenRevoked: result.success
        }
      });
    } catch (error) {
      console.error('Token revocation failed:', error.message);
      
      res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Token revocation failed',
        code: ErrorTypes.SERVER_ERROR
      });
    }
  })
);

// GET /auth/tokens - Get user's active refresh tokens
router.get('/tokens',
  refreshTokenAuth,
  asyncHandler(async (req, res) => {
    try {
      const { userId } = req.tokenData;
      const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Max 50 tokens

      const tokens = await refreshTokenService.getUserActiveTokens(userId, limit);
      
      res.status(httpStatusCodes.OK).json({
        success: true,
        message: 'Active tokens retrieved successfully',
        data: {
          tokens,
          count: tokens.length
        }
      });
    } catch (error) {
      console.error('Failed to get user tokens:', error.message);
      
      res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to retrieve tokens',
        code: ErrorTypes.SERVER_ERROR
      });
    }
  })
);

// POST /auth/validate-token - Validate refresh token without rotation
router.post('/validate-token',
  validation(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      const validation = await refreshTokenService.validateRefreshToken(refreshToken);
      
      if (validation.valid) {
        res.status(httpStatusCodes.OK).json({
          success: true,
          message: 'Token is valid',
          data: {
            valid: true,
            userId: validation.userId,
            email: validation.email,
            expiresAt: validation.tokenRecord.expires_at
          }
        });
      } else {
        res.status(httpStatusCodes.UNAUTHORIZED).json({
          success: false,
          error: 'Invalid or expired token',
          code: ErrorTypes.AUTHENTICATION_ERROR,
          data: {
            valid: false
          }
        });
      }
    } catch (error) {
      console.error('Token validation failed:', error.message);
      
      let statusCode = httpStatusCodes.UNAUTHORIZED;
      let errorCode = ErrorTypes.AUTHENTICATION_ERROR;

      if (error.message.includes('Suspicious')) {
        statusCode = httpStatusCodes.FORBIDDEN;
        errorCode = ErrorTypes.SECURITY_ERROR;
      }

      res.status(statusCode).json({
        success: false,
        error: error.message || 'Token validation failed',
        code: errorCode,
        data: {
          valid: false
        }
      });
    }
  })
);

module.exports = router;