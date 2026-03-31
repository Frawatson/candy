const crypto = require('crypto');
const { logger } = require('../../src/utils/logger');

// Suppress console output during tests unless explicitly needed
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock logger to prevent actual logging during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Set test environment variables
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-do-not-use-in-production-this-is-only-for-testing-purposes-abcdefghijklmnop';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-do-not-use-in-production-this-is-only-for-testing-purposes-abcd';
process.env.JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');
process.env.JWT_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.BCRYPT_ROUNDS = '4'; // Lower for faster tests
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '587';
process.env.DATABASE_URL = 'postgresql://mock:mock@invalid.invalid:5432/mock_db';
process.env.SMTP_PASS = process.env.TEST_SMTP_PASS || crypto.randomBytes(16).toString('hex');

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});