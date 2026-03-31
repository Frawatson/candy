const { extractTokenFromHeader, validateTokenStructure, getClientIP, sanitizeDeviceInfo } = require('../utils/tokenUtils');
const refreshTokenService = require('../services/refreshTokenService');
const { httpStatusCodes } = require('../utils/httpStatusCodes');
const { ErrorTypes } = require('../utils/errorTypes');

const refreshTokenAuth = async (req, res, next) => {
  try {
    // Extract token from Authorization header or request body
    let token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token && req.body.refreshToken) {
      token = req.body.refreshToken;
    }
    
    if (!token) {
      return res.status(httpStatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'Refresh token is required',
        code: ErrorTypes.AUTHENTICATION_ERROR
      });
    }

    // Validate token structure
    if (!validateTokenStructure(token)) {
      return res.status(httpStatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'Invalid token format',
        code: ErrorTypes.AUTHENTICATION_ERROR
      });
    }

    // Validate the refresh token
    const validation = await refreshTokenService.validateRefreshToken(token);
    
    if (!validation.valid) {
      return res.status(httpStatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'Invalid or expired refresh token',
        code: ErrorTypes.AUTHENTICATION_ERROR
      });
    }

    // Extract client information
    const ipAddress = getClientIP(req);
    const deviceInfo = sanitizeDeviceInfo(req.headers['user-agent'], {
      platform: req.headers['x-platform'],
      browser: req.headers['x-browser'],
      version: req.headers['x-version']
    });

    // Attach validated information to request
    req.refreshToken = token;
    req.tokenData = validation;
    req.clientInfo = {
      ipAddress,
      deviceInfo,
      userAgent: req.headers['user-agent']
    };

    next();
  } catch (error) {
    console.error('Refresh token authentication failed:', error.message);

    let statusCode = httpStatusCodes.UNAUTHORIZED;
    let errorMessage = 'Invalid refresh token';
    let errorCode = ErrorTypes.AUTHENTICATION_ERROR;

    if (error.message.includes('Suspicious token activity')) {
      statusCode = httpStatusCodes.FORBIDDEN;
      errorMessage = 'Security violation detected';
      errorCode = ErrorTypes.SECURITY_ERROR;
    } else if (error.message.includes('blacklisted')) {
      statusCode = httpStatusCodes.FORBIDDEN;
      errorMessage = 'Token has been revoked';
      errorCode = ErrorTypes.TOKEN_REVOKED;
    } else if (error.message.includes('expired')) {
      errorMessage = 'Refresh token has expired';
      errorCode = ErrorTypes.TOKEN_EXPIRED;
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code: errorCode
    });
  }
};

const optionalRefreshTokenAuth = async (req, res, next) => {
  try {
    // Extract token if present
    let token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token && req.body.refreshToken) {
      token = req.body.refreshToken;
    }

    if (!token) {
      // No token provided, continue without authentication
      req.isAuthenticated = false;
      return next();
    }

    // Validate token structure
    if (!validateTokenStructure(token)) {
      req.isAuthenticated = false;
      return next();
    }

    try {
      // Validate the refresh token
      const validation = await refreshTokenService.validateRefreshToken(token);
      
      if (validation.valid) {
        const ipAddress = getClientIP(req);
        const deviceInfo = sanitizeDeviceInfo(req.headers['user-agent']);

        req.refreshToken = token;
        req.tokenData = validation;
        req.clientInfo = {
          ipAddress,
          deviceInfo,
          userAgent: req.headers['user-agent']
        };
        req.isAuthenticated = true;
      } else {
        req.isAuthenticated = false;
      }
    } catch (error) {
      console.warn('Optional refresh token validation failed:', error.message);
      req.isAuthenticated = false;
    }

    next();
  } catch (error) {
    console.error('Optional refresh token authentication error:', error.message);
    req.isAuthenticated = false;
    next();
  }
};

const requireValidRefreshToken = (req, res, next) => {
  if (!req.tokenData || !req.tokenData.valid) {
    return res.status(httpStatusCodes.UNAUTHORIZED).json({
      success: false,
      error: 'Valid refresh token required',
      code: ErrorTypes.AUTHENTICATION_ERROR
    });
  }
  
  next();
};

const validateTokenOwnership = (userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.tokenData || !req.tokenData.userId) {
      return res.status(httpStatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required',
        code: ErrorTypes.AUTHENTICATION_ERROR
      });
    }

    const requestUserId = req.params[userIdField] || req.body[userIdField];
    
    if (requestUserId && requestUserId !== req.tokenData.userId) {
      return res.status(httpStatusCodes.FORBIDDEN).json({
        success: false,
        error: 'Insufficient permissions',
        code: ErrorTypes.AUTHORIZATION_ERROR
      });
    }

    next();
  };
};

const logTokenUsage = (req, res, next) => {
  if (req.tokenData && req.clientInfo) {
    console.log(`Refresh token used by user ${req.tokenData.userId} from ${req.clientInfo.ipAddress}`);
  }
  next();
};

module.exports = {
  refreshTokenAuth,
  optionalRefreshTokenAuth,
  requireValidRefreshToken,
  validateTokenOwnership,
  logTokenUsage
};