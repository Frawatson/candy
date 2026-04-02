// Test setup and global configuration
const db = require('../database/connection');

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.BCRYPT_ROUNDS = '4'; // Lower rounds for faster tests
process.env.DATABASE_NAME = 'auth_system_test';

// Global test timeout
jest.setTimeout(30000);

// Setup before all tests
beforeAll(async () => {
  // Setup test database or mock connections
});

// Cleanup after all tests
afterAll(async () => {
  await db.end();
});

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});