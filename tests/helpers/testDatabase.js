const crypto = require('crypto');

class TestDatabase {
  constructor() {
    this.users = new Map();
    this.refreshTokens = new Map();
    this.emailVerificationTokens = new Map();
    this.passwordResetTokens = new Map();
    this.emailLogs = new Map();
  }

  // User management
  async createUser(userData) {
    const id = userData.id || Math.floor(Math.random() * 10000);
    const user = {
      id,
      email: userData.email.toLowerCase(),
      name: userData.name,
      password: userData.password, // In real app, this would be hashed
      emailVerified: userData.emailVerified || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...userData,
    };
    
    this.users.set(id, user);
    return user;
  }

  async findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  async findUserById(id) {
    return this.users.get(id) || null;
  }

  async updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user) return null;
    
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id) {
    return this.users.delete(id);
  }

  // Refresh token management
  async createRefreshToken(tokenData) {
    const token = {
      id: Math.floor(Math.random() * 10000),
      token: tokenData.token,
      userId: tokenData.userId,
      deviceInfo: tokenData.deviceInfo || 'test-device',
      ipAddress: tokenData.ipAddress || '127.0.0.1',
      expiresAt: tokenData.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isBlacklisted: false,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      ...tokenData,
    };
    
    this.refreshTokens.set(token.token, token);
    return token;
  }

  async findRefreshToken(token) {
    return this.refreshTokens.get(token) || null;
  }

  async updateRefreshToken(token, updates) {
    const tokenRecord = this.refreshTokens.get(token);
    if (!tokenRecord) return null;
    
    const updatedToken = {
      ...tokenRecord,
      ...updates,
      lastUsedAt: new Date().toISOString(),
    };
    
    this.refreshTokens.set(token, updatedToken);
    return updatedToken;
  }

  async blacklistRefreshToken(token) {
    const tokenRecord = this.refreshTokens.get(token);
    if (!tokenRecord) return false;
    
    tokenRecord.isBlacklisted = true;
    return true;
  }

  async blacklistAllUserTokens(userId) {
    let count = 0;
    for (const token of this.refreshTokens.values()) {
      if (token.userId === userId && !token.isBlacklisted) {
        token.isBlacklisted = true;
        count++;
      }
    }
    return { blacklistedCount: count };
  }

  async getUserActiveTokens(userId, limit = 10) {
    const tokens = [];
    for (const token of this.refreshTokens.values()) {
      if (token.userId === userId && !token.isBlacklisted) {
        tokens.push({
          id: token.id,
          deviceInfo: token.deviceInfo,
          ipAddress: token.ipAddress,
          createdAt: token.createdAt,
          lastUsedAt: token.lastUsedAt,
          expiresAt: token.expiresAt,
        });
      }
      if (tokens.length >= limit) break;
    }
    return tokens;
  }

  // Email verification tokens
  async createEmailVerificationToken(userId, token) {
    const tokenData = {
      id: Math.floor(Math.random() * 10000),
      userId,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      used: false,
      createdAt: new Date().toISOString(),
    };
    
    this.emailVerificationTokens.set(token, tokenData);
    return tokenData;
  }

  async findEmailVerificationToken(token) {
    return this.emailVerificationTokens.get(token) || null;
  }

  async markEmailVerificationTokenUsed(token) {
    const tokenData = this.emailVerificationTokens.get(token);
    if (!tokenData) return false;
    
    tokenData.used = true;
    return true;
  }

  // Password reset tokens
  async createPasswordResetToken(userId, token) {
    const tokenData = {
      id: Math.floor(Math.random() * 10000),
      userId,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      used: false,
      createdAt: new Date().toISOString(),
    };
    
    this.passwordResetTokens.set(token, tokenData);
    return tokenData;
  }

  async findPasswordResetToken(token) {
    return this.passwordResetTokens.get(token) || null;
  }

  async markPasswordResetTokenUsed(token) {
    const tokenData = this.passwordResetTokens.get(token);
    if (!tokenData) return false;
    
    tokenData.used = true;
    return true;
  }

  // Email logs
  async logEmail(emailData) {
    const log = {
      id: Math.floor(Math.random() * 10000),
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      template: emailData.template,
      status: emailData.status || 'sent',
      sentAt: new Date().toISOString(),
      ...emailData,
    };
    
    this.emailLogs.set(log.id, log);
    return log;
  }

  async getEmailLogs(filters = {}) {
    const logs = Array.from(this.emailLogs.values());
    
    if (filters.to) {
      return logs.filter(log => log.to === filters.to);
    }
    
    if (filters.template) {
      return logs.filter(log => log.template === filters.template);
    }
    
    return logs;
  }

  // Test utilities
  async reset() {
    this.users.clear();
    this.refreshTokens.clear();
    this.emailVerificationTokens.clear();
    this.passwordResetTokens.clear();
    this.emailLogs.clear();
  }

  async seed() {
    // Generate secure test password
    const testPassword = crypto.randomBytes(16).toString('hex');
    
    // Create test users
    await this.createUser({
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      password: testPassword,
      emailVerified: true,
    });

    await this.createUser({
      id: 2,
      email: 'unverified@example.com',
      name: 'Unverified User',
      password: testPassword,
      emailVerified: false,
    });

    await this.createUser({
      id: 3,
      email: 'existing@example.com',
      name: 'Existing User',
      password: testPassword,
      emailVerified: true,
    });

    // Create test refresh tokens
    await this.createRefreshToken({
      token: crypto.randomBytes(32).toString('hex'),
      userId: 1,
      deviceInfo: 'Test Device',
      ipAddress: '127.0.0.1',
    });

    await this.createRefreshToken({
      token: crypto.randomBytes(32).toString('hex'),
      userId: 1,
      deviceInfo: 'Test Device',
      ipAddress: '127.0.0.1',
      expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
    });

    await this.createRefreshToken({
      token: crypto.randomBytes(32).toString('hex'),
      userId: 1,
      deviceInfo: 'Test Device',
      ipAddress: '127.0.0.1',
      isBlacklisted: true,
    });

    // Create test verification tokens
    const validVerificationToken = crypto.randomBytes(32).toString('hex');
    const expiredVerificationToken = crypto.randomBytes(32).toString('hex');
    
    await this.createEmailVerificationToken(2, validVerificationToken);
    await this.createEmailVerificationToken(2, expiredVerificationToken);
    
    const expiredToken = this.emailVerificationTokens.get(expiredVerificationToken);
    expiredToken.expiresAt = new Date(Date.now() - 1000).toISOString();

    // Create test password reset tokens
    const validResetToken = crypto.randomBytes(32).toString('hex');
    const expiredResetToken = crypto.randomBytes(32).toString('hex');
    
    await this.createPasswordResetToken(1, validResetToken);
    await this.createPasswordResetToken(1, expiredResetToken);
    
    const expiredResetTokenData = this.passwordResetTokens.get(expiredResetToken);
    expiredResetTokenData.expiresAt = new Date(Date.now() - 1000).toISOString();
  }
}

// Singleton instance for tests
const testDb = new TestDatabase();

module.exports = {
  testDb,
  TestDatabase,
};