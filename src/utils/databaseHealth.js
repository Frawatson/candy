const databasePool = require('../database/pool');
const logger = require('./logger');

/**
 * Performs a comprehensive database health check
 * @returns {Promise<Object>} Health check results
 */
async function performHealthCheck() {
  const healthCheck = {
    healthy: false,
    timestamp: new Date().toISOString(),
    checks: {
      connection: false,
      query: false,
      pool: false
    },
    poolStats: null,
    error: null
  };

  try {
    // Check if pool is initialized
    const pool = databasePool.getPool();
    healthCheck.checks.connection = !!pool;

    if (pool) {
      // Get pool statistics
      healthCheck.poolStats = databasePool.getPoolStats();
      healthCheck.checks.pool = true;

      // Test query execution
      const queryResult = await databasePool.healthCheck();
      healthCheck.checks.query = queryResult;

      // Overall health status
      healthCheck.healthy = healthCheck.checks.connection && 
                           healthCheck.checks.pool && 
                           healthCheck.checks.query;
    }
  } catch (error) {
    healthCheck.error = error.message;
    logger.error('Database health check failed:', error);
  }

  return healthCheck;
}

/**
 * Validates database connection configuration
 * @param {Object} config Database configuration
 * @returns {Object} Validation results
 */
function validateDatabaseConfig(config) {
  const validation = {
    valid: true,
    errors: [],
    warnings: []
  };

  // Required fields check
  if (!config.connectionString && !config.host) {
    validation.errors.push('Either connectionString or host must be provided');
  }

  if (!config.connectionString && !config.database) {
    validation.errors.push('Database name is required when not using connectionString');
  }

  if (!config.connectionString && !config.user) {
    validation.errors.push('Database user is required when not using connectionString');
  }

  // Pool configuration validation
  if (config.max && (config.max < 1 || config.max > 50)) {
    validation.warnings.push('Pool max connections should be between 1 and 50');
  }

  if (config.min && config.max && config.min >= config.max) {
    validation.errors.push('Pool min connections must be less than max connections');
  }

  if (config.idleTimeoutMillis && config.idleTimeoutMillis < 1000) {
    validation.warnings.push('Idle timeout should be at least 1000ms');
  }

  validation.valid = validation.errors.length === 0;
  return validation;
}

/**
 * Creates a database health check middleware
 * @returns {Function} Express middleware function
 */
function createHealthCheckMiddleware() {
  return async (req, res, next) => {
    try {
      const healthCheck = await performHealthCheck();
      
      if (healthCheck.healthy) {
        res.status(200).json({
          status: 'healthy',
          database: healthCheck
        });
      } else {
        res.status(503).json({
          status: 'unhealthy',
          database: healthCheck
        });
      }
    } catch (error) {
      logger.error('Health check middleware error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
        error: error.message
      });
    }
  };
}

/**
 * Waits for database to become available
 * @param {number} maxAttempts Maximum number of attempts
 * @param {number} delayMs Delay between attempts in milliseconds
 * @returns {Promise<boolean>} True if database becomes available
 */
async function waitForDatabase(maxAttempts = 10, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const healthCheck = await performHealthCheck();
      if (healthCheck.healthy) {
        logger.info(`Database connection established after ${attempt} attempt(s)`);
        return true;
      }
    } catch (error) {
      logger.warn(`Database connection attempt ${attempt}/${maxAttempts} failed:`, error.message);
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  logger.error(`Database connection failed after ${maxAttempts} attempts`);
  return false;
}

module.exports = {
  performHealthCheck,
  validateDatabaseConfig,
  createHealthCheckMiddleware,
  waitForDatabase
};