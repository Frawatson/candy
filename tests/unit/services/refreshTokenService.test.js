const refreshTokenService = require('../../../src/services/refreshTokenService');
const RefreshToken = require('../../../src/models/RefreshToken');
const { generateRefreshToken, verifyRefreshToken } = require('../../../src/config/jwt');
const { hashToken } = require('../../../src/utils/tokenUtils');

// Mock dependencies
jest.mock('../../../src/models/RefreshToken');
jest.mock('../../../src/config/jwt');
jest.mock('../../../src/utils/tokenUtils');

describe('RefreshTokenService', () => {
  let mockRefreshTokenModel;
  let originalEnv;

  beforeAll(() => {
    // Store original environment variables
    originalEnv = process.env;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set test environment variables - generate secure random secrets for testing
    const testJwtSecret = process.env.TEST_JWT_SECRET || require('crypto').randomBytes(32).toString('hex');
    const testRefreshSecret = process.env.TEST_JWT_REFRESH_SECRET || require('crypto').randomBytes(32).toString('hex');
    
    process.env = {
      ...originalEnv,
      JWT_SECRET: testJwtSecret,
      JWT_REFRESH_SECRET: testRefreshSecret,
      JWT_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d'
    };
    
    mockRefreshTokenModel = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      updateLastUsed: jest.fn(),
      blacklist: jest.fn(),
      blacklistTokenFamily: jest.fn(),
      blacklistByUserId: jest.fn(),
      findByUserId: jest.fn(),
      deleteExpired: jest.fn(),
      deleteBlacklisted: jest.fn(),
      getStats: jest.fn(),
      isValid: jest.fn()
    };

    RefreshToken.mockImplementation(() => mockRefreshTokenModel);
    refreshTokenService.refreshTokenModel = mockRefreshTokenModel;
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('generateTokenPair', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'user'
    };

    it('should generate access and refresh tokens successfully', async () => {
      const mockAccessToken = 'access-token-123';
      const mockRefreshToken = 'refresh-token-123';
      const mockTokenHash = 'hashed-token';

      require('../../../src/config/jwt').generateAccessToken.mockReturnValue(mockAccessToken);
      generateRefreshToken.mockReturnValue(mockRefreshToken);
      hashToken.mockReturnValue(mockTokenHash);
      mockRefreshTokenModel.create.mockResolvedValue({ id: 'token-id' });

      const result = await refreshTokenService.generateTokenPair(mockUser);

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresIn: '15m',
        tokenType: 'Bearer'
      });

      expect(mockRefreshTokenModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          tokenHash: mockTokenHash
        })
      );
    });

    it('should handle device info and IP address', async () => {
      const deviceInfo = { userAgent: 'Mozilla/5.0', browser: 'Chrome' };
      const ipAddress = '192.168.1.1';

      require('../../../src/config/jwt').generateAccessToken.mockReturnValue('access-token');
      generateRefreshToken.mockReturnValue('refresh-token');
      hashToken.mockReturnValue('hashed-token');
      mockRefreshTokenModel.create.mockResolvedValue({ id: 'token-id' });

      await refreshTokenService.generateTokenPair(mockUser, deviceInfo, ipAddress);

      expect(mockRefreshTokenModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceInfo: expect.any(Object),
          ipAddress
        })
      );
    });

    it('should handle errors during token generation', async () => {
      mockRefreshTokenModel.create.mockRejectedValue(new Error('Database error'));

      await expect(
        refreshTokenService.generateTokenPair(mockUser)
      ).rejects.toThrow('Failed to generate authentication tokens');
    });
  });

  describe('rotateRefreshToken', () => {
    const mockToken = 'valid-refresh-token';
    const mockTokenHash = 'hashed-token';
    const mockDecoded = {
      userId: 'user-123',
      email: 'test@example.com',
      tokenFamily: 'family-123'
    };

    beforeEach(() => {
      verifyRefreshToken.mockReturnValue(mockDecoded);
      hashToken.mockReturnValue(mockTokenHash);
    });

    it('should rotate token successfully', async () => {
      const mockTokenRecord = {
        id: 'token-id',
        is_blacklisted: false,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        token_family: 'family-123'
      };

      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: '15m',
        tokenType: 'Bearer'
      };

      mockRefreshTokenModel.findByTokenHash.mockResolvedValue(mockTokenRecord);
      mockRefreshTokenModel.updateLastUsed.mockResolvedValue({});
      mockRefreshTokenModel.blacklist.mockResolvedValue({});

      // Mock the generateTokenPair method
      jest.spyOn(refreshTokenService, 'generateTokenPair').mockResolvedValue(newTokens);

      const result = await refreshTokenService.rotateRefreshToken(mockToken);

      expect(result).toEqual(newTokens);
      expect(mockRefreshTokenModel.blacklist).toHaveBeenCalledWith(mockTokenHash);
      expect(mockRefreshTokenModel.updateLastUsed).toHaveBeenCalledWith(mockTokenHash, undefined);
    });

    it('should throw error if token not found', async () => {
      mockRefreshTokenModel.findByTokenHash.mockResolvedValue(null);

      await expect(
        refreshTokenService.rotateRefreshToken(mockToken)
      ).rejects.toThrow('Refresh token not found');
    });

    it('should blacklist token family if token is blacklisted', async () => {
      const mockTokenRecord = {
        is_blacklisted: true,
        token_family: 'family-123'
      };

      mockRefreshTokenModel.findByTokenHash.mockResolvedValue(mockTokenRecord);
      mockRefreshTokenModel.blacklistTokenFamily.mockResolvedValue(1);

      await expect(
        refreshTokenService.rotateRefreshToken(mockToken)
      ).rejects.toThrow('Refresh token is blacklisted');

      expect(mockRefreshTokenModel.blacklistTokenFamily).toHaveBeenCalledWith('family-123');
    });

    it('should handle expired tokens', async () => {
      const mockTokenRecord = {
        is_blacklisted: false,
        expires_at: new Date(Date.now() - 86400000).toISOString() // expired
      };

      mockRefreshTokenModel.findByTokenHash.mockResolvedValue(mockTokenRecord);
      mockRefreshTokenModel.blacklist.mockResolvedValue({});

      await expect(
        refreshTokenService.rotateRefreshToken(mockToken)
      ).rejects.toThrow('Refresh token has expired');

      expect(mockRefreshTokenModel.blacklist).toHaveBeenCalledWith(mockTokenHash);
    });
  });

  describe('validateRefreshToken', () => {
    const mockToken = 'valid-refresh-token';
    const mockTokenHash = 'hashed-token';
    const mockDecoded = {
      userId: 'user-123',
      email: 'test@example.com',
      tokenFamily: 'family-123'
    };

    beforeEach(() => {
      verifyRefreshToken.mockReturnValue(mockDecoded);
      hashToken.mockReturnValue(mockTokenHash);
    });

    it('should validate token successfully', async () => {
      const mockTokenRecord = { id: 'token-id' };
      mockRefreshTokenModel.isValid.mockResolvedValue({
        valid: true,
        token: mockTokenRecord
      });

      const result = await refreshTokenService.validateRefreshToken(mockToken);

      expect(result).toEqual({
        valid: true,
        userId: mockDecoded.userId,
        email: mockDecoded.email,
        tokenFamily: mockDecoded.tokenFamily,
        tokenRecord: mockTokenRecord
      });
    });

    it('should handle invalid tokens', async () => {
      mockRefreshTokenModel.isValid.mockResolvedValue({
        valid: false,
        reason: 'Token expired'
      });

      await expect(
        refreshTokenService.validateRefreshToken(mockToken)
      ).rejects.toThrow('Token expired');
    });

    it('should detect suspicious activity', async () => {
      mockRefreshTokenModel.isValid.mockResolvedValue({
        valid: false,
        reason: 'Token not found'
      });
      
      mockRefreshTokenModel.findByTokenFamily.mockResolvedValue([
        { id: 'token-1' },
        { id: 'token-2' }
      ]);
      
      mockRefreshTokenModel.blacklistTokenFamily.mockResolvedValue(2);

      await expect(
        refreshTokenService.validateRefreshToken(mockToken)
      ).rejects.toThrow('Suspicious token activity detected');

      expect(mockRefreshTokenModel.blacklistTokenFamily).toHaveBeenCalledWith('family-123');
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist token successfully', async () => {
      const mockToken = 'token-to-blacklist';
      const mockTokenHash = 'hashed-token';

      hashToken.mockReturnValue(mockTokenHash);
      mockRefreshTokenModel.blacklist.mockResolvedValue({ id: 'token-id' });

      const result = await refreshTokenService.blacklistToken(mockToken);

      expect(result).toEqual({
        success: true,
        message: 'Token blacklisted successfully'
      });

      expect(mockRefreshTokenModel.blacklist).toHaveBeenCalledWith(mockTokenHash);
    });

    it('should handle token not found', async () => {
      const mockToken = 'non-existent-token';
      const mockTokenHash = 'hashed-token';

      hashToken.mockReturnValue(mockTokenHash);
      mockRefreshTokenModel.blacklist.mockResolvedValue(null);

      const result = await refreshTokenService.blacklistToken(mockToken);

      expect(result).toEqual({
        success: false,
        message: 'Token not found'
      });
    });
  });

  describe('blacklistAllUserTokens', () => {
    it('should blacklist all user tokens', async () => {
      const userId = 'user-123';
      mockRefreshTokenModel.blacklistByUserId.mockResolvedValue(5);

      const result = await refreshTokenService.blacklistAllUserTokens(userId);

      expect(result).toEqual({
        success: true,
        blacklistedCount: 5,
        message: 'Blacklisted 5 refresh tokens'
      });

      expect(mockRefreshTokenModel.blacklistByUserId).toHaveBeenCalledWith(userId);
    });
  });

  describe('blacklistTokenFamily', () => {
    it('should blacklist token family successfully', async () => {
      const tokenFamily = 'family-123';
      mockRefreshTokenModel.blacklistTokenFamily.mockResolvedValue(3);

      const result = await refreshTokenService.blacklistTokenFamily(tokenFamily);

      expect(result).toEqual({
        success: true,
        blacklistedCount: 3,
        message: 'Blacklisted 3 tokens in the token family'
      });

      expect(mockRefreshTokenModel.blacklistTokenFamily).toHaveBeenCalledWith(tokenFamily);
    });
  });

  describe('getUserActiveTokens', () => {
    it('should get user active tokens', async () => {
      const userId = 'user-123';
      const mockTokens = [
        {
          id: 'token-1',
          created_at: '2023-01-01T00:00:00Z',
          last_used_at: '2023-01-02T00:00:00Z',
          expires_at: '2023-01-08T00:00:00Z',
          device_info: { browser: 'Chrome' },
          ip_address: '192.168.1.1'
        }
      ];

      mockRefreshTokenModel.findByUserId.mockResolvedValue(mockTokens);

      const result = await refreshTokenService.getUserActiveTokens(userId);

      expect(result).toEqual([
        {
          id: 'token-1',
          createdAt: '2023-01-01T00:00:00Z',
          lastUsedAt: '2023-01-02T00:00:00Z',
          expiresAt: '2023-01-08T00:00:00Z',
          deviceInfo: { browser: 'Chrome' },
          ipAddress: '192.168.1.1',
          isExpired: expect.any(Boolean)
        }
      ]);

      expect(mockRefreshTokenModel.findByUserId).toHaveBeenCalledWith(userId, 10);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should cleanup expired and blacklisted tokens', async () => {
      mockRefreshTokenModel.deleteExpired.mockResolvedValue(10);
      mockRefreshTokenModel.deleteBlacklisted.mockResolvedValue(5);

      const result = await refreshTokenService.cleanupExpiredTokens();

      expect(result).toEqual({
        success: true,
        expiredRemoved: 10,
        blacklistedRemoved: 5,
        totalRemoved: 15
      });
    });

    it('should handle cleanup errors', async () => {
      mockRefreshTokenModel.deleteExpired.mockRejectedValue(new Error('Database error'));

      await expect(
        refreshTokenService.cleanupExpiredTokens()
      ).rejects.toThrow('Failed to cleanup tokens');
    });
  });

  describe('getTokenStats', () => {
    it('should get token statistics', async () => {
      const mockStats = {
        total_tokens: 100,
        blacklisted_tokens: 20,
        expired_tokens: 10,
        active_tokens: 70
      };

      mockRefreshTokenModel.getStats.mockResolvedValue(mockStats);

      const result = await refreshTokenService.getTokenStats();

      expect(result).toEqual(mockStats);
    });

    it('should handle stats error', async () => {
      mockRefreshTokenModel.getStats.mockRejectedValue(new Error('Database error'));

      await expect(
        refreshTokenService.getTokenStats()
      ).rejects.toThrow('Failed to retrieve token statistics');
    });
  });

  describe('cleanup scheduler', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
      refreshTokenService.stopCleanupScheduler();
    });

    it('should start cleanup scheduler', () => {
      const cleanupSpy = jest.spyOn(refreshTokenService, 'cleanupExpiredTokens').mockResolvedValue({});

      refreshTokenService.startCleanupScheduler(1); // 1 minute interval

      expect(refreshTokenService.cleanupInterval).not.toBeNull();

      // Fast forward 1 minute
      jest.advanceTimersByTime(60 * 1000);

      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should stop cleanup scheduler', () => {
      refreshTokenService.startCleanupScheduler(1);
      
      expect(refreshTokenService.cleanupInterval).not.toBeNull();
      
      refreshTokenService.stopCleanupScheduler();
      
      expect(refreshTokenService.cleanupInterval).toBeNull();
    });
  });
});