const { TestDatabase, testDb } = require('../../helpers/testDatabase');
const crypto = require('crypto');

describe('TestDatabase', () => {
  let db;

  beforeEach(async () => {
    db = new TestDatabase();
    await db.reset();
  });

  describe('User Management', () => {
    describe('createUser', () => {
      it('should create a user with valid data', async () => {
        const userData = {
          email: 'test@example.com',
          name: 'Test User',
          password: 'hashedpassword',
        };

        const user = await db.createUser(userData);

        expect(user).toMatchObject({
          email: 'test@example.com',
          name: 'Test User',
          password: 'hashedpassword',
          emailVerified: false,
        });
        expect(user.id).toBeDefined();
        expect(user.createdAt).toBeDefined();
        expect(user.updatedAt).toBeDefined();
      });

      it('should convert email to lowercase', async () => {
        const userData = {
          email: 'TEST@EXAMPLE.COM',
          name: 'Test User',
          password: 'hashedpassword',
        };

        const user = await db.createUser(userData);
        expect(user.email).toBe('test@example.com');
      });

      it('should use provided ID if given', async () => {
        const userData = {
          id: 12345,
          email: 'test@example.com',
          name: 'Test User',
          password: 'hashedpassword',
        };

        const user = await db.createUser(userData);
        expect(user.id).toBe(12345);
      });

      it('should set default emailVerified to false', async () => {
        const userData = {
          email: 'test@example.com',
          name: 'Test User',
          password: 'hashedpassword',
        };

        const user = await db.createUser(userData);
        expect(user.emailVerified).toBe(false);
      });
    });

    describe('findUserByEmail', () => {
      beforeEach(async () => {
        await db.createUser({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password',
        });
      });

      it('should find user by email case-insensitively', async () => {
        const user = await db.findUserByEmail('TEST@EXAMPLE.COM');
        expect(user).toBeTruthy();
        expect(user.email).toBe('test@example.com');
      });

      it('should return null for non-existent email', async () => {
        const user = await db.findUserByEmail('nonexistent@example.com');
        expect(user).toBeNull();
      });

      it('should handle empty email', async () => {
        const user = await db.findUserByEmail('');
        expect(user).toBeNull();
      });
    });

    describe('findUserById', () => {
      let createdUser;

      beforeEach(async () => {
        createdUser = await db.createUser({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password',
        });
      });

      it('should find user by ID', async () => {
        const user = await db.findUserById(createdUser.id);
        expect(user).toEqual(createdUser);
      });

      it('should return null for non-existent ID', async () => {
        const user = await db.findUserById(999999);
        expect(user).toBeNull();
      });
    });

    describe('updateUser', () => {
      let createdUser;

      beforeEach(async () => {
        createdUser = await db.createUser({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password',
        });
      });

      it('should update user successfully', async () => {
        const updates = {
          name: 'Updated Name',
          emailVerified: true,
        };

        const updatedUser = await db.updateUser(createdUser.id, updates);

        expect(updatedUser.name).toBe('Updated Name');
        expect(updatedUser.emailVerified).toBe(true);
        expect(updatedUser.updatedAt).not.toBe(createdUser.updatedAt);
      });

      it('should return null for non-existent user', async () => {
        const result = await db.updateUser(999999, { name: 'Updated' });
        expect(result).toBeNull();
      });

      it('should preserve original data when updating partial fields', async () => {
        const updatedUser = await db.updateUser(createdUser.id, { name: 'New Name' });
        
        expect(updatedUser.email).toBe(createdUser.email);
        expect(updatedUser.password).toBe(createdUser.password);
        expect(updatedUser.name).toBe('New Name');
      });
    });

    describe('deleteUser', () => {
      let createdUser;

      beforeEach(async () => {
        createdUser = await db.createUser({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password',
        });
      });

      it('should delete existing user', async () => {
        const result = await db.deleteUser(createdUser.id);
        expect(result).toBe(true);

        const foundUser = await db.findUserById(createdUser.id);
        expect(foundUser).toBeNull();
      });

      it('should return false for non-existent user', async () => {
        const result = await db.deleteUser(999999);
        expect(result).toBe(false);
      });
    });
  });

  describe('Refresh Token Management', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await db.createUser({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password',
      });
    });

    describe('createRefreshToken', () => {
      it('should create refresh token with valid data', async () => {
        const tokenData = {
          token: crypto.randomBytes(32).toString('hex'),
          userId: testUser.id,
          deviceInfo: 'Test Device',
          ipAddress: '192.168.1.1',
        };

        const token = await db.createRefreshToken(tokenData);

        expect(token).toMatchObject({
          token: tokenData.token,
          userId: testUser.id,
          deviceInfo: 'Test Device',
          ipAddress: '192.168.1.1',
          isBlacklisted: false,
        });
        expect(token.id).toBeDefined();
        expect(token.expiresAt).toBeDefined();
        expect(token.createdAt).toBeDefined();
      });

      it('should set default values for optional fields', async () => {
        const tokenData = {
          token: crypto.randomBytes(32).toString('hex'),
          userId: testUser.id,
        };

        const token = await db.createRefreshToken(tokenData);

        expect(token.deviceInfo).toBe('test-device');
        expect(token.ipAddress).toBe('127.0.0.1');
        expect(token.isBlacklisted).toBe(false);
      });
    });

    describe('findRefreshToken', () => {
      let createdToken;

      beforeEach(async () => {
        const tokenValue = crypto.randomBytes(32).toString('hex');
        createdToken = await db.createRefreshToken({
          token: tokenValue,
          userId: testUser.id,
        });
      });

      it('should find token by value', async () => {
        const found = await db.findRefreshToken(createdToken.token);
        expect(found).toEqual(createdToken);
      });

      it('should return null for non-existent token', async () => {
        const found = await db.findRefreshToken('nonexistent-token');
        expect(found).toBeNull();
      });
    });

    describe('blacklistRefreshToken', () => {
      let createdToken;

      beforeEach(async () => {
        const tokenValue = crypto.randomBytes(32).toString('hex');
        createdToken = await db.createRefreshToken({
          token: tokenValue,
          userId: testUser.id,
        });
      });

      it('should blacklist existing token', async () => {
        const result = await db.blacklistRefreshToken(createdToken.token);
        expect(result).toBe(true);

        const found = await db.findRefreshToken(createdToken.token);
        expect(found.isBlacklisted).toBe(true);
      });

      it('should return false for non-existent token', async () => {
        const result = await db.blacklistRefreshToken('nonexistent-token');
        expect(result).toBe(false);
      });
    });

    describe('blacklistAllUserTokens', () => {
      beforeEach(async () => {
        // Create multiple tokens for the user
        for (let i = 0; i < 3; i++) {
          await db.createRefreshToken({
            token: crypto.randomBytes(32).toString('hex'),
            userId: testUser.id,
          });
        }

        // Create one already blacklisted token
        await db.createRefreshToken({
          token: crypto.randomBytes(32).toString('hex'),
          userId: testUser.id,
          isBlacklisted: true,
        });
      });

      it('should blacklist all active user tokens', async () => {
        const result = await db.blacklistAllUserTokens(testUser.id);
        expect(result.blacklistedCount).toBe(3);

        const activeTokens = await db.getUserActiveTokens(testUser.id);
        expect(activeTokens).toHaveLength(0);
      });

      it('should return zero for user with no active tokens', async () => {
        const anotherUser = await db.createUser({
          email: 'another@example.com',
          name: 'Another User',
          password: 'password',
        });

        const result = await db.blacklistAllUserTokens(anotherUser.id);
        expect(result.blacklistedCount).toBe(0);
      });
    });

    describe('getUserActiveTokens', () => {
      beforeEach(async () => {
        // Create active tokens
        for (let i = 0; i < 5; i++) {
          await db.createRefreshToken({
            token: crypto.randomBytes(32).toString('hex'),
            userId: testUser.id,
            deviceInfo: `Device ${i + 1}`,
          });
        }

        // Create blacklisted token
        await db.createRefreshToken({
          token: crypto.randomBytes(32).toString('hex'),
          userId: testUser.id,
          isBlacklisted: true,
        });
      });

      it('should return active tokens for user', async () => {
        const tokens = await db.getUserActiveTokens(testUser.id);
        expect(tokens).toHaveLength(5);
        tokens.forEach(token => {
          expect(token).toHaveProperty('deviceInfo');
          expect(token).toHaveProperty('ipAddress');
          expect(token).toHaveProperty('createdAt');
          expect(token).not.toHaveProperty('token'); // Sensitive data should not be included
        });
      });

      it('should respect limit parameter', async () => {
        const tokens = await db.getUserActiveTokens(testUser.id, 3);
        expect(tokens).toHaveLength(3);
      });

      it('should return empty array for user with no active tokens', async () => {
        await db.blacklistAllUserTokens(testUser.id);
        const tokens = await db.getUserActiveTokens(testUser.id);
        expect(tokens).toHaveLength(0);
      });
    });
  });

  describe('Email Verification Tokens', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await db.createUser({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password',
      });
    });

    describe('createEmailVerificationToken', () => {
      it('should create verification token', async () => {
        const token = crypto.randomBytes(32).toString('hex');
        const tokenData = await db.createEmailVerificationToken(testUser.id, token);

        expect(tokenData).toMatchObject({
          userId: testUser.id,
          token,
          used: false,
        });
        expect(tokenData.id).toBeDefined();
        expect(tokenData.expiresAt).toBeDefined();
        expect(tokenData.createdAt).toBeDefined();
      });

      it('should set expiration to 24 hours from now', async () => {
        const token = crypto.randomBytes(32).toString('hex');
        const tokenData = await db.createEmailVerificationToken(testUser.id, token);

        const expiresAt = new Date(tokenData.expiresAt);
        const expectedExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        // Allow 1 second tolerance for test execution time
        expect(Math.abs(expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
      });
    });

    describe('findEmailVerificationToken', () => {
      let createdToken;

      beforeEach(async () => {
        const token = crypto.randomBytes(32).toString('hex');
        createdToken = await db.createEmailVerificationToken(testUser.id, token);
      });

      it('should find token by value', async () => {
        const found = await db.findEmailVerificationToken(createdToken.token);
        expect(found).toEqual(createdToken);
      });

      it('should return null for non-existent token', async () => {
        const found = await db.findEmailVerificationToken('nonexistent-token');
        expect(found).toBeNull();
      });
    });

    describe('markEmailVerificationTokenUsed', () => {
      let createdToken;

      beforeEach(async () => {
        const token = crypto.randomBytes(32).toString('hex');
        createdToken = await db.createEmailVerificationToken(testUser.id, token);
      });

      it('should mark token as used', async () => {
        const result = await db.markEmailVerificationTokenUsed(createdToken.token);
        expect(result).toBe(true);

        const found = await db.findEmailVerificationToken(createdToken.token);
        expect(found.used).toBe(true);
      });

      it('should return false for non-existent token', async () => {
        const result = await db.markEmailVerificationTokenUsed('nonexistent-token');
        expect(result).toBe(false);
      });
    });
  });

  describe('Password Reset Tokens', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await db.createUser({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password',
      });
    });

    describe('createPasswordResetToken', () => {
      it('should create reset token', async () => {
        const token = crypto.randomBytes(32).toString('hex');
        const tokenData = await db.createPasswordResetToken(testUser.id, token);

        expect(tokenData).toMatchObject({
          userId: testUser.id,
          token,
          used: false,
        });
        expect(tokenData.id).toBeDefined();
        expect(tokenData.expiresAt).toBeDefined();
        expect(tokenData.createdAt).toBeDefined();
      });

      it('should set expiration to 1 hour from now', async () => {
        const token = crypto.randomBytes(32).toString('hex');
        const tokenData = await db.createPasswordResetToken(testUser.id, token);

        const expiresAt = new Date(tokenData.expiresAt);
        const expectedExpiry = new Date(Date.now() + 60 * 60 * 1000);
        
        // Allow 1 second tolerance for test execution time
        expect(Math.abs(expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
      });
    });
  });

  describe('Email Logs', () => {
    describe('logEmail', () => {
      it('should log email successfully', async () => {
        const emailData = {
          to: 'test@example.com',
          from: 'noreply@example.com',
          subject: 'Test Email',
          template: 'test',
        };

        const log = await db.logEmail(emailData);

        expect(log).toMatchObject({
          to: 'test@example.com',
          from: 'noreply@example.com',
          subject: 'Test Email',
          template: 'test',
          status: 'sent',
        });
        expect(log.id).toBeDefined();
        expect(log.sentAt).toBeDefined();
      });
    });

    describe('getEmailLogs', () => {
      beforeEach(async () => {
        await db.logEmail({
          to: 'user1@example.com',
          from: 'noreply@example.com',
          subject: 'Welcome',
          template: 'welcome',
        });
        
        await db.logEmail({
          to: 'user2@example.com',
          from: 'noreply@example.com',
          subject: 'Verify Email',
          template: 'verification',
        });
        
        await db.logEmail({
          to: 'user1@example.com',
          from: 'noreply@example.com',
          subject: 'Password Reset',
          template: 'passwordReset',
        });
      });

      it('should return all logs without filters', async () => {
        const logs = await db.getEmailLogs();
        expect(logs).toHaveLength(3);
      });

      it('should filter logs by recipient', async () => {
        const logs = await db.getEmailLogs({ to: 'user1@example.com' });
        expect(logs).toHaveLength(2);
        logs.forEach(log => {
          expect(log.to).toBe('user1@example.com');
        });
      });

      it('should filter logs by template', async () => {
        const logs = await db.getEmailLogs({ template: 'verification' });
        expect(logs).toHaveLength(1);
        expect(logs[0].template).toBe('verification');
      });
    });
  });

  describe('Test Utilities', () => {
    describe('reset', () => {
      it('should clear all data', async () => {
        // Add some data
        await db.createUser({ email: 'test@example.com', name: 'Test', password: 'pass' });
        await db.logEmail({ to: 'test@example.com', subject: 'Test' });

        // Reset
        await db.reset();

        // Verify all data is cleared
        const users = await db.getEmailLogs();
        expect(users).toHaveLength(0);
        
        const user = await db.findUserByEmail('test@example.com');
        expect(user).toBeNull();
      });
    });

    describe('seed', () => {
      it('should create seed data successfully', async () => {
        await db.seed();

        // Check users were created
        const testUser = await db.findUserByEmail('test@example.com');
        expect(testUser).toBeTruthy();
        expect(testUser.emailVerified).toBe(true);

        const unverifiedUser = await db.findUserByEmail('unverified@example.com');
        expect(unverifiedUser).toBeTruthy();
        expect(unverifiedUser.emailVerified).toBe(false);

        // Check refresh tokens were created
        const activeTokens = await db.getUserActiveTokens(1);
        expect(activeTokens.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Singleton testDb instance', () => {
    it('should be accessible and functional', async () => {
      await testDb.reset();
      
      const user = await testDb.createUser({
        email: 'singleton-test@example.com',
        name: 'Singleton Test',
        password: 'password',
      });

      expect(user).toBeTruthy();
      expect(user.email).toBe('singleton-test@example.com');
    });
  });
});