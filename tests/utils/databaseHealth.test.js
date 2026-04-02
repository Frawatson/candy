const { performHealthCheck, validateDatabaseConfig, createHealthCheckMiddleware, waitForDatabase } = require('../../src/utils/databaseHealth');
const databasePool = require('../../src/database/pool');
const logger = require('../../src/utils/logger');

// Mock dependencies
jest.mock('../../src/database/pool');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Database Health Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('performHealthCheck', () => {
    it('should return healthy status when all checks pass', async () => {
      const mockPool = { query: jest.fn() };
      const mockPoolStats = { totalCount: 5, idleCount: 3, waitingCount: 0 };

      databasePool.getPool.mockReturnValue(mockPool);
      databasePool.getPoolStats.mockReturnValue(mockPoolStats);
      databasePool.healthCheck.mockResolvedValue(true);

      const result = await performHealthCheck();

      expect(result).toEqual({
        healthy: true,
        timestamp: expect.any(String),
        checks: {
          connection: true,
          query: true,
          pool: true
        },
        poolStats: mockPoolStats,
        error: null
      });
    });

    it('should return unhealthy status when pool is not available', async () => {
      databasePool.getPool.mockReturnValue(null);

      const result = await performHealthCheck();

      expect(result).toEqual({
        healthy: false,
        timestamp: expect.any(String),
        checks: {
          connection: false,
          query: false,
          pool: false
        },
        poolStats: null,
        error: null
      });
    });

    it('should return unhealthy status when query check fails', async () => {
      const mockPool = { query: jest.fn() };
      const mockPoolStats = { totalCount: 5, idleCount: 3, waitingCount: 0 };

      databasePool.getPool.mockReturnValue(mockPool);
      databasePool.getPoolStats.mockReturnValue(mockPoolStats);
      databasePool.healthCheck.mockResolvedValue(false);

      const result = await performHealthCheck();

      expect(result).toEqual({
        healthy: false,
        timestamp: expect.any(String),
        checks: {
          connection: true,
          query: false,
          pool: true
        },
        poolStats: mockPoolStats,
        error: null
      });
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Database connection failed');
      databasePool.getPool.mockImplementation(() => {
        throw mockError;
      });

      const result = await performHealthCheck();

      expect(result).toEqual({
        healthy: false,
        timestamp: expect.any(String),
        checks: {
          connection: false,
          query: false,
          pool: false
        },
        poolStats: null,
        error: 'Database connection failed'
      });
      expect(logger.error).toHaveBeenCalledWith('Database health check failed:', mockError);
    });
  });

  describe('validateDatabaseConfig', () => {
    it('should validate config with connectionString', () => {
      const config = {
        connectionString: 'postgresql://user:pass@localhost:5432/db'
      };

      const result = validateDatabaseConfig(config);

      expect(result).toEqual({
        valid: true,
        errors: [],
        warnings: []
      });
    });

    it('should validate config with individual parameters', () => {
      const config = {
        host: 'localhost',
        database: 'testdb',
        user: 'testuser',
        password: 'testpass'
      };

      const result = validateDatabaseConfig(config);

      expect(result).toEqual({
        valid: true,
        errors: [],
        warnings: []
      });
    });

    it('should return errors for missing required fields', () => {
      const config = {};

      const result = validateDatabaseConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Either connectionString or host must be provided');
      expect(result.errors).toContain('Database name is required when not using connectionString');
      expect(result.errors).toContain('Database user is required when not using connectionString');
    });

    it('should return warnings for invalid pool configuration', () => {
      const config = {
        connectionString: 'postgresql://user:pass@localhost:5432/db',
        max: 100,
        min: 50,
        idleTimeoutMillis: 500
      };

      const result = validateDatabaseConfig(config);

      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('Pool max connections should be between 1 and 50');
      expect(result.errors).toContain('Pool min connections must be less than max connections');
      expect(result.warnings).toContain('Idle timeout should be at least 1000ms');
    });

    it('should handle edge cases for pool validation', () => {
      const config = {
        connectionString: 'postgresql://user:pass@localhost:5432/db',
        max: 0,
        min: -1
      };

      const result = validateDatabaseConfig(config);

      expect(result.warnings).toContain('Pool max connections should be between 1 and 50');
    });
  });

  describe('createHealthCheckMiddleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {};
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    it('should return healthy status when database is healthy', async () => {
      const mockHealthCheck = {
        healthy: true,
        timestamp: '2023-01-01T00:00:00.000Z',
        checks: { connection: true, query: true, pool: true },
        poolStats: { totalCount: 5, idleCount: 3, waitingCount: 0 },
        error: null
      };

      // Mock performHealthCheck
      jest.doMock('../../src/utils/databaseHealth', () => ({
        ...jest.requireActual('../../src/utils/databaseHealth'),
        performHealthCheck: jest.fn().mockResolvedValue(mockHealthCheck)
      }));

      const { createHealthCheckMiddleware } = require('../../src/utils/databaseHealth');
      const middleware = createHealthCheckMiddleware();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'healthy',
        database: mockHealthCheck
      });
    });

    it('should return unhealthy status when database is unhealthy', async () => {
      const mockHealthCheck = {
        healthy: false,
        timestamp: '2023-01-01T00:00:00.000Z',
        checks: { connection: false, query: false, pool: false },
        poolStats: null,
        error: 'Connection failed'
      };

      // Mock performHealthCheck for this test
      const originalModule = jest.requireActual('../../src/utils/databaseHealth');
      jest.doMock('../../src/utils/databaseHealth', () => ({
        ...originalModule,
        performHealthCheck: jest.fn().mockResolvedValue(mockHealthCheck),
        createHealthCheckMiddleware: originalModule.createHealthCheckMiddleware
      }));

      const { createHealthCheckMiddleware } = require('../../src/utils/databaseHealth');
      const middleware = createHealthCheckMiddleware();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        status: 'unhealthy',
        database: mockHealthCheck
      });
    });

    it('should handle middleware errors', async () => {
      const mockError = new Error('Health check failed');
      
      // Mock performHealthCheck to throw error
      const originalModule = jest.requireActual('../../src/utils/databaseHealth');
      jest.doMock('../../src/utils/databaseHealth', () => ({
        ...originalModule,
        performHealthCheck: jest.fn().mockRejectedValue(mockError),
        createHealthCheckMiddleware: originalModule.createHealthCheckMiddleware
      }));

      const { createHealthCheckMiddleware } = require('../../src/utils/databaseHealth');
      const middleware = createHealthCheckMiddleware();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Health check failed',
        error: 'Health check failed'
      });
      expect(logger.error).toHaveBeenCalledWith('Health check middleware error:', mockError);
    });
  });

  describe('waitForDatabase', () => {
    it('should return true when database becomes available immediately', async () => {
      const mockHealthCheck = { healthy: true };
      
      // Mock performHealthCheck
      const originalModule = jest.requireActual('../../src/utils/databaseHealth');
      jest.doMock('../../src/utils/databaseHealth', () => ({
        ...originalModule,
        performHealthCheck: jest.fn().mockResolvedValue(mockHealthCheck),
        waitForDatabase: originalModule.waitForDatabase
      }));

      const { waitForDatabase } = require('../../src/utils/databaseHealth');
      const result = await waitForDatabase(3, 100);

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Database connection established after 1 attempt(s)');
    });

    it('should return true when database becomes available after retries', async () => {
      const mockHealthChecks = [
        { healthy: false },
        { healthy: false },
        { healthy: true }
      ];
      
      let callCount = 0;
      const originalModule = jest.requireActual('../../src/utils/databaseHealth');
      jest.doMock('../../src/utils/databaseHealth', () => ({
        ...originalModule,
        performHealthCheck: jest.fn().mockImplementation(() => {
          return Promise.resolve(mockHealthChecks[callCount++]);
        }),
        waitForDatabase: originalModule.waitForDatabase
      }));

      const { waitForDatabase } = require('../../src/utils/databaseHealth');
      const result = await waitForDatabase(3, 10);

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Database connection established after 3 attempt(s)');
    });

    it('should return false when database never becomes available', async () => {
      const mockHealthCheck = { healthy: false };
      
      const originalModule = jest.requireActual('../../src/utils/databaseHealth');
      jest.doMock('../../src/utils/databaseHealth', () => ({
        ...originalModule,
        performHealthCheck: jest.fn().mockResolvedValue(mockHealthCheck),
        waitForDatabase: originalModule.waitForDatabase
      }));

      const { waitForDatabase } = require('../../src/utils/databaseHealth');
      const result = await waitForDatabase(3, 10);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Database connection failed after 3 attempts');
    });

    it('should handle health check errors', async () => {
      const mockError = new Error('Health check error');
      
      const originalModule = jest.requireActual('../../src/utils/databaseHealth');
      jest.doMock('../../src/utils/databaseHealth', () => ({
        ...originalModule,
        performHealthCheck: jest.fn().mockRejectedValue(mockError),
        waitForDatabase: originalModule.waitForDatabase
      }));

      const { waitForDatabase } = require('../../src/utils/databaseHealth');
      const result = await waitForDatabase(2, 10);

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Database connection attempt 1/2 failed:', 'Health check error');
      expect(logger.warn).toHaveBeenCalledWith('Database connection attempt 2/2 failed:', 'Health check error');
    });

    it('should use default values for parameters', async () => {
      const mockHealthCheck = { healthy: true };
      
      const originalModule = jest.requireActual('../../src/utils/databaseHealth');
      jest.doMock('../../src/utils/databaseHealth', () => ({
        ...originalModule,
        performHealthCheck: jest.fn().mockResolvedValue(mockHealthCheck),
        waitForDatabase: originalModule.waitForDatabase
      }));

      const { waitForDatabase } = require('../../src/utils/databaseHealth');
      const result = await waitForDatabase();

      expect(result).toBe(true);
    });
  });
});