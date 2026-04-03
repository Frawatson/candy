const request = require('supertest');
const express = require('express');
const { 
  authRateLimit, 
  generalRateLimit, 
  strictRateLimit,
  createRateLimit 
} = require('../../src/middleware/rateLimiter');
const rateLimitConfig = require('../../src/config/rateLimit');

// Mock environment variables
const originalEnv = process.env;

describe('Rate Limiter Configuration', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Variable Validation', () => {
    test('should use default values when env vars not set', () => {
      delete process.env.RATE_LIMIT_WINDOW_MS;
      delete process.env.RATE_LIMIT_MAX_ATTEMPTS;

      const RateLimitConfig = require('../../src/config/rateLimit');
      expect(RateLimitConfig.windowMs).toBe(15 * 60 * 1000);
      expect(RateLimitConfig.maxAttempts).toBe(5);
    });

    test('should use env vars when valid', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '30000';
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '10';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      const RateLimitConfig = require('../../src/config/rateLimit');
      
      expect(RateLimitConfig.windowMs).toBe(30000);
      expect(RateLimitConfig.maxAttempts).toBe(10);
    });

    test('should throw error for invalid RATE_LIMIT_WINDOW_MS', () => {
      process.env.RATE_LIMIT_WINDOW_MS = 'invalid';
      
      delete require.cache[require.resolve('../../src/config/rateLimit')];
      
      expect(() => {
        require('../../src/config/rateLimit');
      }).toThrow('RATE_LIMIT_WINDOW_MS must be a positive integer');
    });

    test('should throw error for negative RATE_LIMIT_MAX_ATTEMPTS', () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '-5';
      
      delete require.cache[require.resolve('../../src/config/rateLimit')];
      
      expect(() => {
        require('../../src/config/rateLimit');
      }).toThrow('RATE_LIMIT_MAX_ATTEMPTS must be a positive integer');
    });
  });

  describe('Configuration Methods', () => {
    test('should return auth config with correct properties', () => {
      const config = rateLimitConfig.getAuthConfig();
      
      expect(config).toHaveProperty('windowMs');
      expect(config).toHaveProperty('max');
      expect(config).toHaveProperty('message');
      expect(config).toHaveProperty('keyGenerator');
      expect(config.skipSuccessfulRequests).toBe(false);
    });

    test('should return general config with higher limits', () => {
      const authConfig = rateLimitConfig.getAuthConfig();
      const generalConfig = rateLimitConfig.getGeneralConfig();
      
      expect(generalConfig.max).toBeGreaterThan(authConfig.max);
      expect(generalConfig.skipSuccessfulRequests).toBe(true);
    });

    test('should return strict config with lower limits', () => {
      const authConfig = rateLimitConfig.getAuthConfig();
      const strictConfig = rateLimitConfig.getStrictConfig();
      
      expect(strictConfig.max).toBeLessThanOrEqual(authConfig.max);
    });
  });
});

describe('Rate Limiter Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.set('trust proxy', 1);
  });

  describe('Auth Rate Limiter', () => {
    test('should allow requests within limit', async () => {
      app.use('/auth', authRateLimit);
      app.post('/auth/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/auth/test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should block requests exceeding limit', async () => {
      // Set very low limit for testing
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '1';
      process.env.RATE_LIMIT_WINDOW_MS = '60000';
      
      delete require.cache[require.resolve('../../src/config/rateLimit')];
      delete require.cache[require.resolve('../../src/middleware/rateLimiter')];
      
      const { authRateLimit: testAuthRateLimit } = require('../../src/middleware/rateLimiter');
      
      app.use('/auth', testAuthRateLimit);
      app.post('/auth/test', (req, res) => {
        res.json({ success: true });
      });

      // First request should succeed
      await request(app)
        .post('/auth/test')
        .expect(200);

      // Second request should be rate limited
      const response = await request(app)
        .post('/auth/test')
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('RATE_LIMIT_EXCEEDED');
    });

    test('should include rate limit headers', async () => {
      app.use('/auth', authRateLimit);
      app.post('/auth/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/auth/test')
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('General Rate Limiter', () => {
    test('should have higher limits than auth limiter', async () => {
      app.use('/general', generalRateLimit);
      app.get('/general/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/general/test')
        .expect(200);

      const remainingHeader = response.headers['x-ratelimit-remaining'];
      expect(parseInt(remainingHeader)).toBeGreaterThan(5); // Should be more than default auth limit
    });

    test('should skip successful requests when configured', () => {
      const config = rateLimitConfig.getGeneralConfig();
      expect(config.skipSuccessfulRequests).toBe(true);
    });
  });

  describe('Strict Rate Limiter', () => {
    test('should have lower limits than auth limiter', () => {
      const authConfig = rateLimitConfig.getAuthConfig();
      const strictConfig = rateLimitConfig.getStrictConfig();
      
      expect(strictConfig.max).toBeLessThanOrEqual(authConfig.max);
    });

    test('should use user ID in key generation when user is authenticated', () => {
      const config = rateLimitConfig.getStrictConfig();
      const mockReq = {
        ip: '127.0.0.1',
        user: { id: 'user123' },
        headers: { 'user-agent': 'test-agent' }
      };

      const key = config.keyGenerator(mockReq);
      expect(key).toContain('user123');
    });

    test('should handle anonymous users in key generation', () => {
      const config = rateLimitConfig.getStrictConfig();
      const mockReq = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' }
      };

      const key = config.keyGenerator(mockReq);
      expect(key).toContain('anonymous');
    });
  });

  describe('Custom Rate Limiter', () => {
    test('should create custom rate limiter with merged options', () => {
      const customLimiter = createRateLimit({
        max: 100,
        windowMs: 30000
      });

      expect(typeof customLimiter).toBe('function');
    });

    test('should override default options with custom options', async () => {
      const customLimiter = createRateLimit({
        max: 2,
        windowMs: 60000,
        message: { custom: true }
      });

      app.use('/custom', customLimiter);
      app.get('/custom/test', (req, res) => {
        res.json({ success: true });
      });

      // Should allow 2 requests
      await request(app).get('/custom/test').expect(200);
      await request(app).get('/custom/test').expect(200);

      // Third request should be blocked with custom message
      const response = await request(app).get('/custom/test').expect(429);
      expect(response.body.custom).toBe(true);
    });
  });

  describe('Key Generation', () => {
    test('should generate unique keys for different IPs', () => {
      const config = rateLimitConfig.getAuthConfig();
      
      const req1 = { ip: '127.0.0.1', headers: { 'user-agent': 'test' } };
      const req2 = { ip: '192.168.1.1', headers: { 'user-agent': 'test' } };

      const key1 = config.keyGenerator(req1);
      const key2 = config.keyGenerator(req2);

      expect(key1).not.toBe(key2);
    });

    test('should generate unique keys for different user agents', () => {
      const config = rateLimitConfig.getAuthConfig();
      
      const req1 = { ip: '127.0.0.1', headers: { 'user-agent': 'browser1' } };
      const req2 = { ip: '127.0.0.1', headers: { 'user-agent': 'browser2' } };

      const key1 = config.keyGenerator(req1);
      const key2 = config.keyGenerator(req2);

      expect(key1).not.toBe(key2);
    });

    test('should handle missing user agent gracefully', () => {
      const config = rateLimitConfig.getAuthConfig();
      const req = { ip: '127.0.0.1', headers: {} };

      const key = config.keyGenerator(req);
      expect(key).toContain('unknown');
    });
  });
});