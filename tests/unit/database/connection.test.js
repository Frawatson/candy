const databaseConnection = require('../../../src/database/connection');
const { pool } = require('../../../src/config/database');
const logger = require('../../../src/utils/logger');

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  pool: {
    connect: jest.fn(),
    totalCount: 5,
    idleCount: 3,
    waitingCount: 0,
    options: { max: 20, min: 5 }
  },
  connectWithRetry: jest.fn()
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

describe('DatabaseConnection', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    pool.connect.mockResolvedValue(mockClient);
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (databaseConnection.healthCheckInterval) {
      databaseConnection.stopHealthMonitoring();
    }
  });

  describe('Query Execution', () => {
    it('should execute queries successfully and release connection', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'test' }],
        rowCount: 1,
        command: 'SELECT'
      };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await databaseConnection.query('SELECT * FROM users WHERE id = $1', [1]);

      expect(pool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
      expect(logger.debug).toHaveBeenCalledWith('Database query executed', {
        duration: expect.any(Number),
        rowCount: 1,
        command: 'SELECT'
      });
    });

    it('should handle query errors and still release connection', async () => {
      const queryError = new Error('Query failed');
      mockClient.query.mockRejectedValue(queryError);

      await expect(
        databaseConnection.query('SELECT * FROM invalid_table')
      ).rejects.toThrow('Query failed');

      expect(mockClient.release).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Database query failed', {
        error: 'Query failed',
        duration: expect.any(Number),
        query: 'SELECT * FROM invalid_table',
        params: '[]'
      });
    });

    it('should truncate long queries in error logs', async () => {
      const longQuery = 'SELECT * FROM users WHERE ' + 'a'.repeat(200);
      const queryError = new Error('Query failed');
      mockClient.query.mockRejectedValue(queryError);

      await expect(
        databaseConnection.query(longQuery, ['param1'])
      ).rejects.toThrow('Query failed');

      expect(logger.error).toHaveBeenCalledWith('Database query failed', {
        error: 'Query failed',
        duration: expect.any(Number),
        query: longQuery.substring(0, 100) + '...',
        params: '[PARAMS_PROVIDED]'
      });
    });

    it('should handle connection acquisition failures', async () => {
      const connectionError = new Error('Connection failed');
      pool.connect.mockRejectedValue(connectionError);

      await expect(
        databaseConnection.query('SELECT 1')
      ).rejects.toThrow('Connection failed');

      expect(mockClient.release).not.toHaveBeenCalled();
    });
  });

  describe('Transaction Handling', () => {
    it('should execute transactions successfully', async () => {
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce(mockResult) // User query
        .mockResolvedValueOnce(); // COMMIT

      const callback = jest.fn().mockResolvedValue(mockResult);
      const result = await databaseConnection.transaction(callback);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
      expect(logger.debug).toHaveBeenCalledWith('Database transaction completed', {
        duration: expect.any(Number)
      });
    });

    it('should rollback transaction on callback error', async () => {
      const transactionError = new Error('Transaction callback failed');
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce(); // ROLLBACK

      const callback = jest.fn().mockRejectedValue(transactionError);

      await expect(
        databaseConnection.transaction(callback)
      ).rejects.toThrow('Transaction callback failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Database transaction failed and rolled back', {
        error: 'Transaction callback failed',
        duration: expect.any(Number)
      });
    });

    it('should rollback transaction on query error within callback', async () => {
      const queryError = new Error('Query within transaction failed');
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockRejectedValueOnce(queryError) // Failing query in callback
        .mockResolvedValueOnce(); // ROLLBACK

      const callback = async (client) => {
        await client.query('INSERT INTO users (name) VALUES ($1)', ['test']);
      };

      await expect(
        databaseConnection.transaction(callback)
      ).rejects.toThrow('Query within transaction failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should handle connection acquisition failure for transactions', async () => {
      const connectionError = new Error('Cannot acquire connection');
      pool.connect.mockRejectedValue(connectionError);

      await expect(
        databaseConnection.transaction(async () => {})
      ).rejects.toThrow('Cannot acquire connection');
    });
  });

  describe('Health Check', () => {
    beforeEach(() => {
      databaseConnection.isHealthy = false;
      databaseConnection.lastHealthCheck = null;
    });

    it('should return healthy status when database responds correctly', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ health_check: 1 }] });

      const healthResult = await databaseConnection.healthCheck();

      expect(healthResult.healthy).toBe(true);
      expect(healthResult.responseTime).toBeGreaterThan(0);
      expect(healthResult.timestamp).toBeInstanceOf(Date);
      expect(healthResult.poolStats).toEqual({
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0,
        maxConnections: 20,
        minConnections: 5
      });
      expect(databaseConnection.isHealthy).toBe(true);
      expect(databaseConnection.lastHealthCheck).toBeInstanceOf(Date);
    });

    it('should return unhealthy status when database query fails', async () => {
      const healthError = new Error('Health check query failed');
      mockClient.query.mockRejectedValue(healthError);

      const healthResult = await databaseConnection.healthCheck();

      expect(healthResult.healthy).toBe(false);
      expect(healthResult.error).toBe('Health check query failed');
      expect(healthResult.timestamp).toBeInstanceOf(Date);
      expect(databaseConnection.isHealthy).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Database health check failed', {
        error: 'Health check query failed',
        timestamp: expect.any(Date)
      });
    });

    it('should return unhealthy status when no rows returned', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const healthResult = await databaseConnection.healthCheck();

      expect(healthResult.healthy).toBe(false);
      expect(databaseConnection.isHealthy).toBe(false);
    });

    it('should log debug information on successful health check', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ health_check: 1 }] });

      await databaseConnection.healthCheck();

      expect(logger.debug).toHaveBeenCalledWith('Database health check completed', {
        healthy: true,
        duration: expect.any(Number),
        totalConnections: 5,
        idleConnections: 3,
        waitingCount: 0
      });
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

  describe('Health Monitoring', () => {
    it('should start health monitoring with interval', () => {
      jest.useFakeTimers();
      const healthCheckSpy = jest.spyOn(databaseConnection, 'healthCheck').mockResolvedValue({});

      databaseConnection.startHealthMonitoring();

      expect(databaseConnection.healthCheckInterval).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith('Database health monitoring started');

      // Fast-forward time and verify health check is called
      jest.advanceTimersByTime(30000);
      expect(healthCheckSpy).toHaveBeenCalled();

      jest.useRealTimers();
      healthCheckSpy.mockRestore();
    });

    it('should stop health monitoring', () => {
      databaseConnection.healthCheckInterval = setInterval(() => {}, 1000);

      databaseConnection.stopHealthMonitoring();

      expect(databaseConnection.healthCheckInterval).toBeNull();
      expect(logger.info).toHaveBeenCalledWith('Database health monitoring stopped');
    });

    it('should handle stopping monitoring when no interval is set', () => {
      databaseConnection.healthCheckInterval = null;

      expect(() => databaseConnection.stopHealthMonitoring()).not.toThrow();
    });
  });

  describe('Connection Cleanup', () => {
    it('should stop monitoring and close pool on close', async () => {
      const stopMonitoringSpy = jest.spyOn(databaseConnection, 'stopHealthMonitoring');
      const mockEnd = jest.fn().mockResolvedValue();
      databaseConnection.pool.end = mockEnd;

      await databaseConnection.close();

      expect(stopMonitoringSpy).toHaveBeenCalled();
      expect(mockEnd).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Database connection closed');

      stopMonitoringSpy.mockRestore();
    });
  });
});