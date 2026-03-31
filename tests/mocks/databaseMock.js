const { EventEmitter } = require('events');
const { testDb } = require('../helpers/testDatabase');

// Mock database connection
class DatabaseConnectionMock extends EventEmitter {
  constructor() {
    super();
    this.isConnected = false;
    this.transactionDepth = 0;
    this.queryHistory = [];
    this.shouldFail = false;
    this.failureType = 'connection';
    this.queryDelay = 0;
  }

  async connect() {
    if (this.shouldFail && this.failureType === 'connection') {
      const error = new Error('Database connection failed');
      error.code = 'ECONNREFUSED';
      throw error;
    }

    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate connection delay
    this.isConnected = true;
    this.emit('connect');
    return true;
  }

  async disconnect() {
    this.isConnected = false;
    this.transactionDepth = 0;
    this.emit('disconnect');
  }

  async query(sql, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    if (this.shouldFail && this.failureType === 'query') {
      const error = new Error('Query execution failed');
      error.code = 'QUERY_ERROR';
      throw error;
    }

    if (this.queryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.queryDelay));
    }

    const queryLog = {
      sql,
      params,
      timestamp: new Date().toISOString(),
      transactionDepth: this.transactionDepth,
    };

    this.queryHistory.push(queryLog);
    this.emit('query', queryLog);

    // Simple mock query handling based on SQL patterns
    return this.handleMockQuery(sql, params);
  }

  async transaction(callback) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    this.transactionDepth++;
    
    try {
      await this.query('BEGIN');
      const result = await callback(this);
      await this.query('COMMIT');
      return result;
    } catch (error) {
      await this.query('ROLLBACK');
      throw error;
    } finally {
      this.transactionDepth--;
    }
  }

  handleMockQuery(sql, params) {
    const sqlLower = sql.toLowerCase();

    // User queries
    if (sqlLower.includes('select') && sqlLower.includes('users')) {
      if (sqlLower.includes('email')) {
        return { rows: [testDb.findUserByEmail(params[0])].filter(Boolean) };
      }
      if (sqlLower.includes('id')) {
        return { rows: [testDb.findUserById(params[0])].filter(Boolean) };
      }
      return { rows: Array.from(testDb.users.values()) };
    }

    if (sqlLower.includes('insert') && sqlLower.includes('users')) {
      const userData = this.extractUserDataFromInsert(params);
      const user = testDb.createUser(userData);
      return { rows: [user], rowCount: 1 };
    }

    if (sqlLower.includes('update') && sqlLower.includes('users')) {
      const userId = params[params.length - 1]; // Assume ID is last parameter
      const updates = this.extractUpdateData(sql, params);
      const user = testDb.updateUser(userId, updates);
      return { rows: [user].filter(Boolean), rowCount: user ? 1 : 0 };
    }

    if (sqlLower.includes('delete') && sqlLower.includes('users')) {
      const userId = params[0];
      const deleted = testDb.deleteUser(userId);
      return { rowCount: deleted ? 1 : 0 };
    }

    // Refresh token queries
    if (sqlLower.includes('refresh_tokens')) {
      if (sqlLower.includes('select')) {
        if (params[0]) {
          const token = testDb.findRefreshToken(params[0]);
          return { rows: [token].filter(Boolean) };
        }
        return { rows: Array.from(testDb.refreshTokens.values()) };
      }

      if (sqlLower.includes('insert')) {
        const tokenData = this.extractTokenDataFromInsert(params);
        const token = testDb.createRefreshToken(tokenData);
        return { rows: [token], rowCount: 1 };
      }

      if (sqlLower.includes('update')) {
        const tokenValue = params[params.length - 1];
        const updates = this.extractUpdateData(sql, params);
        const token = testDb.updateRefreshToken(tokenValue, updates);
        return { rows: [token].filter(Boolean), rowCount: token ? 1 : 0 };
      }
    }

    // Email verification tokens
    if (sqlLower.includes('email_verification_tokens')) {
      if (sqlLower.includes('select')) {
        const token = testDb.findEmailVerificationToken(params[0]);
        return { rows: [token].filter(Boolean) };
      }

      if (sqlLower.includes('insert')) {
        const { userId, token } = this.extractVerificationTokenData(params);
        const tokenData = testDb.createEmailVerificationToken(userId, token);
        return { rows: [tokenData], rowCount: 1 };
      }
    }

    // Password reset tokens
    if (sqlLower.includes('password_reset_tokens')) {
      if (sqlLower.includes('select')) {
        const token = testDb.findPasswordResetToken(params[0]);
        return { rows: [token].filter(Boolean) };
      }

      if (sqlLower.includes('insert')) {
        const { userId, token } = this.extractResetTokenData(params);
        const tokenData = testDb.createPasswordResetToken(userId, token);
        return { rows: [tokenData], rowCount: 1 };
      }
    }

    // Email logs
    if (sqlLower.includes('email_logs')) {
      if (sqlLower.includes('select')) {
        const filters = this.extractEmailLogFilters(params);
        const logs = testDb.getEmailLogs(filters);
        return { rows: logs };
      }

      if (sqlLower.includes('insert')) {
        const emailData = this.extractEmailLogData(params);
        const log = testDb.logEmail(emailData);
        return { rows: [log], rowCount: 1 };
      }
    }

    // Default response for unhandled queries
    return { rows: [], rowCount: 0 };
  }

  // Helper methods to extract data from query parameters
  extractUserDataFromInsert(params) {
    // This would normally parse the actual SQL, but for testing we'll use a simple approach
    return {
      email: params[0],
      name: params[1],
      password: params[2],
      emailVerified: params[3] || false,
    };
  }

  extractTokenDataFromInsert(params) {
    return {
      token: params[0],
      userId: params[1],
      deviceInfo: params[2],
      ipAddress: params[3],
      expiresAt: params[4],
    };
  }

  extractVerificationTokenData(params) {
    return {
      userId: params[0],
      token: params[1],
    };
  }

  extractResetTokenData(params) {
    return {
      userId: params[0],
      token: params[1],
    };
  }

  extractEmailLogData(params) {