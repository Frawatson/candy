const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const { UnauthorizedError } = require('../utils/errorTypes');

/**
 * JWT authentication middleware
 * Verifies access tokens and attaches user data to request object
 */
const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedError('No authorization header provided');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Invalid authorization header format');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user data to request object
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      isEmailVerified: decoded.isEmailVerified,
      iat: decoded.iat,
      exp: decoded.exp
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      if (error.name === 'TokenExpiredError') {
        return next(new UnauthorizedError('Token expired'));
      }
      return next(new UnauthorizedError('Invalid token'));
    }
    next(error);
  }
};

module.exports = auth;