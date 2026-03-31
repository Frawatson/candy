const crypto = require('crypto');

// Generate secure test password
const generateTestPassword = () => crypto.randomBytes(16).toString('hex');

// Test user data fixtures
const testUsers = {
  valid: {
    email: 'test@example.com',
    password: generateTestPassword(),
    name: 'Test User',
  },
  
  admin: {
    email: 'admin@example.com',
    password: generateTestPassword(),
    name: 'Admin User',
    role: 'admin',
  },
  
  unverified: {
    email: 'unverified@example.com',
    password: generateTestPassword(),
    name: 'Unverified User',
    emailVerified: false,
  },
  
  existing: {
    email: 'existing@example.com',
    password: generateTestPassword(),
    name: 'Existing User',
    emailVerified: true,
  },
  
  inactive: {
    email: 'inactive@example.com',
    password: generateTestPassword(),
    name: 'Inactive User',
    status: 'inactive',
  },
};

// Invalid user data for validation testing
const invalidUserData = {
  missingEmail: {
    password: generateTestPassword(),
    name: 'Test User',
  },
  
  missingPassword: {
    email: 'test@example.com',
    name: 'Test User',
  },
  
  missingName: {
    email: 'test@example.com',
    password: generateTestPassword(),
  },
  
  invalidEmail: {
    email: 'invalid-email',
    password: generateTestPassword(),
    name: 'Test User',
  },
  
  weakPassword: {
    email: 'test@example.com',
    password: '123',
    name: 'Test User',
  },
  
  longName: {
    email: 'test@example.com',
    password: generateTestPassword(),
    name: 'a'.repeat(256),
  },
  
  emailWithSpaces: {
    email: ' test@example.com ',
    password: generateTestPassword(),
    name: 'Test User',
  },
  
  nameWithSpecialChars: {
    email: 'test@example.com',
    password: generateTestPassword(),
    name: 'Test<script>alert("xss")</script>User',
  },
};

// Authentication request fixtures
const authRequests = {
  validRegistration: {
    email: 'newuser@example.com',
    password: generateTestPassword(),
    name: 'New User',
  },
  
  validLogin: {
    email: 'test@example.com',
    password: generateTestPassword(),
  },
  
  invalidLogin: {
    email: 'test@example.com',
    password: 'wrongpassword',
  },
  
  nonexistentLogin: {
    email: 'nonexistent@example.com',
    password: generateTestPassword(),
  },
  
  validPasswordReset: {
    email: 'test@example.com',
  },
  
  validPasswordChange: {
    token: crypto.randomBytes(32).toString('hex'),
    newPassword: generateTestPassword(),
  },
  
  validEmailVerification: {
    token: crypto.randomBytes(32).toString('hex'),
  },
  
  validRefreshToken: {
    refreshToken: 'mock-jwt-refresh-' + Buffer.from(JSON.stringify({
      type: 'refresh',
      userId: 1,
      timestamp: Date.now(),
      random: crypto.randomBytes(16).toString('hex')
    })).toString('base64'),
  },
};

// Token fixtures
const tokenFixtures = {
  valid: {
    accessToken: 'mock-jwt-access-' + Buffer.from(JSON.stringify({
      type: 'access',
      userId: 1,
      timestamp: Date.now(),
      random: crypto.randomBytes(16).toString('hex')
    })).toString('base64'),
    
    refreshToken: 'mock-jwt-refresh-' + Buffer.from(JSON.stringify({
      type: 'refresh',
      userId: 1,
      timestamp: Date.now(),
      random: crypto.randomBytes(16).toString('hex')
    })).toString('base64'),
    
    verificationToken: crypto.randomBytes(32).toString('hex'),
    passwordResetToken: crypto.randomBytes(32).toString('hex'),
  },
  
  invalid: {
    accessToken: 'invalid-access-token',
    refreshToken: 'invalid-refresh-token',
    verificationToken: 'invalid-verification-token',
    passwordResetToken: 'invalid-reset-token',
  },
  
  expired: {
    accessToken: 'mock-jwt-access-' + Buffer.from(JSON.stringify({
      type: 'access',
      userId: 1,
      timestamp: Date.now() - 86400000, // 24 hours ago
      random: crypto.randomBytes(16).toString('hex')
    })).toString('base64'),
    
    refreshToken: 'mock-jwt-refresh-' + Buffer.from(JSON.stringify({
      type: 'refresh',
      userId: 1,
      timestamp: Date.now() - 7 * 86400000, // 7 days ago
      random: crypto.randomBytes(16).toString('hex')
    })).toString('base64'),
  },
  
  malformed: {
    accessToken: 'not-a-jwt-token',
    refreshToken: 'also-not-a-jwt',
    verificationToken: 'short',
    passwordResetToken: 'too-short',
  },
};

// Email template test data
const emailTemplateData = {
  verification: {
    userName: 'Test User',
    verificationToken: crypto.randomBytes(32).toString('hex'),
    verificationUrl: 'http://localhost:3000/verify-email?token=',
    expiresIn: '24 hours',
  },
  
  passwordReset: {
    userName: 'Test User',
    resetToken: crypto.randomBytes(32).toString('hex'),
    resetUrl: 'http://localhost:3000/reset-password?token=',
    expiresIn: '1 hour',
    ipAddress: '127.0.0.1',
    userAgent: 'Test Browser',
  },
  
  welcome: {
    userName: 'Test User',
    platformName: 'Our Platform',
    supportEmail: 'support@example.com',
    loginUrl: 'http://localhost:3000/login',
  },
  
  notification: {
    userName: 'Test User',
    message: 'Your account settings have been updated.',
    actionRequired: false,
    timestamp: new Date().toISOString(),
  },
};

// Mock request data for different scenarios
const requestFixtures = {
  withValidHeaders: {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Test-Client/1.0',
    },
  },
  
  withAuthHeaders: (token) => ({
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'Test-Client/1.0',
    },
  }),
  
  withInvalidHeaders: {
    headers: {
      'Content-Type': 'text/plain',
      'Accept': 'text/html',
    },
  },
  
  withMissingHeaders: {
    headers: {},
  },
};

// Database seed data
const seedData = {
  users: [
    {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      password: generateTestPassword(),
      emailVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      email: 'unverified@example.com',
      name: 'Unverified User',
      password: generateTestPassword(),
      emailVerified: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 3,
      email: 'admin@example.com',
      name: 'Admin User',
      password: generateTestPassword(),
      emailVerified: true,
      role: 'admin',
      createdAt: new Date().toISOString(),
    },
  ],
  
  refreshTokens: [
    {
      id: 1,
      token: crypto.randomBytes(32).toString('hex'),
      userId: 1,
      deviceInfo: 'Test Device',
      ipAddress: '127.0.0.1',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isBlacklisted: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      token: crypto.randomBytes(32).toString('hex'),
      userId: 1,
      deviceInfo: 'Test Device',
      ipAddress: '127.0.0.1',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      isBlacklisted: false,
      createdAt: new Date().toISOString(),
    },
  ],
  
  emailVerificationTokens: [
    {
      id: 1,
      userId: 2,
      token: crypto.randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      used: false,
      createdAt: new Date().toISOString(),
    },
  ],
  
  passwordResetTokens: [
    {
      id: 1,
      userId: 1,
      token: crypto.randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      used: false,
      createdAt: new Date().toISOString(),
    },
  ],
};

// Error scenario test data
const errorScenarios = {
  network: {
    timeout: {
      message: 'Request timeout',
      code: 'ETIMEDOUT',
    },
    connectionRefused: {
      message: 'Connection refused',
      code: 'ECONNREFUSED',
    },
    hostUnreachable: {
      message: 'Host unreachable',
      code: 'EHOSTUNREACH',
    },
  },
  
  database: {
    connectionFailed: {
      message: 'Database connection failed',
      code: 'CONNECTION_ERROR',
    },
    queryTimeout: {
      message: 'Query execution timeout',
      code: 'QUERY_TIMEOUT',
    },
    constraintViolation: {
      message: 'Database constraint violation',
      code: 'CONSTRAINT_ERROR',
    },
  },
  
  email: {
    smtpError: {
      message: 'SMTP server error',
      code: 'SMTP_ERROR',
    },
    invalidRecipient: {
      message: 'Invalid recipient address',
      code: 'INVALID_RECIPIENT',
    },
    quotaExceeded: {
      message: 'Email quota exceeded',
      code: 'QUOTA_EXCEEDED',
    },
  },
};

module.exports = {
  testUsers,
  invalidUserData,
  authRequests,
  tokenFixtures,
  emailTemplateData,
  requestFixtures,
  seedData,
  errorScenarios,
};