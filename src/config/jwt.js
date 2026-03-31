const jwt = require('jsonwebtoken');

const jwtConfig = {
  accessToken: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRY || '15m',
    issuer: 'authentication-system',
    audience: 'authentication-system-users'
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    issuer: 'authentication-system',
    audience: 'authentication-system-users'
  }
};

const validateJWTConfig = () => {
  if (!jwtConfig.accessToken.secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  if (!jwtConfig.refreshToken.secret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required');
  }
  
  if (jwtConfig.accessToken.secret === jwtConfig.refreshToken.secret) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }
  
  if (jwtConfig.accessToken.secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  
  if (jwtConfig.refreshToken.secret.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
  }
};

const generateAccessToken = (payload) => {
  return jwt.sign(payload, jwtConfig.accessToken.secret, {
    expiresIn: jwtConfig.accessToken.expiresIn,
    issuer: jwtConfig.accessToken.issuer,
    audience: jwtConfig.accessToken.audience
  });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, jwtConfig.refreshToken.secret, {
    expiresIn: jwtConfig.refreshToken.expiresIn,
    issuer: jwtConfig.refreshToken.issuer,
    audience: jwtConfig.refreshToken.audience
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, jwtConfig.accessToken.secret, {
    issuer: jwtConfig.accessToken.issuer,
    audience: jwtConfig.accessToken.audience
  });
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, jwtConfig.refreshToken.secret, {
    issuer: jwtConfig.refreshToken.issuer,
    audience: jwtConfig.refreshToken.audience
  });
};

const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  jwtConfig,
  validateJWTConfig,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken
};