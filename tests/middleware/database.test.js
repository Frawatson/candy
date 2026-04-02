const { databaseMiddleware, requireDatabaseConnection, databaseMonitoringMiddleware } = require('../../src/middleware/database');
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

describe('Database Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      set: jest.fn()
    };
    next = jest.fn();
  });

  describe('databaseMiddleware', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
    });

    it('should add database methods to request object', async () => {
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
      databasePool.query.mockResolvedValue(mockResult);
      databasePool.getClient.mockResolvedValue(mockClient);

      const middleware = databaseMiddleware();
      await middleware(req, res, next);

      expect(req.db).toBeDefined();
      expect(typeof req.db.query).toBe('function');
      expect(typeof req.db.getClient).toBe('function');
      expect(typeof req.db.transaction).toBe('function');
      expect(next).toHaveBeenCalled();
    });

    it('should execute query through request object', async () => {
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
      databasePool.query.mockResolvedValue(mockResult);

      const middleware = databaseMiddleware();
      await middleware(req, res, next);

      const result = await req.db.query('SELECT * FROM users', []);

      expect(result).toEqual(mockResult);
      expect(databasePool.query).toHaveBeenCalledWith('SELECT * FROM users', []);
    });

    it('should get client through request object', async () => {
      databasePool.getClient.mockResolvedValue(mockClient);

      const middleware = databaseMiddleware();
      await middleware(req, res, next);

      const client = await req.db.getClient();

      expect(client).toBe(mockClient);
      expect(databasePool.getClient).toHaveBeenCalled();
    });

    it('should execute transaction through request object', async () => {
      databasePool.getClient.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Callback query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const middleware = databaseMiddleware();
      await middleware(req, res, next);

      const callback = jest.fn().mockResolvedValue({ id: 1 });
      const result = await req.db.transaction(callback);

      expect(result).toEqual({ id: 1 });
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      databasePool.getClient.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK

      const middleware = databaseMiddleware();
      await middleware(req, res, next);

      const callback = jest.fn().mockRejectedValue(new Error('Transaction failed'));
      
      await expect(req.db.transaction(callback)).rejects.toThrow('Transaction failed');
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle middleware errors and call next with error', async () => {
      const mockError = new Error('Database middleware error');
      databasePool.query.mockRejectedValue(mockError);

      const middleware = databaseMiddleware();
      await middleware(req, res, next);

      expect(logger.error).toHaveBeenCalledWith('Database middleware error:', mockError);
      expect(next).toHaveBeenCalledWith(mockError);
    });

    it('should release client in finally block even when no client is acquired', async () => {
      const middleware = databaseMiddleware();
      await middleware(req, res, next);

      // Should not throw error even though no client was acquired
      expect(next).toHaveBeenCalled();
    });

    it('should handle client release errors gracefully', async () => {
      const mockReleaseError = new Error('Release failed');
      mockClient.release.mockImplementation(() => {
        throw mockReleaseError;
      });
      
      databasePool.getClient.mockResolvedValue(mockClient);

      const middleware = databaseMiddleware();
      await middleware(req, res, next);

      // Acquire a client to trigger release in finally
      await req.db.getClient();

      expect(logger.error).toHaveBeenCalledWith('Error releasing database client:', mockReleaseError);
    });
  });

  describe('requireDatabaseConnection', () => {
    it('should continue to next middleware when database is healthy', async () => {
      databasePool.healthCheck.mockResolvedValue(true);

      const middleware = requireDatabaseConnection();
      await middleware(req, res, next);

      expect(databasePool.healthCheck).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 503 when database is unhealthy', async () => {
      databasePool.healthCheck.mockResolvedValue(false);

      const middleware = requireDatabaseConnection();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Database connection unavailable',
        message: 'The database is currently unavailable. Please try again later.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle health check errors', async () => {
      const mockError = new Error('Health