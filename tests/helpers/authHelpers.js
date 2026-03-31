const crypto = require('crypto');
const { testDb } = require('./testDatabase');

// Mock JWT token generation
const generateMockJwtToken = (type = 'access', userId = 1) => {
  const payload = {
    type,
    userId,
    timestamp: Date.now(),
    random: crypto.randomBytes(16).toString('hex')
  };
  return `mock-jwt-${type}-${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
};

// Generate secure tokens for testing
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Create test user with authentication tokens
const createTestUser = async (userData = {}) => {
  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    password: crypto.randomBytes(16).toString('hex'),
    emailVerified: true,
  };

  const user = await testDb.createUser({ ...defaultUser, ...userData });
  
  return {
    user,
    tokens: {
      accessToken: generateMockJwtToken('access', user.id),
      refreshToken: generateMockJwtToken('refresh', user.id),
    },
  };
};

// Create authenticated request headers
const getAuthHeaders = (accessToken) => {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
};

// Login helper that returns tokens
const loginUser = async (email = 'test@example.com', password = null) => {
  const user = await testDb.findUserByEmail(email);
  if (!user || (password && user.password !== password)) {
    throw new Error('Invalid credentials');
  }

  const tokens = {
    accessToken: generateMockJwtToken('access', user.id),
    refreshToken: generateMockJwtToken('refresh', user.id),
  };

  // Create refresh token record
  await testDb.createRefreshToken({
    token: tokens.refreshToken,
    userId: user.id,
    deviceInfo: 'Test Device',
    ipAddress: '127.0.0.1',
  });

  return { user, tokens };
};

// Create email verification token
const createEmailVerificationToken = async (userId) => {
  const token = generateSecureToken();
  await testDb.createEmailVerificationToken(userId, token);
  return token;
};

// Create password reset token
const createPasswordResetToken = async (userId) => {
  const token = generateSecureToken();
  await testDb.createPasswordResetToken(userId, token);
  return token;
};

// Verify token format
const isValidTokenFormat = (token, type = 'access') => {
  if (!token || typeof token !== 'string') return false;
  return token.startsWith(`mock-jwt-${type}-`);
};

// Extract user ID from mock token
const getUserIdFromToken = (token) => {
  try {
    if (!token || !token.startsWith('mock-jwt-')) return null;
    
    const base64Part = token.split('-').slice(2).join('-');
    const payload = JSON.parse(Buffer.from(base64Part, 'base64').toString());
    return payload.userId || null;
  } catch (error) {
    return null;
  }
};

// Create multiple test users for bulk operations
const createTestUsers = async (count = 3) => {
  const users = [];
  for (let i = 0; i < count; i++) {
    const user = await createTestUser({
      email: `testuser${i + 1}@example.com`,
      name: `Test User ${i + 1}`,
    });
    users.push(user);
  }
  return users;
};

// Create expired token
const createExpiredToken = (type = 'access', userId = 1) => {
  const payload = {
    type,
    userId,
    timestamp: Date.now() - 86400000, // 24 hours ago
    random: crypto.randomBytes(16).toString('hex')
  };
  return `mock-jwt-${type}-${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
};

// Validate password strength (helper for tests)
const isValidPassword = (password) => {
  if (!password || password.length < 8) return false;
  return true;
};

// Generate test device info
const generateDeviceInfo = (deviceType = 'desktop') => {
  const devices = {
    desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
    tablet: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
  };
  
  return devices[deviceType] || devices.desktop;
};

module.exports = {
  generateMockJwtToken,
  generateSecureToken,
  createTestUser,
  getAuthHeaders,
  loginUser,
  createEmailVerificationToken,
  createPasswordResetToken,
  isValidTokenFormat,
  getUserIdFromToken,
  createTestUsers,
  createExpiredToken,
  isValidPassword,
  generateDeviceInfo,
};