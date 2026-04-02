const databasePool = require('../database/pool');
const logger = require('../utils/logger');

/**
 * Middleware to inject database connection into request context
 * This middleware adds a database query method to the request object
 * and handles connection cleanup
 */
function databaseMiddleware() {
  return async (req, res, next) => {
    let client = null;
    
    try {
      // Add query method to request object
      req.db = {
        query: async (text, params) => {
          return await databasePool.query(text, params);
        },
        
        getClient: async () => {
          if (!client) {
            client = await databasePool.getClient();
          }
          return client;
        },
        
        transaction: async (callback) => {
          const transactionClient = await databasePool.getClient();
          try {
            await transactionClient.query('BEGIN');
            const result = await callback(transactionClient);
            await transactionClient.query('COMMIT');
            return result;
          } catch (error) {
            await transactionClient.query('ROLLBACK');
            throw error;
          } finally {
            transactionClient.release();
          }
        }
      };

      // Continue to next middleware
      next();
    } catch (error) {
      logger.error('Database middleware error:', error);
      next(error);
    } finally {
      // Cleanup: Release client if it was acquired
      if (client) {
        try {
          client.release();
        } catch (releaseError) {
          logger.error('Error releasing database client:', releaseError);
        }
      }
    }
  };
}

/**
 * Middleware to ensure database connection is available
 * This middleware checks database health before allowing requests to proceed
 */
function requireDatabaseConnection() {
  return async (req, res, next) => {
    try {
      const isHealthy = await databasePool.healthCheck();
      
      if (!isHealthy) {
        return res.status(503).json({
          error: 'Database connection unavailable',
          message: 'The database is currently unavailable. Please try again later.'
        });
      }
      
      next();
    } catch (error) {
      logger.error('Database connection check failed:', error);
      res.status(503).json({
        error: 'Database connection error',
        message: 'Unable to verify database connection'
      });
    }
  };
}

/**
 * Middleware to add database connection monitoring to responses
 * This middleware adds database pool statistics to response headers (in development)
 */
function databaseMonitoringMiddleware() {
  return (req, res, next) => {
    // Only add monitoring in development
    if (process.env.NODE_ENV === 'development') {
      const originalSend = res.send;
      
      res.send = function(body) {
        const poolStats = databasePool.getPoolStats();
        if (poolStats) {
          res.set('X-DB-Pool-Total', poolStats.totalCount.toString());
          res.set('X-DB-Pool-Idle', poolStats.idleCount.toString());
          res.set('X-DB-Pool-Waiting', poolStats.waitingCount.toString());
        }
        originalSend.call(this, body);
      };
    }
    
    next();
  };
}

module.exports = {
  databaseMiddleware,
  requireDatabaseConnection,
  databaseMonitoringMiddleware
};