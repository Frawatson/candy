const logger = require('../utils/logger');

/**
 * Get database configuration from environment variables
 * Supports both DATABASE_URL and individual connection parameters
 * @returns {Object} Database configuration object
 */
function getDatabaseConfig() {
  const config = {};

  // Check if DATABASE_URL is provided (common in production/Heroku)
  if (process.env.DATABASE_URL) {
    config.connectionString = process.env.DATABASE_URL;
    logger.info('Using DATABASE_URL for database connection');
  } else {
    // Use individual connection parameters
    config.host = process.env.DATABASE_HOST || 'localhost';
    config.port = parseInt(process.env.DATABASE_PORT) || 5432;
    config.database = process.env.DATABASE_NAME || 'postgres';
    config.user = process.env.DATABASE_USER || 'postgres';
    config.password = process.env.DATABASE_PASSWORD || '';
    
    logger.info('Using individual database connection parameters');
  }

  // SSL Configuration
  if (process.env.NODE_ENV === 'production') {
    config.ssl = {
      rejectUnauthorized: false
    };
  } else if (process.env.DATABASE_SSL === 'true') {
    config.ssl = {
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false'
    };
  }

  // Connection Pool Configuration
  config.max = parseInt(process.env.DATABASE_MAX_CONNECTIONS) || 
    (process.env.NODE_ENV === 'production' ? 20 : 10);
  config.min = parseInt(process.env.DATABASE_MIN_CONNECTIONS) || 
    (process.env.NODE_ENV === 'production' ? 2 : 1);
  config.idleTimeoutMillis = parseInt(process.env.DATABASE_IDLE_TIMEOUT) || 30000;
  config.connectionTimeoutMillis = parseInt(process.env.DATABASE_CONNECTION_TIMEOUT) || 10000;
  config.acquireTimeoutMillis = parseInt(process.env.DATABASE_ACQUIRE_TIMEOUT) || 60000;

  // Query timeout
  config.statement_timeout = parseInt(process.env.DATABASE_QUERY_TIMEOUT) || 30000;

  // Application name for connection tracking
  config.application_name = process.env.DATABASE_APP_NAME || 'express-app';

  // Connection pool events logging level
  config.log = process.env.NODE_ENV === 'development' ? 
    (msg) => logger.debug('Database pool:', msg) : 
    undefined;

  return config;
}

/**
 * Validate required environment variables
 * @returns {Object} Validation result with missing variables
 */
function validateEnvironmentVariables() {
  const required = [];
  const optional = [];
  const missing = [];

  // If DATABASE_URL is not provided, individual params are required
  if (!process.env.DATABASE_URL) {
    const individualParams = [
      'DATABASE_HOST',
      'DATABASE_NAME',
      'DATABASE_USER'
    ];
    
    individualParams.forEach(param => {
      if (!process.env[param]) {
        missing.push(param);
      }
    });

    if (missing.length > 0) {
      required.push(...individualParams);
    }
  }

  // Optional but recommended variables
  const optionalVars = [
    'DATABASE_PASSWORD',
    'DATABASE_PORT',
    'DATABASE_MAX_CONNECTIONS',
    'DATABASE_MIN_CONNECTIONS',
    'DATABASE_IDLE_TIMEOUT',
    'DATABASE_CONNECTION_TIMEOUT'
  ];

  optionalVars.forEach(param => {
    if (!process.env[param]) {
      optional.push(param);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
    required,
    optional
  };
}

/**
 * Get connection string for migrations and CLI tools
 * @returns {string} Database connection string
 */
function getConnectionString() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DATABASE_HOST || 'localhost';
  const port = process.env.DATABASE_PORT || 5432;
  const database = process.env.DATABASE_NAME || 'postgres';
  const user = process.env.DATABASE_USER || 'postgres';
  const password = process.env.DATABASE_PASSWORD || '';

  if (password) {
    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }
  return `postgresql://${user}@${host}:${port}/${database}`;
}

/**
 * Get database configuration for testing
 * Uses separate test database or in-memory configuration
 * @returns {Object} Test database configuration
 */
function getTestDatabaseConfig() {
  const baseConfig = getDatabaseConfig();
  
  // Use test database if specified
  if (process.env.DATABASE_URL_TEST) {
    return {
      ...baseConfig,
      connectionString: process.env.DATABASE_URL_TEST
    };
  }

  // Modify database name for tests
  if (baseConfig.database && !baseConfig.connectionString) {
    return {
      ...baseConfig,
      database: `${baseConfig.database}_test`
    };
  }

  // Reduce pool size for tests
  return {
    ...baseConfig,
    max: 5,
    min: 1,
    idleTimeoutMillis: 1000
  };
}

module.exports = {
  getDatabaseConfig,
  validateEnvironmentVariables,
  getConnectionString,
  getTestDatabaseConfig
};