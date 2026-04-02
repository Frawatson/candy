const databaseConnection = require('../database/connection');
const ConnectionPoolMonitor = require('../utils/connectionPoolMonitor');
const logger = require('../utils/logger');

// Create monitor instance for the database connection pool
const poolMonitor = new ConnectionPoolMonitor(databaseConnection.pool);

// Start periodic logging
poolMonitor.startPeriodicLogging();

const databaseHealthMiddleware = async (req, res, next) => {
  try {
    const healthCheck = await databaseConnection.healthCheck();
    const poolMetrics = poolMonitor.getMetrics();
    const healthReport = poolMonitor.getHealthReport();
    
    const response = {
      database: {
        status: healthCheck.healthy ? 'healthy' : 'unhealthy',
        responseTime: healthCheck.responseTime,
        lastCheck: healthCheck.timestamp,
        error: healthCheck.error || null
      },
      connectionPool: {
        status: healthReport.status,
        stats: healthCheck.poolStats,
        metrics: {
          totalQueries: poolMetrics.totalQueries,
          successRate: `${poolMetrics.successRate.toFixed(2)}%`,
          averageQueryTime: `${poolMetrics.averageQueryTime.toFixed(2)}ms`,
          utilizationRate: `${(poolMetrics.utilizationRate * 100).toFixed(2)}%`
        },
        recommendations: healthReport.recommendations
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };

    // Set appropriate status code
    const isHealthy = healthCheck.healthy && healthReport.status === 'healthy';
    const statusCode = isHealthy ? 200 : 503;

    // Log health check result
    logger.info('Database health check completed', {
      healthy: isHealthy,
      statusCode,
      responseTime: healthCheck.responseTime
    });

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Database health check failed', {
      error: error.message,
      stack: error.stack
    });

    const errorResponse = {
      database: {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date()
      },
      connectionPool: {
        status: 'unknown',
        stats: databaseConnection.getPoolStats(),
        error: 'Health check failed'
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };

    res.status(503).json(errorResponse);
  }
};

// Middleware factory for different health check endpoints
const createHealthCheckEndpoint = (detailed = false) => {
  return async (req, res, next) => {
    try {
      const healthCheck = await databaseConnection.healthCheck();
      
      if (detailed) {
        const poolMetrics = poolMonitor.getMetrics();
        const healthReport = poolMonitor.getHealthReport();
        
        const response = {
          status: healthCheck.healthy && healthReport.status === 'healthy' ? 'ok' : 'error',
          database: healthCheck,
          connectionPool: {
            ...healthReport,
            detailedMetrics: poolMetrics
          },
          timestamp: new Date().toISOString()
        };
        
        res.status(healthCheck.healthy ? 200 : 503).json(response);
      } else {
        // Simple health check
        const response = {
          status: healthCheck.healthy ? 'ok' : 'error',
          timestamp: new Date().toISOString()
        };
        
        res.status(healthCheck.healthy ? 200 : 503).json(response);
      }
    } catch (error) {
      logger.error('Health check endpoint error', { error: error.message });
      res.status(503).json({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Middleware to add pool monitoring to database queries
const queryMonitoringMiddleware = (req, res, next) => {
  // Monkey patch the query method to add monitoring
  const originalQuery = databaseConnection.query.bind(databaseConnection);
  
  databaseConnection.query = async (text, params) => {
    const start = Date.now();
    let success = true;
    
    try {
      const result = await originalQuery(text, params);
      const duration = Date.now() - start;
      
      poolMonitor.recordQuery(duration, true);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      success = false;
      
      poolMonitor.recordQuery(duration, false);
      
      // Check if it's a connection error
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        poolMonitor.recordConnectionError();
      }
      
      throw error;
    }
  };
  
  next();
};

module.exports = {
  databaseHealthMiddleware,
  createHealthCheckEndpoint,
  queryMonitoringMiddleware,
  poolMonitor
};