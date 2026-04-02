const { Pool } = require('pg');
const databaseConnection = require('../../../src/database/connection');
const { pool, databaseConfig, connectWithRetry } = require('../../../src/config/database');
const ConnectionPoolMonitor = require('../../../src/utils/connectionPoolMonitor');

// Mock the logger to avoid console output during tests
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn()
}));

describe('Database Connection Pool', () => {
  let mockPool;
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn()
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      end: jest.fn().mockResolvedValue(),
      query: jest.fn(),
      on: jest.fn(),
      totalCount: 5,
      idleCount: 3,
      waitingCount: 0,
      options: {
        max: 20,
        min: 5
      }
    };

    Pool.mockImplementation(() => mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Configuration', () => {
    it('should have correct default configuration values', () => {
      expect(databaseConfig.max).toBe(20);
      expect(databaseConfig.min).toBe(5);
      expect(databaseConfig.idleTimeoutMillis).toBe(30000);
      expect(databaseConfig.connectionTimeoutMillis).toBe(10000);
      expect(databaseConfig.maxUses).toBe(7500);
    });

    it('should use environment variables when available', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        DB_POOL_SIZE: '25',
        DB_POOL_MIN: '10',
        DB_IDLE_TIMEOUT: '45000'
      };

      // Re-require the module to pick up new env vars
      jest.resetModules();
      const { databaseConfig: newConfig } = require('../../../src/config/database');

      expect(newConfig.max).toBe(25);
      expect(newConfig.min).toBe(10);
      expect(newConfig.idleTimeoutMillis).toBe(45000);

      process.env = originalEnv;
    });

    it('should configure SSL for production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      jest.resetModules();
      const { databaseConfig: prodConfig } = require('../../../src/config/database');

      expect(prodConfig.ssl).toBeTruthy();
      expect(prodConfig.ssl.rejectUnauthorized).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Connection Pool Operations', () => {
    it('should execute queries successfully', async () => {
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await databaseConnection.query('SELECT * FROM users WHERE id = $1', [1]);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should handle query errors and release connection', async () => {
      const mockError = new Error('Query failed');
      mockClient.query.mockRejectedValue(mockError);

      await expect(
        databaseConnection.query('SELECT * FROM invalid_table')
      ).rejects.toThrow('Query failed');

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should execute transactions successfully', async () => {
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce(mockResult) // Actual query
        .mockResolvedValueOnce(); // COMMIT

      const result = await databaseConnection.transaction(async (client) => {
        return await client.query('INSERT INTO users (name) VALUES ($1)', ['test']);
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transactions on error', async () => {
      const mockError = new Error('Transaction failed');
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockRejectedValueOnce(mockError) // Failing query
        .mockResolvedValueOnce(); // ROLLBACK

      await expect(
        databaseConnection.transaction(async (client) => {
          throw mockError;
        })
      ).rejects.toThrow('Transaction failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when database is accessible', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ health_check: 1 }] });

      const healthResult = await databaseConnection.healthCheck();

      expect(healthResult.healthy).toBe(true);
      expect(healthResult.responseTime).toBeGreaterThan(0);
      expect(healthResult.timestamp).toBeInstanceOf(Date);
      expect(healthResult.poolStats).toBeDefined();
    });

    it('should return unhealthy status when database is not accessible', async () => {
      const mockError = new Error('Connection failed');
      mockClient.query.mockRejectedValue(mockError);

      const healthResult = await databaseConnection.healthCheck();

      expect(healthResult.healthy).toBe(false);
      expect(healthResult.error).toBe('Connection failed');
      expect(healthResult.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Connection Retry Logic', () => {
    it('should successfully connect on first attempt', async () => {
      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await connectWithRetry(3, 100);

      expect(result).toBe(true);
      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should retry on connection failure and eventually succeed', async () => {
      mockPool.connect
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(mockClient);

      const result = await connectWithRetry(3, 10);

      expect(result).toBe(true);
      expect(mockPool.connect).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries exceeded', async () => {
      mockPool.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(connectWithRetry(2, 10)).rejects.toThrow(
        'Failed to connect to database after 2 attempts'
      );

      expect(mockPool.connect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Pool Statistics', () => {
    it('should return accurate pool statistics', () => {
      const stats = databaseConnection.getPoolStats();

      expect(stats).toEqual({
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0,
        maxConnections: 20,
        minConnections: 5
      });
    });
  });
});

describe('Connection Pool Monitor', () => {
  let poolMonitor;
  let mockPool;

  beforeEach(() => {
    mockPool = {
      totalCount: 5,
      idleCount: 3,
      waitingCount: 0,
      options: { max: 20, min: 5 }
    };

    poolMonitor = new ConnectionPoolMonitor(mockPool);
  });

  afterEach(() => {
    if (poolMonitor.loggingInterval) {
      poolMonitor.stopPeriodicLogging();
    }
  });

  describe('Query Metrics', () => {
    it('should record successful queries', () => {
      poolMonitor.recordQuery(150, true);
      poolMonitor.recordQuery(200, true);

      const metrics = poolMonitor.getMetrics();

      expect(metrics.totalQueries).toBe(2);
      expect(metrics.successfulQueries).toBe(2);
      expect(metrics.failedQueries).toBe(0);
      expect(metrics.averageQueryTime).toBe(175);
      expect(metrics.maxQueryTime).toBe(200);
      expect(metrics.minQueryTime).toBe(150);
    });

    it('should record failed queries', () => {
      poolMonitor.recordQuery(150, true);
      poolMonitor.recordQuery(300, false);

      const metrics = poolMonitor.getMetrics();

      expect(metrics.totalQueries).toBe(2);
      expect(metrics.successfulQueries).toBe(1);
      expect(metrics.failedQueries).toBe(1);
      expect(metrics.successRate).toBe(50);
    });

    it('should maintain limited query time history', () => {
      // Record more than maxQueryTimesSample queries
      for (let i = 0; i < 150; i++) {
        poolMonitor.recordQuery(100 + i, true);
      }

      expect(poolMonitor.queryTimes.length).toBe(100);
      expect(poolMonitor.queryTimes[0]).toBe(150); // First 50 should be removed
    });
  });

  describe('Health Assessment', () => {
    it('should assess pool as healthy under normal conditions', () => {
      poolMonitor.recordQuery(100, true);