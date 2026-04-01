const { pool, connectWithRetry } = require('../config/database');
const logger = require('../utils/logger');

class DatabaseConnection {
  constructor() {
    this.pool = pool;
    this.isHealthy = false;
    this.lastHealthCheck = null;
    this.healthCheckInterval = null;
    
    // Initialize connection and start health monitoring
    this.initialize();
  }

  async initialize() {
    try {
      await connectWithRetry();
      this.isHealthy = true;
      this.startHealthMonitoring();
      logger.info('Database connection initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database connection', {
        error: error.message,
        stack: error.stack
      });
      this.isHealthy = false;
      throw error;
    }
  }

  async query(text, params = []) {
    const start = Date.now();
    let client;

    try {
      client = await this.pool.connect();
      const result = await client.query(text, params);
      
      const duration = Date.now() - start;
      logger.debug('Database query executed', {
        duration,
        rowCount: result.rowCount,
        command: result.command
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Database query failed', {
        error: error.message,
        duration,
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params.length > 0 ? '[PARAMS_PROVIDED]' : '[]'
      });
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    const start = Date.now();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      
      const duration = Date.now() - start;
      logger.debug('Database transaction completed', { duration });
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      const duration = Date.now() - start;
      
      logger.error('Database transaction failed and rolled back', {
        error: error.message,
        duration
      });
      
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck() {
    try {
      const start = Date.now();
      const result = await this.query('SELECT 1 as health_check');
      const duration = Date.now() - start;
      
      this.isHealthy = result.rows.length > 0;
      this.lastHealthCheck = new Date();
      
      logger.debug('Database health check completed', {
        healthy: this.isHealthy,
        duration,
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
      
      return {
        healthy: this.isHealthy,
        responseTime: duration,
        timestamp: this.lastHealthCheck,
        poolStats: this.getPoolStats()
      };
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = new Date();
      
      logger.error('Database health check failed', {
        error: error.message,
        timestamp: this.lastHealthCheck
      });
      
      return {
        healthy: false,
        error: error.message,
        timestamp: this.lastHealthCheck,
        poolStats: this.getPoolStats()
      };
    }
  }

  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      maxConnections: this.pool.options.max,
      minConnections: this.pool.options.min
    };
  }

  startHealthMonitoring() {
    // Perform health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.healthCheck();
    }, 30000);
    
    logger.info('Database health monitoring started');
  }

  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Database health monitoring stopped');
    }
  }

  async close() {
    this.stopHealthMonitoring();
    await this.pool.end();
    logger.info('Database connection closed');
  }
}

// Create singleton instance
const databaseConnection = new DatabaseConnection();

module.exports = databaseConnection;