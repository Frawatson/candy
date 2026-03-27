const JWTUtil = require('../../utils/jwt.util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const authConfig = require('../../config/auth.config');

// Mock jsonwebtoken
jest.mock('jsonwebtoken');
jest.mock('crypto');

describe('JWTUtil', () => {
  const mockPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    roles: ['user']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear blacklist
    authConfig.security.tokenBlacklist.clear();
  });

  describe('generateAccessToken', () => {
    it('should generate access token successfully', () => {
      const expectedToken = 'mocked.access.token';
      jwt.sign.mockReturnValue(expectedToken);

      const token = JWTUtil.generateAccessToken(mockPayload);

      expect(jwt.sign).toHaveBeenCalledWith(
        { ...mockPayload, type: 'access' },
        authConfig.jwt.secret,
        {
          expiresIn: authConfig.jwt.expiresIn,
          issuer: authConfig.jwt.issuer,
          audience: authConfig.jwt.audience
        }
      );
      expect(token).toBe(expectedToken);
    });

    it('should throw error when token generation fails', () => {
      jwt.sign.mockImplementation(() => {
        throw new Error('Token signing failed');
      });

      expect(() => JWTUtil.generateAccessToken(mockPayload)).toThrow('Token generation failed');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token successfully', () => {
      const expectedToken = 'mocked.refresh.token';
      const mockUuid = 'uuid-123';
      
      jwt.sign.mockReturnValue(expectedToken);
      crypto.randomUUID.mockReturnValue(mockUuid);

      const token = JWTUtil.generateRefreshToken(mockPayload);

      expect(jwt.sign).toHaveBeenCalledWith(
        { ...mockPayload, type: 'refresh', jti: mockUuid },
        authConfig.jwt.refreshSecret,
        {
          expiresIn: authConfig.jwt.refreshExpiresIn,
          issuer: authConfig.jwt.issuer,
          audience: authConfig.jwt.audience
        }
      );
      expect(token).toBe(expectedToken);
    });

    it('should throw error when refresh token generation fails', () => {
      jwt.sign.mockImplementation(() => {
        throw new Error('Token signing failed');
      });

      expect(() => JWTUtil.generateRefreshToken(mockPayload)).toThrow('Refresh token generation failed');
    });
  });

  describe('verifyAccessToken', () => {
    const mockToken = 'valid.access.token';

    it('should verify valid access token', () => {
      const mockDecoded = { ...mockPayload, type: 'access' };
      jwt.verify.mockReturnValue(mockDecoded);

      const result = JWTUtil.verifyAccessToken(mockToken);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, authConfig.jwt.secret, {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience
      });
      expect(result).toEqual(mockDecoded);
    });

    it('should reject blacklisted token', () => {
      authConfig.security.tokenBlacklist.add(mockToken);

      expect(() => JWTUtil.verifyAccessToken(mockToken)).toThrow('Token is blacklisted');
    });

    it('should reject token with wrong type', () => {
      const mockDecoded = { ...mockPayload, type: 'refresh' };
      jwt.verify.mockReturnValue(mockDecoded);

      expect(() => JWTUtil.verifyAccessToken(mockToken)).toThrow('Invalid token type');
    });

    it('should handle invalid token error', () => {
      jwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      expect(() => JWTUtil.verifyAccessToken(mockToken)).toThrow('Invalid token');
    });

    it('should handle expired token error', () => {
      jwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      expect(() => JWTUtil.verifyAccessToken(mockToken)).toThrow('Token expired');
    });
  });

  describe('verifyRefreshToken', () => {
    const mockToken = 'valid.refresh.token';

    it('should verify valid refresh token', () => {
      const mockDecoded = { ...mockPayload, type: 'refresh' };
      jwt.verify.mockReturnValue(mockDecoded);

      const result = JWTUtil.verifyRefreshToken(mockToken);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, authConfig.jwt.refreshSecret, {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience
      });
      expect(result).toEqual(mockDecoded);
    });

    it('should reject token with wrong type', () => {
      const mockDecoded = { ...mockPayload, type: 'access' };
      jwt.verify.mockReturnValue(mockDecoded);

      expect(() => JWTUtil.verifyRefreshToken(mockToken)).toThrow('Invalid token type');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const mockDecoded = { userId: 'user-123' };
      jwt.decode.mockReturnValue(mockDecoded);

      const result = JWTUtil.decodeToken('some.token');

      expect(jwt.decode).toHaveBeenCalledWith('some.token');
      expect(result).toEqual(mockDecoded);
    });

    it('should throw error when decode fails', () => {
      jwt.decode.mockImplementation(() => {
        throw new Error('Decode failed');
      });

      expect(() => JWTUtil.decodeToken('invalid.token')).toThrow('Token decode failed');
    });
  });

  describe('getTokenExpiration', () => {
    it('should return token expiration date', () => {
      const expTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const mockDecoded = { exp: expTimestamp };
      jwt.decode.mockReturnValue(mockDecoded);

      const result = JWTUtil.getTokenExpiration('some.token');

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(expTimestamp * 1000);
    });

    it('should throw error when cannot get expiration', () => {
      jwt.decode.mockImplementation(() => {
        throw new Error('Decode failed');
      });

      expect(() => JWTUtil.getTokenExpiration('invalid.token')).toThrow('Cannot get token expiration');
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
      const mockDecoded = { exp: futureTimestamp };
      jwt.decode.mockReturnValue(mockDecoded);

      const result = JWTUtil.isTokenExpired('valid.token');

      expect(result).toBe(false);
    });

    it('should return true for expired token', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600;
      const mockDecoded = { exp: pastTimestamp };
      jwt.decode.mockReturnValue(mockDecoded);

      const result = JWTUtil.isTokenExpired('expired.token');

      expect(result).toBe(true);
    });

    it('should return true for invalid token', () => {
      jwt.decode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = JWTUtil.isTokenExpired('invalid.token');

      expect(result).toBe(true);
    });
  });

  describe('blacklistToken', () => {
    it('should add token to blacklist', () => {
      const token = 'token.to.blacklist';

      JWTUtil.blacklistToken(token);

      expect(authConfig.security.tokenBlacklist.has(token)).toBe(true);
    });

    it('should trigger cleanup when blacklist gets too large', () => {
      // Fill blacklist
      for (let i = 0; i < 10001; i++) {
        authConfig.security.tokenBlacklist.add(`token.${i}`);
      }

      const cleanupSpy = jest.spyOn(JWTUtil, 'cleanupBlacklist').mockImplementation();

      JWTUtil.blacklistToken('new.token');

      expect(cleanupSpy).toHaveBeenCalled();
      cleanupSpy.mockRestore();
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const accessToken = 'access.token';
      const refreshToken = 'refresh.token';

      jwt.sign
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);
      crypto.randomUUID.mockReturnValue('uuid-123');

      const result = JWTUtil.generateTokenPair(mockPayload);

      expect(result).toEqual({
        accessToken,
        refreshToken
      });
    });
  });
});