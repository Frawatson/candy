const { Pool } = require('pg');
const logger = require('../utils/logger');

class DatabasePool {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
  }

  initialize(config) {
    if (this.isInitialized) {
      return this.pool;
    }

    try {
      this.pool = new Pool(config);
      
      // Handle pool errors
      this.pool.on('error', (err) => {
        logger.error('Unexpected error on idle client', err);
      });

      // Handle pool connection events
      this.pool.on('connect', (client) => {
        logger.debug('New client connected to database');
      });

      // Handle pool removal events
      this.pool.on('remove', (client) => {
        logger.debug('Client removed from pool');
      });

      this.isInitialized = true;
      logger.info('Database connection pool initialized successfully');
      
      return this.pool;
    } catch (error) {
      logger.error('Failed to initialize database connection pool:', error);
      throw error;
    }
  }

  getPool() {
    if (!this.isInitialized || !this.pool) {
      throw new Error('Database pool not initialized. Call initialize() first.');
    }
    return this.pool;
  }

  async query(text, params) {
    const pool = this.getPool();
    const start = Date.now();
    
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Database query error:', { text, error: error.message });
      throw error;
    }
  }

  async getClient() {
    const pool = this.getPool();
    return await pool.connect();
  }

  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as healthy');
      return result.rows[0].healthy === 1;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  getPoolStats() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  async close() {
    if (this.pool) {
      try {
        await this.pool.end();
        this.isInitialized = false;
        this.pool = null;
        logger.info('Database connection pool closed');
      } catch (error) {
        logger.error('Error closing database pool:', error);
        throw error;
      }
    }
  }
}

// Export singleton instance
const databasePool = new DatabasePool();
module.exports = databasePool;