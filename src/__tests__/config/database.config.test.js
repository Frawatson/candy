const databaseConfig = require('../../config/database.config');

describe('Database Configuration', () => {
  it('should have all required database properties', () => {
    expect(databaseConfig).toHaveProperty('host');
    expect(databaseConfig).toHaveProperty('port');
    expect(databaseConfig).toHaveProperty('database');
    expect(databaseConfig).toHaveProperty('user');
    expect(databaseConfig).toHaveProperty('password');
  });

  it('should use environment variables for test database', () => {
    expect(databaseConfig.database).toBe('auth_system_test');
  });

  it('should have connection pool settings', () => {
    expect(databaseConfig.max).toBe(20);
    expect(databaseConfig.idleTimeoutMillis).toBe(30000);
    expect(databaseConfig.connectionTimeoutMillis).toBe(2000);
  });

  it('should configure SSL based on environment', () => {
    process.env.NODE_ENV = 'production';
    const prodConfig = require('../../config/database.config');
    expect(prodConfig.ssl).toEqual({ rejectUnauthorized: false });

    process.env.NODE_ENV = 'test';
    const testConfig = require('../../config/database.config');
    expect(testConfig.ssl).toBe(false);
  });
});