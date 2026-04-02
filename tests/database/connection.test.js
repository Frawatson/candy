const { initializeDatabase, getDatabase, query, getClient, transaction, closeDatabase, healthCheck } = require('../../src/database/connection');
const databasePool = require('../../src/database/pool');
const { getDatabaseConfig } = require('../../src/config/database');

// Mock dependencies
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../src/config/database');
jest.mock('../../src/utils/databaseHealth');

// Mock pg Pool
const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockEnd = jest.fn();
const mockRelease = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockQuery,
    connect: mockConnect,
    end: mockEnd,
    on: jest.fn(),
    totalCount: 5,
    idleCount: 3,
    waitingCount: 0
  }))
}));

describe('Database Connection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset database pool
    databasePool.pool = null;
    databasePool.isInitialized = false;
    
    // Mock database config using environment variables or mock values
    getDatabaseConfig.mockReturnValue({
      host: process.env.TEST_DATABASE_HOST || 'localhost',
      port: parseInt(process.env.TEST_DATABASE_PORT) || 5432,
      database: process.env.TEST_DATABASE_NAME || 'test_db',
      user: process.env.TEST_DATABASE_USER || 'test_user',
      password: process.env.TEST_DATABASE_PASSWORD || 'mock_password_for_tests',
      max: 10,
      min: 1,
      idleTimeoutMillis: 30000
    });
  });

  afterEach(async () => {
    try {
      if (databasePool.isInitialized) {
        await closeDatabase();
      }
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('initializeDatabase', () => {
    it('should initialize database connection successfully', async () => {
      // Mock successful health check
      const { waitForDatabase } = require('../../src/utils/databaseHealth');
      waitForDatabase.mockResolvedValue(true);

      const pool = await initializeDatabase();

      expect(pool).toBeDefined();
      expect(databasePool.isInitialized).toBe(true);
      expect(getDatabaseConfig).toHaveBeenCalled();
    });

    it('should handle database initialization failure', async () => {
      // Mock failed health check
      const { waitForDatabase } = require('../../src/utils/databaseHealth');
      waitForDatabase.mockResolvedValue(false);

      await expect(initializeDatabase()).rejects.toThrow(
        'Database connection could not be established after multiple attempts'
      );
    });

    it('should handle invalid configuration', async () => {
      // Mock validation failure
      const { validateDatabaseConfig } = require('../../src/utils/databaseHealth');
      validateDatabaseConfig.mockReturnValue({
        valid: false,
        errors: ['Database host is required']
      });

      await expect(initializeDatabase()).rejects.toThrow(
        'Invalid database configuration: Database host is required'
      );
    });
  });

  describe('getDatabase', () => {
    it('should return initialized database pool', async () => {
      const { waitForDatabase } = require('../../src/utils/databaseHealth');
      waitForDatabase.mockResolvedValue(true);

      await initializeDatabase();
      const pool = getDatabase();

      expect(pool).toBeDefined();
    });

    it('should throw error if database not initialized', () => {
      expect(() => getDatabase()).toThrow(
        'Database pool not initialized. Call initialize() first.'
      );
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      const { waitForDatabase } = require('../../src/utils/databaseHealth');
      waitForDatabase.mockResolvedValue(true);
      await initializeDatabase();
    });

    it('should execute query successfully', async () => {
      const mockResult = { rows: [{ id: 1, name: 'test' }], rowCount: 1 };
      mockQuery.mockResolvedValue(mockResult);

      const result = await query('SELECT * FROM users WHERE id = $1', [1]);

      expect(result).toEqual(mockResult);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
    });

    it('should handle query errors', async () => {
      const mockError = new Error('Query failed');
      mockQuery.mockRejectedValue(mockError);

      await expect(query('INVALID QUERY', [])).rejects.toThrow('Query failed');
    });
  });

  describe('getClient', () => {
    beforeEach(async () => {
      const { waitForDatabase } = require('../../src/utils/databaseHealth');
      waitForDatabase.mockResolvedValue(true);
      await initializeDatabase();
    });

    it('should return database client', async () => {
      const mockClient = { query: jest.fn(), release: mockRelease };
      mockConnect.mockResolvedValue(mockClient);

      const client = await getClient();

      expect(client).toEqual(mockClient);
      expect(mockConnect).toHaveBeenCalled();
    });

    it('should handle client acquisition errors', async () => {
      const mockError = new Error('Client acquisition failed');
      mockConnect.mockRejectedValue(mockError);

      await expect(getClient()).rejects.toThrow('Client acquisition failed');
    });
  });

  describe('transaction', () => {
    let mockClient;

    beforeEach(async () => {
      const { waitForDatabase } = require('../../src/utils/databaseHealth');
      waitForDatabase.mockResolvedValue(true);
      await initializeDatabase();

      mockClient = {
        query: jest.fn(),
        release: mockRelease
      };
      mockConnect.mockResolvedValue(mockClient);
    });

    it('should execute transaction successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Callback query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const callback = jest.fn().mockResolvedValue({ id: 1 });
      const result = await transaction(callback);

      expect(result).toEqual({ id: 1 });
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK

      const callback = jest.fn().mockRejectedValue(new Error('Transaction failed'));

      await expect(transaction(callback)).rejects.toThrow('Transaction failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    beforeEach(async () => {
      const { waitForDatabase } = require('../../src/utils/databaseHealth');
      waitForDatabase.mockResolvedValue(true);
      await initializeDatabase();
    });

    it('should return true for healthy database', async () => {
      mockQuery.mockResolvedValue({ rows: [{ healthy: 1 }] });

      const isHealthy = await healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith('SELECT 1 as healthy');
    });

    it('should return false for unhealthy database', async () => {
      mockQuery.mockRejectedValue(new Error('Connection failed'));

      const isHealthy = await healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('closeDatabase', () => {
    it('should close database connection successfully', async () => {
      const { waitForDatabase } = require('../../src/utils/databaseHealth');
      waitForDatabase.mockResolvedValue(true);
      
      await initializeDatabase();
      mockEnd.mockResolvedValue(undefined);

      await closeDatabase();

      expect(mockEnd).toHaveBeenCalled();
      expect(databasePool.isInitialized).toBe(false);
    });

    it('should handle close errors gracefully', async () => {
      const { waitForDatabase } = require('../../src/utils/databaseHealth');
      waitForDatabase.mockResolvedValue(true);
      
      await initializeDatabase();
      mockEnd.mockRejectedValue(new Error('Close failed'));

      await expect(closeDatabase()).rejects.toThrow('Close failed');
    });
  });
});