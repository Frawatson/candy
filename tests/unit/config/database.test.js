const { Pool } = require('pg');
const logger = require('../../../src/utils/logger');

// Mock the logger
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

describe('Database Configuration', () => {
  let mockPool;
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env;
    mockPool = {
      connect: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      totalCount: 5,
      idleCount: 3,
      waitingCount: 0
    };
    Pool.mockImplementation(() => mockPool);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('Configuration Initialization', () => {
    it('should use default configuration values when environment variables are not set', () => {
      process.env = { ...originalEnv };
      delete process.env.DB_POOL_SIZE;
      delete process.env.DB_POOL_MIN;
      delete process.env.DB_IDLE_TIMEOUT;

      const { databaseConfig } = require('../../../src/config/database');

      expect(databaseConfig.max).toBe(20);
      expect(databaseConfig.min).toBe(5);
      expect(databaseConfig.idleTimeoutMillis).toBe(30000);
      expect(databaseConfig.connectionTimeoutMillis).toBe(10000);
      expect(databaseConfig.maxUses).toBe(7500);
    });

    it('should use environment variables when available', () => {
      process.env = {
        ...originalEnv,
        DB_POOL_SIZE: '25',
        DB_POOL_MIN: '10',
        DB_IDLE_TIMEOUT: '45000',
        DB_CONNECTION_TIMEOUT: '15000',
        DB_MAX_USES: '5000',
        DATABASE_HOST: 'test-host',
        DATABASE_PORT: '5433',
        DATABASE_NAME: 'test_db',
        DATABASE_USER: 'test_user',
        DATABASE_PASSWORD: 'test_pass'
      };

      const { databaseConfig } = require('../../../src/config/database');

      expect(databaseConfig.max).toBe(25);
      expect(databaseConfig.min).toBe(10);
      expect(databaseConfig.idleTimeoutMillis).toBe(45000);
      expect(databaseConfig.connectionTimeoutMillis).toBe(15000);
      expect(databaseConfig.maxUses).toBe(5000);
      expect(databaseConfig.host).toBe('test-host');
      expect(databaseConfig.port).toBe(5433);
      expect(databaseConfig.database).toBe('test_db');
      expect(databaseConfig.user).toBe('test_user');
      expect(databaseConfig.password).toBe('test_pass');
    });

    it('should configure SSL for production environment', () => {
      process.env = { ...originalEnv, NODE_ENV: 'production' };

      const { databaseConfig } = require('../../../src/config/database');

      expect(databaseConfig.ssl).toEqual({
        rejectUnauthorized: true
      });
    });

    it('should disable SSL for non-production environment', () => {
      process.env = { ...originalEnv, NODE_ENV: 'development' };

      const { databaseConfig } = require('../../../src/config/database');

      expect(databaseConfig.ssl).toBe(false);
    });

    it('should respect DB_SSL_REJECT_UNAUTHORIZED setting in production', () => {
      process.env = { 
        ...originalEnv, 
        NODE_ENV: 'production',
        DB_SSL_REJECT_UNAUTHORIZED: 'false'
      };

      const { databaseConfig } = require('../../../src/config/database');

      expect(databaseConfig.ssl).toEqual({
        rejectUnauthorized: false
      });
    });

    it('should set allowExitOnIdle correctly based on environment', () => {
      process.env = { ...originalEnv, NODE_ENV: 'production' };
      const { databaseConfig: prodConfig } = require('../../../src/config/database');
      expect(prodConfig.allowExitOnIdle).toBe(false);

      jest.resetModules();
      process.env = { ...originalEnv, NODE_ENV: 'development' };
      const { databaseConfig: devConfig } = require('../../../src/config/database');
      expect(devConfig.allowExitOnIdle).toBe(true);
    });
  });

  describe('Connection Retry Logic', () => {
    let connectWithRetry;
    let mockClient;

    beforeEach(() => {
      mockClient = { release: jest.fn() };
      const { connectWithRetry: retry } = require('../../../src/config/database');
      connectWithRetry = retry;
    });

    it('should connect successfully on first attempt', async () => {
      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await connectWithRetry();

      expect(result).toBe(true);
      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Database connection established successfully');
    });

    it('should retry on connection failure and eventually succeed', async () => {
      mockPool.connect
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(mockClient);

      const result = await connectWithRetry(5, 10);

      expect(result).toBe(true);
      expect(mockPool.connect).toHaveBeenCalledTimes(3);
      expect(logger.error).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries exceeded', async () => {
      const connectionError = new Error('Connection refused');
      mockPool.connect.mockRejectedValue(connectionError);

      await expect(connectWithRetry(3, 10)).rejects.toThrow(
        'Failed to connect to database after 3 attempts: Connection refused'
      );

      expect(mockPool.connect).toHaveBeenCalledTimes(3);
      expect(logger.error).toHaveBeenCalledTimes(3);
    });

    it('should implement exponential backoff', async () => {
      const connectionError = new Error('Connection refused');
      mockPool.connect.mockRejectedValue(connectionError);

      const startTime = Date.now();
      
      try {
        await connectWithRetry(2, 100);
      } catch (error) {
        // Should have waited at least 100ms for first retry
        // Second retry should wait 200ms (100 * 2^1)
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeGreaterThanOrEqual(300); // 100 + 200 = 300ms minimum
      }
    });
  });

  describe('Pool Event Handlers', () => {
    beforeEach(() => {
      require('../../../src/config/database');
    });

    it('should register event handlers on pool creation', () => {
      expect(mockPool.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('acquire', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('remove', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should log pool statistics on connect event', () => {
      const connectHandler = mockPool.on.mock.calls.find(call => call[0] === 'connect')[1];
      const mockClient = {};

      connectHandler(mockClient);

      expect(logger.info).toHaveBeenCalledWith('New database client connected', {
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0
      });
    });

    it('should log pool statistics on acquire event', () => {
      const acquireHandler = mockPool.on.mock.calls.find(call => call[0] === 'acquire')[1];
      const mockClient = {};

      acquireHandler(mockClient);

      expect(logger.debug).toHaveBeenCalledWith('Client acquired from pool', {
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0
      });
    });

    it('should log error details on pool error', () => {
      const errorHandler = mockPool.on.mock.calls.find(call => call[0] === 'error')[1];
      const mockError = { message: 'Pool error', stack: 'error stack' };

      errorHandler(mockError);

      expect(logger.error).toHaveBeenCalledWith('Unexpected database pool error', {
        error: 'Pool error',
        stack: 'error stack',
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0
      });
    });
  });

  describe('Graceful Shutdown', () => {
    let gracefulShutdown;

    beforeEach(() => {
      const { gracefulShutdown: shutdown } = require('../../../src/config/database');
      gracefulShutdown = shutdown;
    });

    it('should close pool successfully during graceful shutdown', async () => {
      mockPool.end.mockResolvedValue();

      await gracefulShutdown();

      expect(mockPool.end).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Shutting down database connection pool...');
      expect(logger.info).toHaveBeenCalledWith('Database connection pool closed successfully');
    });

    it('should handle errors during graceful shutdown', async () => {
      const shutdownError = new Error('Failed to close pool');
      mockPool.end.mockRejectedValue(shutdownError);

      await gracefulShutdown();

      expect(logger.error).toHaveBeenCalledWith('Error closing database connection pool', {
        error: 'Failed to close pool',
        stack: shutdownError.stack
      });
    });
  });
});