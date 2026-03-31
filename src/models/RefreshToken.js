const { Pool } = require('pg');
const { hashToken, calculateExpiryDate } = require('../utils/tokenUtils');
const { jwtConfig } = require('../config/jwt');

class RefreshToken {
  constructor(pool) {
    this.pool = pool;
  }

  async create({ userId, tokenHash, tokenFamily, expiresAt, deviceInfo = null, ipAddress = null }) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO refresh_tokens (
          user_id, token_hash, expires_at, device_info, ip_address, token_family
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, user_id, token_hash, expires_at, is_blacklisted, 
                  created_at, updated_at, last_used_at, device_info, ip_address
      `;
      
      const values = [
        userId,
        tokenHash,
        expiresAt || calculateExpiryDate(jwtConfig.refreshToken.expiresIn),
        deviceInfo ? JSON.stringify(deviceInfo) : null,
        ipAddress,
        tokenFamily
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async findByTokenHash(tokenHash) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, user_id, token_hash, expires_at, is_blacklisted,
               created_at, updated_at, last_used_at, device_info, ip_address, token_family
        FROM refresh_tokens 
        WHERE token_hash = $1
      `;
      
      const result = await client.query(query, [tokenHash]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async findByUserId(userId, limit = 10) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, user_id, token_hash, expires_at, is_blacklisted,
               created_at, updated_at, last_used_at, device_info, ip_address, token_family
        FROM refresh_tokens 
        WHERE user_id = $1 AND is_blacklisted = false
        ORDER BY created_at DESC
        LIMIT $2
      `;
      
      const result = await client.query(query, [userId, limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async findByTokenFamily(tokenFamily) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, user_id, token_hash, expires_at, is_blacklisted,
               created_at, updated_at, last_used_at, device_info, ip_address, token_family
        FROM refresh_tokens 
        WHERE token_family = $1
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query, [tokenFamily]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async updateLastUsed(tokenHash, ipAddress = null) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE refresh_tokens 
        SET last_used_at = NOW(), 
            updated_at = NOW(),
            ip_address = COALESCE($2, ip_address)
        WHERE token_hash = $1 AND is_blacklisted = false
        RETURNING id, user_id, token_hash, expires_at, is_blacklisted,
                  created_at, updated_at, last_used_at, device_info, ip_address, token_family
      `;
      
      const result = await client.query(query, [tokenHash, ipAddress]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async blacklist(tokenHash) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE refresh_tokens 
        SET is_blacklisted = true, updated_at = NOW()
        WHERE token_hash = $1
        RETURNING id, user_id, is_blacklisted
      `;
      
      const result = await client.query(query, [tokenHash]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async blacklistByUserId(userId) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE refresh_tokens 
        SET is_blacklisted = true, updated_at = NOW()
        WHERE user_id = $1 AND is_blacklisted = false
      `;
      
      const result = await client.query(query, [userId]);
      return result.rowCount;
    } finally {
      client.release();
    }
  }

  async blacklistTokenFamily(tokenFamily) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE refresh_tokens 
        SET is_blacklisted = true, updated_at = NOW()
        WHERE token_family = $1 AND is_blacklisted = false
      `;
      
      const result = await client.query(query, [tokenFamily]);
      return result.rowCount;
    } finally {
      client.release();
    }
  }

  async deleteExpired() {
    const client = await this.pool.connect();
    
    try {
      const query = `
        DELETE FROM refresh_tokens 
        WHERE expires_at < NOW()
      `;
      
      const result = await client.query(query);
      return result.rowCount;
    } finally {
      client.release();
    }
  }

  async deleteBlacklisted(olderThanDays = 30) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        DELETE FROM refresh_tokens 
        WHERE is_blacklisted = true 
        AND updated_at < NOW() - INTERVAL '${olderThanDays} days'
      `;
      
      const result = await client.query(query);
      return result.rowCount;
    } finally {
      client.release();
    }
  }

  async deleteByUserId(userId) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        DELETE FROM refresh_tokens 
        WHERE user_id = $1
      `;
      
      const result = await client.query(query, [userId]);
      return result.rowCount;
    } finally {
      client.release();
    }
  }

  async getStats() {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          COUNT(*) as total_tokens,
          COUNT(CASE WHEN is_blacklisted = true THEN 1 END) as blacklisted_tokens,
          COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_tokens,
          COUNT(CASE WHEN is_blacklisted = false AND expires_at >= NOW() THEN 1 END) as active_tokens
        FROM refresh_tokens
      `;
      
      const result = await client.query(query);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async isValid(tokenHash) {
    const token = await this.findByTokenHash(tokenHash);
    
    if (!token) {
      return { valid: false, reason: 'Token not found' };
    }
    
    if (token.is_blacklisted) {
      return { valid: false, reason: 'Token is blacklisted' };
    }
    
    if (new Date(token.expires_at) < new Date()) {
      return { valid: false, reason: 'Token expired' };
    }
    
    return { valid: true, token };
  }
}

module.exports = RefreshToken;