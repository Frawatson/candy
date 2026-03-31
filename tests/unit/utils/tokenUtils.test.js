const crypto = require('crypto');
const {
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
} = require('../../../src/utils/tokenUtils');

// Mock dependencies
jest.mock('crypto');
jest.mock('../../../src/config/jwt', () => ({
  generateRefreshToken: jest.fn(),
  decodeToken: jest.fn()
}));

const { generateRefreshToken, decodeToken } = require('../../../src/config/jwt');

describe('TokenUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashToken', () => {
    it('should hash token using SHA256', () => {
      const token = 'test-token';
      const expectedHash = 'hashed-token-value';

      const mockHasher = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(expectedHash)
      };

      crypto.createHash.mockReturnValue(mockHasher);

      const result = hashToken(token);

      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(mockHasher.update).toHaveBeenCalledWith(token);
      expect(mockHasher.digest).toHaveBeenCalledWith('hex');
      expect(result).toBe(expectedHash);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate secure random token', () => {
      const mockRandomBytes = Buffer.from('random-bytes');
      const expectedToken = 'random-hex-string';

      crypto.randomBytes.mockReturnValue(mockRandomBytes);
      mockRandomBytes.toString = jest.fn().mockReturnValue(expectedToken);

      const result = generateSecureToken();

      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      expect(mockRandomBytes.toString).toHaveBeenCalledWith('hex');
      expect(result).toBe(expectedToken);
    });
  });

  describe('createTokenPayload', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com'
    };

    it('should create payload with provided tokenFamily', () => {
      const tokenFamily = 'existing-family';

      const result = createTokenPayload(mockUser, tokenFamily);

      expect(result).toEqual({
        userId: mockUser.id,
        email: mockUser.email,
        tokenFamily,
        tokenType: 'refresh'
      });
    });

    it('should generate tokenFamily if not provided', () => {
      crypto.randomBytes.mockReturnValue(Buffer.from('random'));
      Buffer.from('random').toString = jest.fn().mockReturnValue('generated-family');

      const result = createTokenPayload(mockUser);

      expect(result).toEqual({
        userId: mockUser.id,
        email: mockUser.email,
        tokenFamily: 'generated-family',
        tokenType: 'refresh'
      });
    });
  });

  describe('parseExpiryTime', () => {
    it('should parse seconds correctly', () => {
      expect(parseExpiryTime('30s')).toBe(30 * 1000);
    });

    it('should parse minutes correctly', () => {
      expect(parseExpiryTime('15m')).toBe(15 * 60 * 1000);
    });

    it('should parse hours correctly', () => {
      expect(parseExpiryTime('2h')).toBe(2 * 60 * 60 * 1000);
    });

    it('should parse days correctly', () => {
      expect(parseExpiryTime('7d')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should parse weeks correctly', () => {
      expect(parseExpiryTime('2w')).toBe(2 * 7 * 24 * 60 * 60 * 1000);
    });

    it('should throw error for invalid format', () => {
      expect(() => parseExpiryTime('invalid')).toThrow('Invalid expiry format: invalid');
    });

    it('should throw error for invalid time unit', () => {
      expect(() => parseExpiryTime('10x')).toThrow('Invalid time unit: x');
    });

    it('should handle zero values', () => {
      expect(parseExpiryTime('0s')).toBe(0);
    });

    it('should handle large numbers', () => {
      expect(parseExpiryTime('999d')).toBe(999 * 24 * 60 * 60 * 1000);
    });
  });

  describe('calculateExpiryDate', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate correct expiry date', () => {
      const result = calculateExpiryDate('1h');
      const expected = new Date('2023-01-01T01:00:00Z');

      expect(result).toEqual(expected);
    });

    it('should handle different time units', () => {
      const result = calculateExpiryDate('7d');
      const expected = new Date('2023-01-08T00:00:00Z');

      expect(result).toEqual(expected);
    });
  });

  describe('isTokenExpired', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-01-01T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true for expired date', () => {
      const expiredDate = new Date('2023-01-01T11:00:00Z');
      expect(isTokenExpired(expiredDate)).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = new Date('2023-01-01T13:00:00Z');
      expect(isTokenExpired(futureDate)).toBe(false);
    });

    it('should handle date strings', () => {
      const expiredDateString = '2023-01-01T11:00:00Z';
      expect(isTokenExpired(expiredDateString)).toBe(true);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const authHeader = 'Bearer valid-token-123';
      const result = extractTokenFromHeader(authHeader);

      expect(result).toBe('valid-token-123');
    });

    it('should return null for missing header', () => {
      const result = extractTokenFromHeader(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined header', () => {
      const result = extractTokenFromHeader(undefined);
      expect(result).toBeNull();
    });

    it('should return null for invalid format', () => {
      const result = extractTokenFromHeader('InvalidFormat token');
      expect(result).toBeNull();
    });

    it('should return null for incomplete header', () => {
      const result = extractTokenFromHeader('Bearer');
      expect(result).toBeNull();
    });

    it('should handle extra spaces', () => {
      const authHeader = 'Bearer   token-with-spaces   ';
      const result = extractTokenFromHeader(authHeader);

      expect(result).toBe('token-with-spaces   ');
    });
  });

  describe('validateTokenStructure', () => {
    it('should return true for valid JWT structure', () => {
      const validToken = 'header.payload.signature';
      expect(validateTokenStructure(validToken)).toBe(true);
    });

    it('should return false for invalid structure', () => {
      const invalidToken = 'header.payload';
      expect(validateTokenStructure(invalidToken)).toBe(false);
    });

    it('should return false for null token', () => {
      expect(validateTokenStructure(null)).toBe(false);
    });

    it('should return false for undefined token', () => {
      expect(validateTokenStructure(undefined)).toBe(false);
    });

    it('should return false for non-string token', () => {
      expect(validateTokenStructure(123)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(validateTokenStructure('')).toBe(false);
    });

    it('should return false for too many parts', () => {
      const invalidToken = 'header.payload.signature.extra';
      expect(validateTokenStructure(invalidToken)).toBe(false);
    });
  });

  describe('getTokenInfo', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-01-01T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return valid token info', () => {
      const token = 'valid-token';
      const mockDecoded = {
        userId: '123',
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };

      decodeToken.mockReturnValue(mockDecoded);

      const result = getTokenInfo(token);

      expect(result).toEqual({
        valid: true,
        payload: mockDecoded,
        expired: false
      });
    });

    it('should detect expired token', () => {
      const token = 'expired-token';
      const mockDecoded = {
        userId: '123',
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };

      decodeToken.mockReturnValue(mockDecoded);

      const result = getTokenInfo(token);

      expect(result).toEqual({
        valid: true,
        payload: mockDecoded,
        expired: true
      });
    });

    it('should handle decoding errors', () => {
      const token = 'invalid-token';
      const error = new Error('Invalid token format');

      decodeToken.mockImplementation(() => {
        throw error;
      });

      const result = getTokenInfo(token);

      expect(result).toEqual({
        valid: false,
        error: 'Invalid token format'
      });
    });

    it('should handle tokens without expiry', () => {
      const token = 'no-exp-token';
      const mockDecoded = { userId: '123' };

      decodeToken.mockReturnValue(mockDecoded);

      const result = getTokenInfo(token);

      expect(result).toEqual({
        valid: true,
        payload: mockDecoded,
        expired: false
      });
    });
  });

  describe('createRefreshTokenData', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com'
    };

    it('should create complete refresh token data', () => {
      const deviceInfo = { browser: 'Chrome' };
      const ipAddress = '192.168.1.1';
      const mockToken = 'generated-refresh-token';
      const mockHash = 'hashed-token';
      const mockFamily = 'token-family';

      // Mock crypto functions
      crypto.randomBytes.mockReturnValue(Buffer.from('random'));
      Buffer.from('random').toString = jest.fn().mockReturnValue(mockFamily);

      const mockHasher = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(mockHash)
      };
      crypto.createHash.mockReturnValue(mockHasher);

      generateRefreshToken.mockReturnValue(mockToken);

      const result = createRefreshTokenData(mockUser, deviceInfo, ipAddress);

      expect(result).toEqual({
        token: mockToken,
        tokenHash: mockHash,
        tokenFamily: mockFamily,
        payload: expect.objectContaining({
          userId: mockUser.id,
          email: mockUser.email,
          tokenFamily: mockFamily,
          tokenType: 'refresh'
        }),
        deviceInfo,
        ipAddress
      });
    });

    it('should handle empty device info', () => {
      crypto.randomBytes.mockReturnValue(Buffer.from('random'));
      Buffer.from('random').toString = jest.fn().mockReturnValue('family');

      const mockHasher = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hash')
      };
      crypto.createHash.mockReturnValue(mockHasher);

      generateRefreshToken.mockReturnValue('token');

      const result = createRefreshTokenData(mockUser);

      expect(result.deviceInfo).toEqual({});
      expect(result.ipAddress).toBeNull();
    });
  });

  describe('sanitizeDeviceInfo', () => {
    it('should sanitize and limit device info fields', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const deviceInfo = {
        platform: 'Windows',
        browser: 'Chrome',
        version: '91.0.4472.124'
      };

      const result = sanitizeDeviceInfo(userAgent, deviceInfo);

      expect(result).toEqual({
        userAgent,
        platform: 'Windows',
        browser: 'Chrome',
        version: '91.0.4472.124'
      });
    });

    it('should truncate long user agent', () => {
      const longUserAgent = 'a'.repeat(600);
      
      const result = sanitizeDeviceInfo(longUserAgent);

      expect(result.userAgent).toHaveLength(500);
    });

    it('should truncate long field values', () => {
      const deviceInfo = {
        platform: 'x'.repeat(100),
        browser: 'y'.repeat(100),
        version: 'z'.repeat(50)
      };

      const result = sanitizeDeviceInfo('test', deviceInfo);

      expect(result.platform).toHaveLength(50);
      expect(result.browser).toHaveLength(50);
      expect(result.version).toHaveLength(20);
    });

    it('should remove null and undefined values', () => {
      const deviceInfo = {
        platform: null,
        browser: 'Chrome',
        version: undefined
      };

      const result = sanitizeDeviceInfo(null, deviceInfo);

      expect(result).toEqual({
        browser: 'Chrome'
      });
    });

    it('should convert non-string values to strings', () => {
      const deviceInfo = {
        platform: 123,
        browser: true,
        version: { name: 'Chrome' }
      };

      const result = sanitizeDeviceInfo('test', deviceInfo);

      expect(result.platform).toBe('123');
      expect(result.browser).toBe('true');
      expect(result.version).toBe('[object Object]');
    });
  });

  describe('isValidIPAddress', () => {
    it('should validate IPv4 addresses', () => {
      expect(isValidIPAddress('192.168.1.1')).toBe(true);
      expect(isValidIPAddress('10.0.0.1')).toBe(true);
      expect(isValidIPAddress('255.255.255.255')).toBe(true);
      expect(isValidIPAddress('0.0.0.0')).toBe(true);
    });

    it('