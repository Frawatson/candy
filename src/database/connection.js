const databasePool = require('./pool');
const { getDatabaseConfig } = require('../config/database');
const logger = require('../utils/logger');
const { validateDatabaseConfig, waitForDatabase } = require('../utils/databaseHealth');

/**
 * Initialize database connection with proper error handling and validation
 * @returns {Promise<Pool>} Initialized database pool
 */
async function initializeDatabase() {
  try {
    // Get database configuration
    const config = getDatabaseConfig();
    
    // Validate configuration
    const validation = validateDatabaseConfig(config);
    if (!validation.valid) {
      const errors = validation.errors.join(', ');
      throw new Error(`Invalid database configuration: ${errors}`);
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        logger.warn(`Database config warning: ${warning}`);
      });
    }

    // Initialize the connection pool
    const pool = databasePool.initialize(config);
    
    // Wait for database to be available
    const isAvailable = await waitForDatabase(10, 2000);
    if (!isAvailable) {
      throw new Error('Database connection could not be established after multiple attempts');
    }

    logger.info('Database connection initialized successfully');
    return pool;
  } catch (error) {
    logger.error('Failed to initialize database connection:', error);
    throw error;
  }
}

/**
 * Get the database pool instance
 * @returns {Pool} Database connection pool
 */
function getDatabase() {
  return databasePool.getPool();
}

/**
 * Execute a database query
 * @param {string} text SQL query text
 * @param {Array} params Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params) {
  return await databasePool.query(text, params);
}

/**
 * Get a database client from the pool
 * @returns {Promise<Client>} Database client
 */
async function getClient() {
  return await databasePool.getClient();
}

/**
 * Execute a database transaction
 * @param {Function} callback Transaction callback function
 * @returns {Promise<any>} Transaction result
 */
async function transaction(callback) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the database connection pool
 * @returns {Promise<void>}
 */
async function closeDatabase() {
  await databasePool.close();
}

/**
 * Get database pool statistics
 * @returns {Object|null} Pool statistics or null if not initialized
 */
function getPoolStats() {
  return databasePool.getPoolStats();
}

/**
 * Perform database health check
 * @returns {Promise<boolean>} True if database is healthy
 */
async function healthCheck() {
  return await databasePool.healthCheck();
}

module.exports = {
  initializeDatabase,
  getDatabase,
  query,
  getClient,
  transaction,
  closeDatabase,
  getPoolStats,
  healthCheck
};
