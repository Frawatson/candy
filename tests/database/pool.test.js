const { Pool } = require('pg');
const DatabasePool = require('../../src/database/pool');
const logger = require('../../src/utils/logger');

// Mock dependencies
jest.mock('pg');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('DatabasePool', () => {
  let databasePool;
  let mockPool;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a new instance for each test to avoid state interference
    const DatabasePoolClass = require('../../src/database/pool').constructor;
    databasePool = new DatabasePoolClass();
    
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      totalCount: 5,
      idleCount: 3,
      waitingCount: 0
    };
    
    Pool.mockImplementation(() => mockPool);
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(databasePool.pool).toBeNull();
      expect(databasePool.isInitialized).toBe(false);
    });
  });

  describe('initialize', () => {
    const mockConfig = {
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      user: 'testuser',
      password: 'testpass'
    };

    it('should initialize pool successfully with valid config', () => {
      const pool = databasePool.initialize(mockConfig);

      expect(Pool).toHaveBeenCalledWith(mockConfig);
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('remove', expect.any(Function));
      expect(databasePool.isInitialized).toBe(true);
      expect(pool).toBe(mockPool);
      expect(logger.info).toHaveBeenCalledWith('Database connection pool initialized successfully');
    });

    it('should return existing pool if already initialized', () => {
      databasePool.initialize(mockConfig);
      const secondCall = databasePool.initialize(mockConfig);

      expect(Pool).toHaveBeenCalledTimes(1);
      expect(secondCall).toBe(mockPool);
    });

    it('should handle initialization errors', () => {
      Pool.mockImplementation(() => {
        throw new Error('Pool initialization failed');
      });

      expect(() => databasePool.initialize(mockConfig)).toThrow('Pool initialization failed');
      expect(logger.error).toHaveBeenCalledWith('Failed to initialize database connection pool:', expect.any(Error));
    });

    it('should set up error event handler', () => {
      databasePool.initialize(mockConfig);
      
      const errorHandler = mockPool.on.mock.calls.find(call => call[0] === 'error')[1];
      const mockError = new Error('Pool error');
      
      errorHandler(mockError);
      
      expect(logger.error).toHaveBeenCalledWith('Unexpected error on idle client', mockError);
    });

    it('should set up connect event handler', () => {
      databasePool.initialize(mockConfig);
      
      const connectHandler = mockPool.on.mock.calls.find(call => call[0] === 'connect')[1];
      const mockClient = { id: 'client-123' };
      
      connectHandler(mockClient);
      
      expect(logger.debug).toHaveBeenCalledWith('New client connected to database');
    });

    it('should set up remove event handler', () => {
      databasePool.initialize(mockConfig);
      
      const removeHandler = mockPool.on.mock.calls.find(call => call[0] === 'remove')[1];
      const mockClient = { id: 'client-123' };
      
      removeHandler(mockClient);
      
      expect(logger.debug).toHaveBeenCalledWith('Client removed from pool');
    });
  });

  describe('getPool', () => {
    const mockConfig = { host: 'localhost', database: 'testdb' };

    it('should return pool when initialized', () => {
      databasePool.initialize(mockConfig);
      
      const pool = databasePool.getPool();
      
      expect(pool).toBe(mockPool);
    });

    it('should throw error when not initialized', () => {
      expect(() => databasePool.getPool()).toThrow(
        'Database pool not initialized. Call initialize() first.'
      );
    });

    it('should throw error when pool is null', () => {
      databasePool.isInitialized = true;
      databasePool.pool = null;
      
      expect(() => databasePool.getPool()).toThrow(
        'Database pool not initialized. Call initialize() first.'
      );
    });
  });

  describe('query', () => {
    const mockConfig = { host: 'localhost', database: 'testdb' };

    beforeEach(() => {
      databasePool.initialize(mockConfig);
    });

    it('should execute query successfully', async () => {
      const mockResult = { rows: [{ id: 1, name: 'test' }], rowCount: 1 };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await databasePool.query('SELECT * FROM users WHERE id = $1', [1]);

      expect(result).toEqual(mockResult);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(logger.debug).toHaveBeenCalledWith('Executed query', {
        text: 'SELECT * FROM users WHERE id = $1',
        duration: expect.any(Number),
        rows: 1
      });
    });

    it('should handle query errors', async () => {
      const mockError = new Error('Query failed');
      mockPool.query.mockRejectedValue(mockError);

      await expect(databasePool.query('INVALID QUERY', [])).rejects.toThrow('Query failed');
      expect(logger.error).toHaveBeenCalledWith('Database query error:', {
        text: 'INVALID QUERY',
        error: 'Query failed'
      });
    });

    it('should measure query execution time', async () => {
      const mockResult = { rows: [], rowCount: 0 };
      mockPool.query.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockResult), 10))
      );

      await databasePool.query('SELECT 1', []);

      expect(logger.debug).toHaveBeenCalledWith('Executed query', {
        text: 'SELECT 1',
        duration: expect.any(Number),
        rows: 0
      });
    });

    it('should throw error when pool not initialized', async () => {
      const uninitializedPool = new (require('../../src/database/pool').constructor)();
      
      await expect(uninitializedPool.query('SELECT 1', [])).rejects.toThrow(
        'Database pool not initialized. Call initialize() first.'
      );
    });
  });

  describe('getClient', () => {
    const mockConfig = { host: 'localhost', database: 'testdb' };

    beforeEach(() => {
      databasePool.initialize(mockConfig);
    });

    it('should return client from pool', async () => {
      const mockClient = { query: jest.fn(), release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockClient);

      const client = await databasePool.getClient();

      expect(client).toBe(mockClient);
      expect(mockPool.connect).toHaveBeenCalled();
    });

    it('should handle client acquisition errors', async () => {
      const mockError = new Error('Client acquisition failed');
      mockPool.connect.mockRejectedValue(mockError);

      await expect(databasePool.getClient()).rejects.toThrow('Client acquisition failed');
    });

    it('should throw error when pool not initialized', async () => {
      const uninitializedPool = new (require('../../src/database/pool').constructor)();
      
      await expect(uninitializedPool.getClient()).rejects.toThrow(
        'Database pool not initialized. Call initialize() first.'
      );
    });
  });

  describe('healthCheck', () => {
    const mockConfig = { host: 'localhost', database: 'testdb' };

    beforeEach(() => {
      databasePool.initialize(mockConfig);
    });

    it('should return true for healthy database', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ healthy: 1 }] });

      const isHealthy = await databasePool.healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1 as healthy');
    });

    it('should return false for unhealthy database', async () => {
      const mockError = new Error('Connection failed');
      mockPool.query.mockRejectedValue(mockError);

      const isHealthy = await databasePool.healthCheck();

      expect(isHealthy).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Database health check failed:', mockError);
    });

    it('should handle invalid health check response', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ healthy: 0 }] });

      const isHealthy = await databasePool.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('getPoolStats', () => {
    const mockConfig = { host: 'localhost', database: 'testdb' };

    it('should return pool statistics when initialized', () => {
      databasePool.initialize(mockConfig);

      const stats = databasePool.getPoolStats();

      expect(stats).toEqual({
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0
      });
    });

    it('should return null when pool not initialized', () => {
      const stats = databasePool.getPoolStats();

      expect(stats).toBeNull();
    });
  });

  describe('close', () => {
    const mockConfig = { host: 'localhost', database: 'testdb' };

    it('should close pool successfully', async () => {
      databasePool.initialize(mockConfig);
      mockPool.end.mockResolvedValue(undefined);

      await databasePool.close();

      expect(mockPool.end).toHaveBeenCalled();
      expect(databasePool.isInitialized).toBe(false);
      expect(databasePool.pool).toBeNull();
      expect(logger.info).toHaveBeenCalledWith('Database connection pool closed');
    });

    it('should handle close errors', async () => {
      databasePool.initialize(mockConfig);
      const mockError = new Error('Close failed');
      mockPool.end.mockRejectedValue(mockError);

      await expect(databasePool.close()).rejects.toThrow('Close failed');
      expect(logger.error).toHaveBeenCalledWith('Error closing database pool:', mockError);
    });

    it('should do nothing if pool not initialized', async () => {
      await databasePool.close();

      expect(mockPool.end).not.toHaveBeenCalled();
    });
  });
});