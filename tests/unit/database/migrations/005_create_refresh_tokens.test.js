const { Pool } = require('pg');
const migration = require('../../../src/database/migrations/005_create_refresh_tokens');

// Mock pg Pool and client
jest.mock('pg');

describe('Migration 005: Create Refresh Tokens', () => {
  let mockPool;
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient)
    };

    Pool.mockImplementation(() => mockPool);
  });

  describe('up migration', () => {
    it('should create refresh_tokens table and indexes successfully', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await migration.up(mockPool);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      
      // Check table creation
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE refresh_tokens')
      );
      
      // Check index creation
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX idx_refresh_tokens_user_id')
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX idx_refresh_tokens_expires_at')
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX idx_refresh_tokens_blacklisted')
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX idx_refresh_tokens_token_hash')
      );
      
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error and throw', async () => {
      const error = new Error('Database connection failed');
      mockClient.query.mockRejectedValueOnce(error);

      await expect(migration.up(mockPool)).rejects.toThrow('Database connection failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle query execution order correctly', async () => {
      const queries = [];
      mockClient.query.mockImplementation((query) => {
        queries.push(query);
        return Promise.resolve({ rows: [] });
      });

      await migration.up(mockPool);

      expect(queries[0]).toBe('BEGIN');
      expect(queries[1]).toContain('CREATE TABLE refresh_tokens');
      expect(queries[queries.length - 1]).toBe('COMMIT');
    });
  });

  describe('down migration', () => {
    it('should drop indexes and table successfully', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await migration.down(mockPool);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      
      // Check index drops
      expect(mockClient.query).toHaveBeenCalledWith(
        'DROP INDEX IF EXISTS idx_refresh_tokens_token_hash'
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'DROP INDEX IF EXISTS idx_refresh_tokens_blacklisted'
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'DROP INDEX IF EXISTS idx_refresh_tokens_expires_at'
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'DROP INDEX IF EXISTS idx_refresh_tokens_user_id'
      );
      
      // Check table drop
      expect(mockClient.query).toHaveBeenCalledWith(
        'DROP TABLE IF EXISTS refresh_tokens'
      );
      
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error and throw', async () => {
      const error = new Error('Drop table failed');
      mockClient.query.mockRejectedValueOnce(error);

      await expect(migration.down(mockPool)).rejects.toThrow('Drop table failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should drop resources in correct order', async () => {
      const queries = [];
      mockClient.query.mockImplementation((query) => {
        queries.push(query);
        return Promise.resolve({ rows: [] });
      });

      await migration.down(mockPool);

      expect(queries[0]).toBe('BEGIN');
      // Indexes should be dropped before table
      const indexDrops = queries.filter(q => q.includes('DROP INDEX'));
      const tableDrop = queries.find(q => q.includes('DROP TABLE'));
      const tableDropIndex = queries.indexOf(tableDrop);
      
      indexDrops.forEach(indexQuery => {
        const indexDropIndex = queries.indexOf(indexQuery);
        expect(indexDropIndex).toBeLessThan(tableDropIndex);
      });
      
      expect(queries[queries.length - 1]).toBe('COMMIT');
    });
  });

  describe('client connection handling', () => {
    it('should always release client on success', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await migration.up(mockPool);

      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should always release client on error', async () => {
      const error = new Error('Query failed');
      mockClient.query.mockRejectedValueOnce(error);

      await expect(migration.up(mockPool)).rejects.toThrow();

      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });
});