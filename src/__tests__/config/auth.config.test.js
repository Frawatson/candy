const authConfig = require('../../config/auth.config');

describe('Auth Configuration', () => {
  describe('JWT Configuration', () => {
    it('should have all required JWT properties', () => {
      expect(authConfig.jwt).toHaveProperty('secret');
      expect(authConfig.jwt).toHaveProperty('refreshSecret');
      expect(authConfig.jwt).toHaveProperty('expiresIn');
      expect(authConfig.jwt).toHaveProperty('refreshExpiresIn');
      expect(authConfig.jwt).toHaveProperty('issuer');
      expect(authConfig.jwt).toHaveProperty('audience');
    });

    it('should use environment variables when available', () => {
      expect(authConfig.jwt.secret).toBe('test-jwt-secret');
      expect(authConfig.jwt.refreshSecret).toBe('test-refresh-secret');
    });

    it('should have secure default values', () => {
      expect(authConfig.jwt.issuer).toBe('AgentFlow-Auth');
      expect(authConfig.jwt.audience).toBe('AgentFlow-Users');
    });
  });

  describe('Password Configuration', () => {
    it('should have secure password requirements', () => {
      expect(authConfig.password.saltRounds).toBeGreaterThanOrEqual(4);
      expect(authConfig.password.minLength).toBeGreaterThanOrEqual(8);
      expect(authConfig.password.requireUppercase).toBe(true);
      expect(authConfig.password.requireLowercase).toBe(true);
      expect(authConfig.password.requireNumbers).toBe(true);
      expect(authConfig.password.requireSpecialChars).toBe(true);
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should have reasonable rate limiting settings', () => {
      expect(authConfig.rateLimit.windowMs).toBeGreaterThan(0);
      expect(authConfig.rateLimit.maxAttempts).toBeGreaterThan(0);
    });
  });

  describe('Security Configuration', () => {
    it('should have security settings', () => {
      expect(authConfig.security.maxLoginAttempts).toBe(5);
      expect(authConfig.security.lockoutDuration).toBeGreaterThan(0);
      expect(authConfig.security.tokenBlacklist).toBeInstanceOf(Set);
    });
  });
});