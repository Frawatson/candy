const jwt = require('jsonwebtoken');
const {
  jwtConfig,
  validateJWTConfig,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken
} = require('../../../src/config/jwt');

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

describe('JWT Configuration', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set test environment variables
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-jwt-secret-with-minimum-32-characters',
      JWT_REFRESH_SECRET: 'test-refresh-secret-with-minimum-32-chars',
      JWT_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d'
    };
  });

  describe('jwtConfig', () => {
    it('should have correct default configuration', () => {
      expect(jwtConfig.accessToken).toEqual({
        secret: 'test-jwt-secret-with-minimum-32-characters',
        expiresIn: '15m',
        issuer: 'authentication-system',
        audience: 'authentication-system-users'
      });

      expect(jwtConfig.refreshToken).toEqual({
        secret: 'test-refresh-secret-with-minimum-32-chars',
        expiresIn: '7d',
        issuer: 'authentication-system',
        audience: 'authentication-system-users'
      });
    });

    it('should use environment variables for secrets', () => {
      expect(jwtConfig.accessToken.secret).toBe(process.env.JWT_SECRET);
      expect(jwtConfig.refreshToken.secret).toBe(process.env.JWT_REFRESH_SECRET);
    });

    it('should use environment variables for expiry times', () => {
      expect(jwtConfig.accessToken.expiresIn).toBe(process.env.JWT_EXPIRY);
      expect(jwtConfig.refreshToken.expiresIn).toBe(process.env.JWT_REFRESH_EXPIRY);
    });
  });

  describe('validateJWTConfig', () => {
    it('should validate configuration successfully with valid secrets', () => {
      expect(() => validateJWTConfig()).not.toThrow();
    });

    it('should throw error when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      
      expect(() => validateJWTConfig()).toThrow('JWT_SECRET environment variable is required');
    });

    it('should throw error when JWT_REFRESH_SECRET is missing', () => {
      delete process.env.JWT_REFRESH_SECRET;
      
      expect(() => validateJWTConfig()).toThrow('JWT_REFRESH_SECRET environment variable is required');
    });

    it('should throw error when secrets are the same', () => {
      process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;
      
      expect(() => validateJWTConfig()).toThrow('JWT_SECRET and JWT_REFRESH_SECRET must be different');
    });

    it('should throw error when JWT_SECRET is too short', () => {
      process.env.JWT_SECRET = 'short-secret';
      
      expect(() => validateJWTConfig()).toThrow('JWT_SECRET must be at least 32 characters long');
    });

    it('should throw error when JWT_REFRESH_SECRET is too short', () => {
      process.env.JWT_REFRESH_SECRET = 'short-refresh';
      
      expect(() => validateJWTConfig()).toThrow('JWT_REFRESH_SECRET must be at least 32 characters long');
    });
  });

  describe('generateAccessToken', () => {
    it('should generate access token with correct parameters', () => {
      const payload = { userId: '123', email: 'test@example.com' };
      const expectedToken = 'generated-access-token';

      jwt.sign.mockReturnValue(expectedToken);

      const result = generateAccessToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        jwtConfig.accessToken.secret,
        {
          expiresIn: jwtConfig.accessToken.expiresIn,
          issuer: jwtConfig.accessToken.issuer,
          audience: jwtConfig.accessToken.audience
        }
      );
      expect(result).toBe(expectedToken);
    });

    it('should handle jwt.sign errors', () => {
      const payload = { userId: '123' };
      const error = new Error('JWT signing failed');

      jwt.sign.mockImplementation(() => {
        throw error;
      });

      expect(() => generateAccessToken(payload)).toThrow('JWT signing failed');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token with correct parameters', () => {
      const payload = { userId: '123', tokenFamily: 'family-123' };
      const expectedToken = 'generated-refresh-token';

      jwt.sign.mockReturnValue(expectedToken);

      const result = generateRefreshToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        jwtConfig.refreshToken.secret,
        {
          expiresIn: jwtConfig.refreshToken.expiresIn,
          issuer: jwtConfig.refreshToken.issuer,
          audience: jwtConfig.refreshToken.audience
        }
      );
      expect(result).toBe(expectedToken);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify access token successfully', () => {
      const token = 'valid-access-token';
      const expectedPayload = { userId: '123', email: 'test@example.com' };

      jwt.verify.mockReturnValue(expectedPayload);

      const result = verifyAccessToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(
        token,
        jwtConfig.accessToken.secret,
        {
          issuer: jwtConfig.accessToken.issuer,
          audience: jwtConfig.accessToken.audience
        }
      );
      expect(result).toBe(expectedPayload);
    });

    it('should handle verification errors', () => {
      const token = 'invalid-token';
      const error = new jwt.JsonWebTokenError('Invalid token');

      jwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => verifyAccessToken(token)).toThrow('Invalid token');
    });

    it('should handle expired tokens', () => {
      const token = 'expired-token';
      const error = new jwt.TokenExpiredError('Token expired', new Date());

      jwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => verifyAccessToken(token)).toThrow('Token expired');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify refresh token successfully', () => {
      const token = 'valid-refresh-token';
      const expectedPayload = { userId: '123', tokenFamily: 'family-123' };

      jwt.verify.mockReturnValue(expectedPayload);

      const result = verifyRefreshToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(
        token,
        jwtConfig.refreshToken.secret,
        {
          issuer: jwtConfig.refreshToken.issuer,
          audience: jwtConfig.refreshToken.audience
        }
      );
      expect(result).toBe(expectedPayload);
    });

    it('should throw error for invalid refresh token', () => {
      const token = 'invalid-refresh-token';
      const error = new jwt.JsonWebTokenError('Invalid signature');

      jwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => verifyRefreshToken(token)).toThrow('Invalid signature');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = 'some-jwt-token';
      const expectedPayload = { userId: '123', exp: 1234567890 };

      jwt.decode.mockReturnValue(expectedPayload);

      const result = decodeToken(token);

      expect(jwt.decode).toHaveBeenCalledWith(token);
      expect(result).toBe(expectedPayload);
    });

    it('should return null for invalid token structure', () => {
      const token = 'invalid-token-structure';

      jwt.decode.mockReturnValue(null);

      const result = decodeToken(token);

      expect(result).toBeNull();
    });
  });

  describe('configuration edge cases', () => {
    it('should handle missing environment variables with defaults', () => {
      delete process.env.JWT_EXPIRY;
      delete process.env.JWT_REFRESH_EXPIRY;

      // Reload the module to get default values
      jest.resetModules();
      const { jwtConfig: newConfig } = require('../../../src/config/jwt');

      expect(newConfig.accessToken.expiresIn).toBe('15m');
      expect(newConfig.refreshToken.expiresIn).toBe('7d');
    });

    it('should maintain consistent issuer and audience', () => {
      expect(jwtConfig.accessToken.issuer).toBe(jwtConfig.refreshToken.issuer);
      expect(jwtConfig.accessToken.audience).toBe(jwtConfig.refreshToken.audience);
    });
  });
});