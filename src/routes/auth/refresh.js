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

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Token Management]
 *     summary: Rotate refresh token and get new access token
 *     description: |
 *       Rotate the current refresh token and receive new access and refresh tokens.
 *       This endpoint implements token rotation for enhanced security.
 *     operationId: rotateRefreshToken
 *     security:
 *       - RefreshToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *           examples:
 *             rotateToken:
 *               $ref: '#/components/examples/RefreshTokenRequestExample'
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
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
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#