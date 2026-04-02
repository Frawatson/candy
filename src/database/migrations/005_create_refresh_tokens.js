const { Pool } = require('pg');

const migration = {
  up: async (pool) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create refresh_tokens table
      await client.query(`
        CREATE TABLE refresh_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          token_hash VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          is_blacklisted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_used_at TIMESTAMP WITH TIME ZONE,
          device_info JSONB,
          ip_address INET
        )
      `);

      // Create indexes for performance
      await client.query(`
        CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id)
      `);
      
      await client.query(`
        CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)
      `);
      
      await client.query(`
        CREATE INDEX idx_refresh_tokens_blacklisted ON refresh_tokens(is_blacklisted)
      `);
      
      await client.query(`
        CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash)
      `);

      await client.query('COMMIT');
      console.log('Migration 005: refresh_tokens table created successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Migration 005 failed:', error.message);
      throw error;
    } finally {
      client.release();
    }
  },

  down: async (pool) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Drop indexes
      await client.query('DROP INDEX IF EXISTS idx_refresh_tokens_token_hash');
      await client.query('DROP INDEX IF EXISTS idx_refresh_tokens_blacklisted');
      await client.query('DROP INDEX IF EXISTS idx_refresh_tokens_expires_at');
      await client.query('DROP INDEX IF EXISTS idx_refresh_tokens_user_id');

      // Drop table
      await client.query('DROP TABLE IF EXISTS refresh_tokens');

      await client.query('COMMIT');
      console.log('Migration 005: refresh_tokens table dropped successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Migration 005 rollback failed:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }
};

module.exports = migration;