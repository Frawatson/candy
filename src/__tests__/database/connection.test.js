const DatabaseConnection = require('../../database/connection');

// Mock the pg module
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn()
  }))
}));

describe('DatabaseConnection', () => {
  let mockPool;

  beforeEach(() => {
    const { Pool } = require('pg');
    mockPool = new Pool();
    DatabaseConnection.pool = mockPool;
  });

  describe('query method', () => {
    it('should execute query successfully', async () => {
      const mockResult = { rowCount: 1, rows: [{ id: '1' }] };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await DatabaseConnection.query('SELECT * FROM users', []);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users', []);
      expect(result).toEqual(mockResult);
    });

    it('should handle query errors', async () => {
      const mockError = new Error('Database error');
      mockPool.query.mockRejectedValue(mockError);

      await expect(
        DatabaseConnection.query('INVALID SQL', [])
      ).rejects.toThrow('Database error');
    });

    it('should log query execution details', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockResult = { rowCount: 1 };
      mockPool.query.mockResolvedValue(mockResult);

      await DatabaseConnection.query('SELECT * FROM users', []);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Executed query',
        expect.objectContaining({
          text: 'SELECT * FROM users',
          rows: 1,
          duration: expect.any(Number)
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getClient method', () => {
    it('should return a database client', async () => {
      const mockClient = { release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockClient);

      const client = await DatabaseConnection.getClient();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(client).toBe(mockClient);
    });

    it('should handle connection errors', async () => {
      const mockError = new Error('Connection failed');
      mockPool.connect.mockRejectedValue(mockError);

      await expect(DatabaseConnection.getClient()).rejects.toThrow('Connection failed');
    });
  });

  describe('end method', () => {
    it('should close the connection pool', async () => {
      mockPool.end.mockResolvedValue();

      await DatabaseConnection.end();

      expect(mockPool.end).toHaveBeenCalled();
    });
  });
});