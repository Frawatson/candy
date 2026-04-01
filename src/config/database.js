const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database configuration with optimized connection pool settings
const databaseConfig = {
  // Connection settings
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  database: process.env.DATABASE_NAME || 'postgres',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  
  // Connection pool settings optimized for performance
  max: parseInt(process.env.DB_POOL_SIZE) || 20, // Maximum number of clients in pool
  min: parseInt(process.env.DB_POOL_MIN) || 5, // Minimum number of clients in pool
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000, // Close idle clients after 30s
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000, // Return error after 10s if connection cannot be established
  maxUses: parseInt(process.env.DB_MAX_USES) || 7500, // Close (and replace) a connection after it has been used 7500 times
  allowExitOnIdle: process.env.NODE_ENV !== 'production', // Allow process to exit when all clients are idle
  
  // SSL configuration
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : false,
  
  // Statement timeout
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000, // 30 second statement timeout
  
  // Query timeout
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 60000, // 60 second query timeout
};

// Create the connection pool
const pool = new Pool(databaseConfig);

// Connection pool event handlers for monitoring and debugging
pool.on('connect', (client) => {
  logger.info('New database client connected', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('acquire', (client) => {
  logger.debug('Client acquired from pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('remove', (client) => {
  logger.info('Client removed from pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', {
    error: err.message,
    stack: err.stack,
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

// Connection retry logic
const connectWithRetry = async (maxRetries = 5, delay = 2000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      logger.info('Database connection established successfully');
      client.release();
      return true;
    } catch (error) {
      logger.error(`Database connection attempt ${attempt}/${maxRetries} failed`, {
        error: error.message,
        attempt,
        maxRetries
      });
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to connect to database after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
};

// Graceful shutdown handler
const gracefulShutdown = async () => {
  logger.info('Shutting down database connection pool...');
  
  try {
    await pool.end();
    logger.info('Database connection pool closed successfully');
  } catch (error) {
    logger.error('Error closing database connection pool', {
      error: error.message,
      stack: error.stack
    });
  }
};

// Handle process termination signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = {
  pool,
  databaseConfig,
  connectWithRetry,
  gracefulShutdown
};