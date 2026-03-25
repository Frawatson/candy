const { Pool } = require('pg');
const databaseConfig = require('../config/database.config');

class DatabaseConnection {
  constructor() {
    this.pool = new Pool(databaseConfig);
    
    // Handle pool events
    this.pool.on('connect', () => {
      console.log('Connected to PostgreSQL database');
    });
    
    this.pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async end() {
    await this.pool.end();
  }
}

module.exports = new DatabaseConnection();