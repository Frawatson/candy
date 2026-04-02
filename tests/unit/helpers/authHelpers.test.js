const {
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
} = require('../../helpers/authHelpers');
const { testDb } = require('../../helpers/testDatabase');
const crypto = require('crypto');

describe('Auth Helpers', () => {
  beforeEach(async () => {
    await testDb.reset();
    await testDb.seed();
  });

  describe('generateMockJwtToken', () => {
    it('should generate access token with correct format', () => {
      const token = generateMockJwtToken('access', 123);
      
      expect(token).toMatch(/^mock-jwt-access-/);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);
    });

    it('should generate refresh token with correct format', () => {
      const token = generateMockJwtToken('refresh', 456);
      
      expect(token).toMatch(/^mock-jwt-refresh-/);
      expect(typeof token).toBe('string');
    });

    it('should include user ID in token payload', () => {
      const userId = 789;
      const token = generateMockJwtToken('access', userId);
      
      const extractedUserId = getUserIdFromToken(token);
      expect(extractedUserId).toBe(userId);
    });

    it('should generate unique tokens for same user', () => {
      const token1 = generateMockJwtToken('access', 1);
      const token2 = generateMockJwtToken('access', 1);
      
      expect(token1).not.toBe(token2);
    });

    it('should default to access type and user ID 1', () => {
      const token = generateMockJwtToken();
      
      expect(token).toMatch(/^mock-jwt-access-/);
      expect(getUserIdFromToken(token)).toBe(1);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate secure random token', () => {
      const token = generateSecureToken();
      
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes * 2 (hex)
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('createTestUser', () => {
    it('should create user with default data', async () => {
      const result = await createTestUser();
      
      expect(result.user).toHaveProperty('id');
      expect(result.user.email).toMatch(/@example\.com$/);
      expect(result.user.name).toBe('Test User');
      expect(result.user.emailVerified).toBe(true);
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should create user with custom data', async () => {
      const customData = {
        email: 'custom@example.com',
        name: 'Custom User',
        emailVerified: false,
      };
      
      const result = await createTestUser(customData);
      
      expect(result.user.email).toBe('custom@example.com');
      expect(result.user.name).toBe('Custom User');
      expect(result.user.emailVerified).toBe(false);
    });

    it('should generate valid tokens for created user', async () => {
      const result = await createTestUser();
      
      expect(isValidTokenFormat(result.tokens.accessToken, 'access')).toBe(true);
      expect(isValidTokenFormat(result.tokens.refreshToken, 'refresh')).toBe(true);
      expect(getUserIdFromToken(result.tokens.accessToken)).toBe(result.user.id);
    });

    it('should create unique users on multiple calls', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      
      expect(user1.user.id).not.toBe(user2.user.id);
      expect(user1.user.email).not.toBe(user2.user.email);
    });
  });

  describe('getAuthHeaders', () => {
    it('should return proper authorization headers', () => {
      const token = 'test-token-123';
      const headers = getAuthHeaders(token);
      
      expect(headers).toEqual({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      });
    });

    it('should handle empty token', () => {
      const headers = getAuthHeaders('');
      
      expect(headers['Authorization']).toBe('Bearer ');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('loginUser', () => {
    it('should login existing user successfully', async () => {
      const result = await loginUser('test@example.com');
      
      expect(result.user).toBeTruthy();
      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should create refresh token record', async () => {
      const result = await loginUser('test@example.com');
      
      const refreshToken = await testDb.findRefreshToken(result.tokens.refreshToken);
      expect(refreshToken).toBeTruthy();
      expect(refreshToken.userId).toBe(result.user.id);
    });

    it('should throw error for non-existent user', async () => {
      await expect(loginUser('nonexistent@example.com')).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for wrong password', async () => {
      const user = await testDb.findUserByEmail('test@example.com');
      
      await expect(loginUser('test@example.com', 'wrongpassword')).rejects.toThrow('Invalid credentials');
    });

    it('should login with correct password', async () => {
      const user = await testDb.findUserByEmail('test@example.com');
      
      const result = await loginUser('test@example.com', user.password);
      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('createEmailVerificationToken', () => {
    it('should create verification token for user', async () => {
      const userId = 1;
      const token = await createEmailVerificationToken(userId);
      
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);
      
      const tokenData = await testDb.findEmailVerificationToken(token);
      expect(tokenData).toBeTruthy();
      expect(tokenData.userId).toBe(userId);
    });

    it('should generate unique tokens', async () => {
      const token1 = await createEmailVerificationToken(1);
      const token2 = await createEmailVerificationToken(1);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('createPasswordResetToken', () => {
    it('should create reset token for user', async () => {
      const userId = 1;
      const token = await createPasswordResetToken(userId);
      
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);
      
      const tokenData = await testDb.findPasswordResetToken(token);
      expect(tokenData).toBeTruthy();
      expect(tokenData.userId).toBe(userId);
    });

    it('should generate unique tokens', async () => {
      const token1 = await createPasswordResetToken(1);
      const token2 = await createPasswordResetToken(1);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('isValidTokenFormat', () => {
    it('should validate access token format', () => {
      const validToken = generateMockJwtToken('access', 1);
      const invalidToken = 'not-a-jwt-token';
      
      expect(isValidTokenFormat(validToken, 'access')).toBe(true);
      expect(isValidTokenFormat(invalidToken, 'access')).toBe(false);
    });

    it('should validate refresh token format', () => {
      const validToken = generateMockJwtToken('refresh', 1);
      const invalidToken = generateMockJwtToken('access', 1);
      
      expect(isValidTokenFormat(validToken, 'refresh')).toBe(true);
      expect(isValidTokenFormat(invalidToken, 'refresh')).toBe(false);
    });

    it('should default to access type', () => {
      const accessToken = generateMockJwtToken('access', 1);
      const refreshToken = generateMockJwtToken('refresh', 1);
      
      expect(isValidTokenFormat(accessToken)).toBe(true);
      expect(isValidTokenFormat(refreshToken)).toBe(false);
    });

    it('should handle null and undefined tokens', () => {
      expect(isValidTokenFormat(null)).toBe(false);
      expect(isValidTokenFormat(undefined)).toBe(false);
      expect(isValidTokenFormat('')).toBe(false);
    });
  });

  describe('getUserIdFromToken', () => {
    it('should extract user ID from valid token', () => {
      const userId = 12345;
      const token = generateMockJwtToken('access', userId);
      
      expect(getUserIdFromToken(token)).toBe(userId);
    });

    it('should return null for invalid token format', () => {
      expect(getUserIdFromToken('invalid-token')).toBeNull();
      expect(getUserIdFromToken('')).toBeNull();
      expect(getUserIdFromToken(null)).toBeNull();
    });

    it('should return null for malformed token', () => {
      const malformedToken = 'mock-jwt-access-invalid-base64';
      
      expect(getUserIdFromToken(malformedToken)).toBeNull();
    });
  });

  describe('createTestUsers', () => {
    it('should create multiple test users', async () => {
      const users = await createTestUsers(3);
      
      expect(users).toHaveLength(3);
      users.forEach((userResult, index) => {
        expect(userResult.user.email).toBe(`testuser${index + 1}@example.com`);
        expect(userResult.user.name).toBe(`Test User ${index + 1}`);
        expect(userResult.tokens).toHaveProperty('accessToken');
        expect(userResult.tokens).toHaveProperty('refreshToken');
      });