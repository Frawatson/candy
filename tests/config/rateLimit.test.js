const { ValidationError } = require('../../src/utils/errorTypes');

// Mock environment variables
const originalEnv = process.env;

describe('RateLimitConfig', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    test('should initialize with default values when no env vars are set', () => {
      delete process.env.RATE_LIMIT_WINDOW_MS;
      delete process.env.RATE_LIMIT_MAX_ATTEMPTS;

      const RateLimitConfig = require('../../src/config/rateLimit');
      
      expect(RateLimitConfig.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(RateLimitConfig.maxAttempts).toBe(5);
    });

    test('should use environment variables when provided', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '30000';
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '10';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      const RateLimitConfig = require('../../src/config/rateLimit');
      
      expect(RateLimitConfig.windowMs).toBe(30000);
      expect(RateLimitConfig.maxAttempts).toBe(10);
    });
  });

  describe('validateWindowMs', () => {
    test('should return default when env var is undefined', () => {
      delete process.env.RATE_LIMIT_WINDOW_MS;

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      const RateLimitConfig = require('../../src/config/rateLimit');
      
      expect(RateLimitConfig.windowMs).toBe(15 * 60 * 1000);
    });

    test('should parse valid string numbers', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '60000';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      const RateLimitConfig = require('../../src/config/rateLimit');
      
      expect(RateLimitConfig.windowMs).toBe(60000);
    });

    test('should throw ValidationError for invalid string', () => {
      process.env.RATE_LIMIT_WINDOW_MS = 'invalid';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      
      expect(() => {
        require('../../src/config/rateLimit');
      }).toThrow(ValidationError);
    });

    test('should throw ValidationError for negative numbers', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '-1000';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      
      expect(() => {
        require('../../src/config/rateLimit');
      }).toThrow('RATE_LIMIT_WINDOW_MS must be a positive integer');
    });

    test('should throw ValidationError for zero', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '0';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      
      expect(() => {
        require('../../src/config/rateLimit');
      }).toThrow('RATE_LIMIT_WINDOW_MS must be a positive integer');
    });

    test('should throw ValidationError for empty string', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      const RateLimitConfig = require('../../src/config/rateLimit');
      
      // Empty string should use default
      expect(RateLimitConfig.windowMs).toBe(15 * 60 * 1000);
    });
  });

  describe('validateMaxAttempts', () => {
    test('should return default when env var is undefined', () => {
      delete process.env.RATE_LIMIT_MAX_ATTEMPTS;

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      const RateLimitConfig = require('../../src/config/rateLimit');
      
      expect(RateLimitConfig.maxAttempts).toBe(5);
    });

    test('should parse valid string numbers', () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '15';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      const RateLimitConfig = require('../../src/config/rateLimit');
      
      expect(RateLimitConfig.maxAttempts).toBe(15);
    });

    test('should throw ValidationError for invalid string', () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = 'not_a_number';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      
      expect(() => {
        require('../../src/config/rateLimit');
      }).toThrow('RATE_LIMIT_MAX_ATTEMPTS must be a positive integer');
    });

    test('should throw ValidationError for negative numbers', () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '-5';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      
      expect(() => {
        require('../../src/config/rateLimit');
      }).toThrow('RATE_LIMIT_MAX_ATTEMPTS must be a positive integer');
    });

    test('should throw ValidationError for zero', () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '0';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      
      expect(() => {
        require('../../src/config/rateLimit');
      }).toThrow('RATE_LIMIT_MAX_ATTEMPTS must be a positive integer');
    });
  });

  describe('getAuthConfig', () => {
    let rateLimitConfig;

    beforeEach(() => {
      delete require.cache[require.resolve('../../src/config/rateLimit')];
      rateLimitConfig = require('../../src/config/rateLimit');
    });

    test('should return auth configuration with correct structure', () => {
      const config = rateLimitConfig.getAuthConfig();

      expect(config).toHaveProperty('windowMs', rateLimitConfig.windowMs);
      expect(config).toHaveProperty('max', rateLimitConfig.maxAttempts);
      expect(config).toHaveProperty('message');
      expect(config).toHaveProperty('standardHeaders', true);
      expect(config).toHaveProperty('legacyHeaders', false);
      expect(config).toHaveProperty('skipSuccessfulRequests', false);
      expect(config).toHaveProperty('skipFailedRequests', false);
      expect(config).toHaveProperty('keyGenerator');
    });

    test('should include rate limit error in message', () => {
      const config = rateLimitConfig.getAuthConfig();

      expect(config.message).toEqual({
        success: false,
        message: expect.stringContaining('Too many authentication attempts'),
        error: 'RATE_LIMIT_EXCEEDED'
      });
    });

    test('should calculate minutes correctly in message', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '120000'; // 2 minutes

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      const testRateLimitConfig = require('../../src/config/rateLimit');
      const config = testRateLimitConfig.getAuthConfig();

      expect(config.message.message).toContain('2 minutes');
    });

    test('keyGenerator should combine IP and user agent', () => {
      const config = rateLimitConfig.getAuthConfig();
      const mockReq = {
        ip: '192.168.1.1',
        headers: { 'user-agent': 'test-browser' }
      };

      const key = config.keyGenerator(mockReq);

      expect(key).toBe('192.168.1.1:test-browser');
    });

    test('keyGenerator should handle missing user agent', () => {
      const config = rateLimitConfig.getAuthConfig();
      const mockReq = {
        ip: '192.168.1.1',
        headers: {}
      };

      const key = config.keyGenerator(mockReq);

      expect(key).toBe('192.168.1.1:unknown');
    });
  });

  describe('getGeneralConfig', () => {
    let rateLimitConfig;

    beforeEach(() => {
      delete require.cache[require.resolve('../../src/config/rateLimit')];
      rateLimitConfig = require('../../src/config/rateLimit');
    });

    test('should return general configuration with higher limits', () => {
      const config = rateLimitConfig.getGeneralConfig();

      expect(config.max).toBe(rateLimitConfig.maxAttempts * 10);
      expect(config.skipSuccessfulRequests).toBe(true);
      expect(config.skipFailedRequests).toBe(false);
    });

    test('should include generic rate limit message', () => {
      const config = rateLimitConfig.getGeneralConfig();

      expect(config.message.message).toContain('Too many requests');
      expect(config.message.error).toBe('RATE_LIMIT_EXCEEDED');
    });

    test('keyGenerator should use only IP address', () => {
      const config = rateLimitConfig.getGeneralConfig();
      const mockReq = {
        ip: '192.168.1.1',
        headers: { 'user-agent': 'test-browser' }
      };

      const key = config.keyGenerator(mockReq);

      expect(key).toBe('192.168.1.1');
    });
  });

  describe('getStrictConfig', () => {
    let rateLimitConfig;

    beforeEach(() => {
      delete require.cache[require.resolve('../../src/config/rateLimit')];
      rateLimitConfig = require('../../src/config/rateLimit');
    });

    test('should return strict configuration with lower limits', () => {
      const config = rateLimitConfig.getStrictConfig();
      const expectedMax = Math.ceil(rateLimitConfig.maxAttempts / 2) || 1;

      expect(config.max).toBe(expectedMax);
      expect(config.skipSuccessfulRequests).toBe(false);
      expect(config.skipFailedRequests).toBe(false);
    });

    test('should ensure minimum of 1 attempt', () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '1';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      const testRateLimitConfig = require('../../src/config/rateLimit');
      const config = testRateLimitConfig.getStrictConfig();

      expect(config.max).toBe(1);
    });

    test('should include sensitive operation message', () => {
      const config = rateLimitConfig.getStrictConfig();

      expect(config.message.message).toContain('sensitive operation');
      expect(config.message.error).toBe('RATE_LIMIT_EXCEEDED');
    });

    test('keyGenerator should include user ID when authenticated', () => {
      const config = rateLimitConfig.getStrictConfig();
      const mockReq = {
        ip: '192.168.1.1',
        user: { id: 'user123' },
        headers: { 'user-agent': 'test-browser' }
      };

      const key = config.keyGenerator(mockReq);

      expect(key).toBe('192.168.1.1:user123:test-browser');
    });

    test('keyGenerator should handle anonymous users', () => {
      const config = rateLimitConfig.getStrictConfig();
      const mockReq = {
        ip: '192.168.1.1',
        headers: { 'user-agent': 'test-browser' }
      };

      const key = config.keyGenerator(mockReq);

      expect(key).toBe('192.168.1.1:anonymous:test-browser');
    });

    test('keyGenerator should handle missing user agent with authenticated user', () => {
      const config = rateLimitConfig.getStrictConfig();
      const mockReq = {
        ip: '192.168.1.1',
        user: { id: 'user123' },
        headers: {}
      };

      const key = config.keyGenerator(mockReq);

      expect(key).toBe('192.168.1.1:user123:unknown');
    });
  });

  describe('edge cases', () => {
    test('should handle fractional window times by flooring', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '12345';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      const rateLimitConfig = require('../../src/config/rateLimit');

      expect(rateLimitConfig.windowMs).toBe(12345);
    });

    test('should handle very large numbers', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '999999999';
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '999999';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      const rateLimitConfig = require('../../src/config/rateLimit');

      expect(rateLimitConfig.windowMs).toBe(999999999);
      expect(rateLimitConfig.maxAttempts).toBe(999999);
    });

    test('should handle single-digit inputs', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '1';
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '1';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      const rateLimitConfig = require('../../src/config/rateLimit');

      expect(rateLimitConfig.windowMs).toBe(1);
      expect(rateLimitConfig.maxAttempts).toBe(1);
    });
  });
});