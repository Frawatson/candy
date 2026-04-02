const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRY, JWT_REFRESH_EXPIRY } = require('../config/jwt');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { generateTokens, hashToken } = require('../utils/tokenUtils');
const PasswordUtils = require('../utils/passwordUtils');

const { 
  UnauthorizedError, 
  NotFoundError, 
  ValidationError 
} = require('../utils/errorTypes');

class AuthService {
  /**
   * Authenticate user with email and password
   */
  static async authenticateUser(email, password) {
    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      isEmailVerified: user.is_email_verified
    };
  }

  /**
   * Generate and store tokens for user
   */
  static async generateUserTokens(user, deviceInfo = {}) {
    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens({
      sub: user.id,
      email: user.email,
      isEmailVerified: user.isEmailVerified
    });

    // Store refresh token in database
    await RefreshToken.create({
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      deviceId: deviceInfo.deviceId,
      deviceName: deviceInfo.deviceName,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: JWT_EXPIRY
    };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshTokenString, deviceInfo = {}) {
    const tokenHash = hashToken(refreshTokenString);

    // Find refresh token
    const tokenData = await RefreshToken.findByTokenHash(tokenHash);
    if (!tokenData) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if token is revoked
    if (tokenData.is_revoked) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    // Check if token is expired
    if (new Date() > tokenData.expires_at) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    // Get user data
    const user = await User.findById(tokenData.user_id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Update last used timestamp
    await RefreshToken.updateLastUsed(tokenData.id, deviceInfo.ipAddress);

    // Generate new tokens (token rotation)
    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      sub: user.id,
      email: user.email,
      isEmailVerified: user.is_email_verified
    });

    // Revoke old refresh token
    await RefreshToken.revokeToken(tokenData.id);

    // Store new refresh token
    await RefreshToken.create({
      tokenHash: hashToken(newRefreshToken),
      userId: user.id,
      deviceId: deviceInfo.deviceId || tokenData.device_id,
      deviceName: deviceInfo.deviceName || tokenData.device_name,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: JWT_EXPIRY,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isEmailVerified: user.is_email_verified
      }
    };
  }

  /**
   * Verify JWT access token
   */
  static async verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get fresh user data to ensure user still exists and is active
      const user = await User.findById(decoded.sub);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        isEmailVerified: user.is_email_verified,
        iat: decoded.iat,
        exp: decoded.exp
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        if (error.name === 'TokenExpiredError') {
          throw new UnauthorizedError('Access token has expired');
        }
        throw new UnauthorizedError('Invalid access token');