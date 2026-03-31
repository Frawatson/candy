const crypto = require('crypto');
const { generateRefreshToken, verifyRefreshToken, decodeToken } = require('../config/jwt');

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const createTokenPayload = (user, tokenFamily = null) => {
  return {
    userId: user.id,
    email: user.email,
    tokenFamily: tokenFamily || generateSecureToken(),
    tokenType: 'refresh'
  };
};

const parseExpiryTime = (expiryString) => {
  const timeUnits = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
    'w': 7 * 24 * 60 * 60 * 1000
  };

  const match = expiryString.match(/^(\d+)([smhdw])$/);
  if (!match) {
    throw new Error(`Invalid expiry format: ${expiryString}`);
  }

  const [, amount, unit] = match;
  const multiplier = timeUnits[unit];
  
  if (!multiplier) {
    throw new Error(`Invalid time unit: ${unit}`);
  }

  return parseInt(amount) * multiplier;
};

const calculateExpiryDate = (expiryString) => {
  const expiryMs = parseExpiryTime(expiryString);
  return new Date(Date.now() + expiryMs);
};

const isTokenExpired = (expiryDate) => {
  return new Date() > new Date(expiryDate);
};

const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

const validateTokenStructure = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // JWT tokens have 3 parts separated by dots
  const parts = token.split('.');
  return parts.length === 3;
};

const getTokenInfo = (token) => {
  try {
    const decoded = decodeToken(token);
    return {
      valid: true,
      payload: decoded,
      expired: decoded.exp ? (decoded.exp * 1000 < Date.now()) : false
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
};

const createRefreshTokenData = (user, deviceInfo = {}, ipAddress = null) => {
  const tokenFamily = generateSecureToken();
  const payload = createTokenPayload(user, tokenFamily);
  const token = generateRefreshToken(payload);
  const tokenHash = hashToken(token);

  return {
    token,
    tokenHash,
    tokenFamily,
    payload,
    deviceInfo,
    ipAddress
  };
};

const sanitizeDeviceInfo = (userAgent, deviceInfo = {}) => {
  const maxLength = 500;
  const sanitized = {
    userAgent: userAgent ? userAgent.substring(0, maxLength) : null,
    platform: deviceInfo.platform ? String(deviceInfo.platform).substring(0, 50) : null,
    browser: deviceInfo.browser ? String(deviceInfo.browser).substring(0, 50) : null,
    version: deviceInfo.version ? String(deviceInfo.version).substring(0, 20) : null
  };

  // Remove null/undefined values
  return Object.fromEntries(
    Object.entries(sanitized).filter(([_, value]) => value !== null && value !== undefined)
  );
};

const isValidIPAddress = (ip) => {
  if (!ip) return false;
  
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const remoteAddress = req.connection?.remoteAddress || req.socket?.remoteAddress;

  let ip = forwarded ? forwarded.split(',')[0].trim() : 
           realIP || 
           remoteAddress || 
           req.ip;

  // Clean up IPv6 mapped IPv4 addresses
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  return isValidIPAddress(ip) ? ip : null;
};

module.exports = {
  hashToken,
  generateSecureToken,
  createTokenPayload,
  parseExpiryTime,
  calculateExpiryDate,
  isTokenExpired,
  extractTokenFromHeader,
  validateTokenStructure,
  getTokenInfo,
  createRefreshTokenData,
  sanitizeDeviceInfo,
  isValidIPAddress,
  getClientIP
};