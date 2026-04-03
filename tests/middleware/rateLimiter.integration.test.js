const request = require('supertest');
const express = require('express');
const { 
  authRateLimit, 
  generalRateLimit, 
  strictRateLimit,
  createRateLimit 
} = require('../../src/middleware/rateLimiter');

// Mock environment variables
const originalEnv = process.env;

describe('Rate Limiter Integration Tests', () => {
  let app;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    
    app = express();
    app.use(express.json());
    app.set('trust proxy', 1);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Auth Rate Limiter Integration', () => {
    test('should allow requests within the configured limit', async () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '3';
      process.env.RATE_LIMIT_WINDOW_MS = '60000';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      delete require.cache[require.resolve('../../src/middleware/rateLimiter')];
      
      const { authRateLimit: testAuthRateLimit } = require('../../src/middleware/rateLimiter');

      app.use('/auth', testAuthRateLimit);
      app.post('/auth/login', (req, res) => {
        res.json({ success: true, message: 'Login successful' });
      });

      // First request should succeed
      const response1 = await request(app)
        .post('/auth/login')
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response1.headers['x-ratelimit-remaining']).toBe('2');

      // Second request should succeed
      const response2 = await request(app)
        .post('/auth/login')
        .expect(200);

      expect(response2.body.success).toBe(true);
      expect(response2.headers['x-ratelimit-remaining']).toBe('1');

      // Third request should succeed
      const response3 = await request(app)
        .post('/auth/login')
        .expect(200);

      expect(response3.body.success).toBe(true);
      expect(response3.headers['x-ratelimit-remaining']).toBe('0');
    });

    test('should block requests exceeding the configured limit', async () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '2';
      process.env.RATE_LIMIT_WINDOW_MS = '60000';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      delete require.cache[require.resolve('../../src/middleware/rateLimiter')];
      
      const { authRateLimit: testAuthRateLimit } = require('../../src/middleware/rateLimiter');

      app.use('/auth', testAuthRateLimit);
      app.post('/auth/login', (req, res) => {
        res.json({ success: true, message: 'Login successful' });
      });

      // Exhaust the limit
      await request(app).post('/auth/login').expect(200);
      await request(app).post('/auth/login').expect(200);

      // This should be rate limited
      const response = await request(app)
        .post('/auth/login')
        .expect(429);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('Too many authentication attempts'),
        error: 'RATE_LIMIT_EXCEEDED'
      });
    });

    test('should differentiate between different IP addresses', async () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '1';
      process.env.RATE_LIMIT_WINDOW_MS = '60000';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      delete require.cache[require.resolve('../../src/middleware/rateLimiter')];
      
      const { authRateLimit: testAuthRateLimit } = require('../../src/middleware/rateLimiter');

      app.use('/auth', testAuthRateLimit);
      app.post('/auth/login', (req, res) => {
        res.json({ success: true, message: 'Login successful' });
      });

      // First IP exhausts its limit
      await request(app)
        .post('/auth/login')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(200);

      await request(app)
        .post('/auth/login')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(429);

      // Different IP should still be allowed
      await request(app)
        .post('/auth/login')
        .set('X-Forwarded-For', '192.168.1.2')
        .expect(200);
    });

    test('should include proper rate limit headers', async () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '5';
      process.env.RATE_LIMIT_WINDOW_MS = '60000';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      delete require.cache[require.resolve('../../src/middleware/rateLimiter')];
      
      const { authRateLimit: testAuthRateLimit } = require('../../src/middleware/rateLimiter');

      app.use('/auth', testAuthRateLimit);
      app.post('/auth/login', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/auth/login')
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit', '5');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining', '4');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
      
      // Should not have legacy headers
      expect(response.headers).not.toHaveProperty('x-ratelimit-limit-remaining');
    });

    test('should track both successful and failed requests', async () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '2';
      process.env.RATE_LIMIT_WINDOW_MS = '60000';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      delete require.cache[require.resolve('../../src/middleware/rateLimiter')];
      
      const { authRateLimit: testAuthRateLimit } = require('../../src/middleware/rateLimiter');

      app.use('/auth', testAuthRateLimit);
      app.post('/auth/login', (req, res) => {
        if (req.body.fail) {
          return res.status(401).json({ success: false, message: 'Login failed' });
        }
        res.json({ success: true });
      });

      // Successful request
      await request(app)
        .post('/auth/login')
        .send({})
        .expect(200);

      // Failed request
      await request(app)
        .post('/auth/login')
        .send({ fail: true })
        .expect(401);

      // This should be rate limited (both requests counted)
      await request(app)
        .post('/auth/login')
        .send({})
        .expect(429);
    });
  });

  describe('General Rate Limiter Integration', () => {
    test('should have higher limits than auth rate limiter', async () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '5';
      process.env.RATE_LIMIT_WINDOW_MS = '60000';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      delete require.cache[require.resolve('../../src/middleware/rateLimiter')];
      
      const { generalRateLimit: testGeneralRateLimit } = require('../../src/middleware/rateLimiter');

      app.use('/api', testGeneralRateLimit);
      app.get('/api/data', (req, res) => {
        res.json({ data: 'test' });
      });

      const response = await request(app)
        .get('/api/data')
        .expect(200);

      // General limit should be 10x auth limit (5 * 10 = 50)
      expect(response.headers['x-ratelimit-limit']).toBe('50');
      expect(response.headers['x-ratelimit-remaining']).toBe('49');
    });

    test('should skip successful requests when configured', async () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '2';
      process.env.RATE_LIMIT_WINDOW_MS = '60000';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      delete require.cache[require.resolve('../../src/middleware/rateLimiter')];
      
      const { generalRateLimit: testGeneralRateLimit } = require('../../src/middleware/rateLimiter');

      app.use('/api', testGeneralRateLimit);
      app.get('/api/data', (req, res) => {
        if (req.query.fail) {
          return res.status(500).json({ error: 'Server error' });
        }
        res.json({ data: 'test' });
      });

      // Multiple successful requests should not count against limit
      await request(app).get('/api/data').expect(200);
      await request(app).get('/api/data').expect(200);
      await request(app).get('/api/data').expect(200);

      // Failed requests should count
      const response1 = await request(app).get('/api/data?fail=true').expect(500);
      expect(response1.headers['x-ratelimit-remaining']).toBe('19'); // 20 - 1

      const response2 = await request(app).get('/api/data?fail=true').expect(500);
      expect(response2.headers['x-ratelimit-remaining']).toBe('18'); // 20 - 2
    });

    test('should use only IP address for key generation', async () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '1';
      process.env.RATE_LIMIT_WINDOW_MS = '60000';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      delete require.cache[require.resolve('../../src/middleware/rateLimiter')];
      
      const { generalRateLimit: testGeneralRateLimit } = require('../../src/middleware/rateLimiter');

      app.use('/api', testGeneralRateLimit);
      app.get('/api/data', (req, res) => {
        res.status(500).json({ error: 'test' });
      });

      // Exhaust limit with one user agent
      await request(app)
        .get('/api/data')
        .set('User-Agent', 'Browser1')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(500);

      // Different user agent, same IP should be rate limited
      await request(app)
        .get('/api/data')
        .set('User-Agent', 'Browser2')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(429);
    });
  });

  describe('Strict Rate Limiter Integration', () => {
    test('should have lower limits than auth rate limiter', async () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '6';
      process.env.RATE_LIMIT_WINDOW_MS = '60000';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      delete require.cache[require.resolve('../../src/middleware/rateLimiter')];
      
      const { strictRateLimit: testStrictRateLimit } = require('../../src/middleware/rateLimiter');

      app.use('/sensitive', testStrictRateLimit);
      app.post('/sensitive/operation', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/sensitive/operation')
        .expect(200);

      // Strict limit should be half of auth limit (6 / 2 = 3)
      expect(response.headers['x-ratelimit-limit']).toBe('3');
      expect(response.headers['x-ratelimit-remaining']).toBe('2');
    });

    test('should track both successful and failed requests', async () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '4';
      process.env.RATE_LIMIT_WINDOW_MS = '60000';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      delete require.cache[require.resolve('../../src/middleware/rateLimiter')];
      
      const { strictRateLimit: testStrictRateLimit } = require('../../src/middleware/rateLimiter');

      app.use('/sensitive', testStrictRateLimit);
      app.post('/sensitive/operation', (req, res) => {
        if (req.body.fail) {
          return res.status(400).json({ error: 'Bad request' });
        }
        res.json({ success: true });
      });

      // Successful request (limit is 2 for strict)
      await request(app)
        .post('/sensitive/operation')
        .send({})
        .expect(200);

      // Failed request
      await request(app)
        .post('/sensitive/operation')
        .send({ fail: true })
        .expect(400);

      // This should be rate limited
      await request(app)
        .post('/sensitive/operation')
        .send({})
        .expect(429);
    });

    test('should include user ID in key generation when authenticated', async () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '2';
      process.env.RATE_LIMIT_WINDOW_MS = '60000';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      delete require.cache[require.resolve('../../src/middleware/rateLimiter')];
      
      const { strictRateLimit: testStrictRateLimit } = require('../../src/middleware/rateLimiter');

      // Mock auth middleware that adds user to request
      const mockAuth = (req, res, next) => {
        if (req.headers.authorization) {
          req.user = { id: req.headers.authorization.replace('Bearer ', '') };
        }
        next();
      };

      app.use('/sensitive', mockAuth, testStrictRateLimit);
      app.post('/sensitive/operation', (req, res) => {
        res.json({ success: true });
      });

      // User1 exhausts their limit
      await request(app)
        .post('/sensitive/operation')
        .set('Authorization', 'Bearer user1')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(200);

      await request(app)
        .post('/sensitive/operation')
        .set('Authorization', 'Bearer user1')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(429);

      // User2 with same IP should still be allowed
      await request(app)
        .post('/sensitive/operation')
        .set('Authorization', 'Bearer user2')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(200);
    });

    test('should handle anonymous users appropriately', async () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '2';
      process.env.RATE_LIMIT_WINDOW_MS = '60000';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      delete require.cache[require.resolve('../../src/middleware/rateLimiter')];
      
      const { strictRateLimit: testStrictRateLimit } = require('../../src/middleware/rateLimiter');

      app.use('/sensitive', testStrictRateLimit);
      app.post('/sensitive/operation', (req, res) => {
        res.json({ success: true });
      });

      // Anonymous user exhausts limit
      await request(app)
        .post('/sensitive/operation')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(200);

      await request(app)
        .post('/sensitive/operation')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(429);
    });

    test('should show appropriate error message for sensitive operations', async () => {
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '2';
      process.env.RATE_LIMIT_WINDOW_MS = '60000';

      delete require.cache[require.resolve('../../src/config/rateLimit')];
      delete require.cache[require.resolve('../../src/middleware/rateLimiter')];
      
      const { strictRateLimit: testStrictRateLimit } = require('../../src/middleware/rateLimiter');

      app.use('/sensitive', testStrictRateLimit);
      app.post('/sensitive/operation', (req, res) => {
        res.json({ success: true });
      });

      // Exhaust the limit
      await request(app).post('/sensitive/operation').expect(200);

      const response = await request(app)
        .post('/sensitive/operation')
        .expect(429);

      expect(response.body