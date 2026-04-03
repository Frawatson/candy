const {
  isValidEmail,
  sanitizeEmail,
  isDisposableEmail,
  isValidDomain,
  validateEmail,
  DISPOSABLE_DOMAINS
} = require('../../src/utils/emailValidator');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Email Validator', () => {
  describe('isValidEmail', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'first+last@subdomain.example.org',
      'test123@test-domain.com',
      'user_name@example-domain.com',
      'a@b.co'
    ];

    const invalidEmails = [
      '',
      null,
      undefined,
      'invalid',
      '@example.com',
      'test@',
      'test..test@example.com',
      '.test@example.com',
      'test.@example.com',
      'test@.example.com',
      'test@example..com',
      'a'.repeat(65) + '@example.com', // local part too long
      'test@' + 'a'.repeat(254) + '.com', // domain too long
      'a'.repeat(321) + '@example.com' // total too long
    ];

    validEmails.forEach(email => {
      it(`should validate ${email} as valid`, () => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    invalidEmails.forEach(email => {
      it(`should validate ${email} as invalid`, () => {
        expect(isValidEmail(email)).toBe(false);
      });
    });

    it('should handle non-string input', () => {
      expect(isValidEmail(123)).toBe(false);
      expect(isValidEmail({})).toBe(false);
      expect(isValidEmail([])).toBe(false);
    });

    it('should handle errors gracefully', () => {
      // Mock a scenario that might cause an error
      const mockEmail = { toString: () => { throw new Error('Test error'); } };
      expect(isValidEmail(mockEmail)).toBe(false);
    });
  });

  describe('sanitizeEmail', () => {
    it('should trim whitespace and convert to lowercase', () => {
      expect(sanitizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
    });

    it('should remove control characters', () => {
      expect(sanitizeEmail('test\x00@example.com')).toBe('test@example.com');
      expect(sanitizeEmail('test\x1F@example.com')).toBe('test@example.com');
    });

    it('should normalize unicode characters', () => {
      expect(sanitizeEmail('tëst@éxample.com')).toBe('tëst@éxample.com');
    });

    it('should handle empty or invalid input', () => {
      expect(sanitizeEmail('')).toBe('');
      expect(sanitizeEmail(null)).toBe('');
      expect(sanitizeEmail(undefined)).toBe('');
      expect(sanitizeEmail(123)).toBe('');
    });

    it('should handle errors gracefully', () => {
      const mockEmail = { toString: () => { throw new Error('Test error'); } };
      expect(sanitizeEmail(mockEmail)).toBe('');
    });
  });

  describe('isDisposableEmail', () => {
    it('should identify disposable email domains', () => {
      expect(isDisposableEmail('test@10minutemail.com')).toBe(true);
      expect(isDisposableEmail('user@mailinator.com')).toBe(true);
      expect(isDisposableEmail('temp@tempmail.org')).toBe(true);
    });

    it('should not flag legitimate email domains', () => {
      expect(isDisposableEmail('test@gmail.com')).toBe(false);
      expect(isDisposableEmail('user@outlook.com')).toBe(false);
      expect(isDisposableEmail('work@company.com')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(isDisposableEmail('TEST@MAILINATOR.COM')).toBe(true);
    });

    it('should handle invalid input', () => {
      expect(isDisposableEmail('')).toBe(false);
      expect(isDisposableEmail(null)).toBe(false);
      expect(isDisposableEmail(undefined)).toBe(false);
      expect(isDisposableEmail('invalid-email')).toBe(false);
    });

    it('should handle errors gracefully', () => {
      const mockEmail = { toString: () => { throw new Error('Test error'); } };
      expect(isDisposableEmail(mockEmail)).toBe(false);
    });
  });

  describe('isValidDomain', () => {
    const validDomains = [
      'example.com',
      'sub.example.com',
      'test-domain.co.uk',
      'a.b.c.d.example.org',
      '123example.com'
    ];

    const invalidDomains = [
      '',
      null,
      undefined,
      'single',
      '.example.com',
      'example.com.',
      '-example.com',
      'example-.com',
      'ex..ample.com',
      'a'.repeat(254) + '.com', // too long
      'example.' + 'a'.repeat(64), // label too long
      'example.123', // numeric TLD
      'example.a' // TLD too short
    ];

    validDomains.forEach(domain => {
      it(`should validate ${domain} as valid domain`, () => {
        expect(isValidDomain(domain)).toBe(true);
      });
    });

    invalidDomains.forEach(domain => {
      it(`should validate ${domain} as invalid domain`, () => {
        expect(isValidDomain(domain)).toBe(false);
      });
    });

    it('should handle non-string input', () => {
      expect(isValidDomain(123)).toBe(false);
      expect(isValidDomain({})).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should return valid result for good email', () => {
      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toBe('test@example.com');
    });

    it('should return invalid result for bad email format', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should return invalid result for disposable email when not allowed', () => {
      const result = validateEmail('test@mailinator.com', { allowDisposable: false });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Disposable email addresses are not allowed');
    });

    it('should allow disposable email when explicitly allowed', () => {
      const result = validateEmail('test@mailinator.com', { allowDisposable: true });
      expect(result.isValid).toBe(true);
    });

    it('should sanitize email in result', () => {
      const result = validateEmail('  TEST@EXAMPLE.COM  ');
      expect(result.sanitized).toBe('test@example.com');
    });

    it('should return error for empty email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email address is required');
    });

    it('should return error for invalid domain', () => {
      const result = validateEmail('test@invalid-domain');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email domain');
    });

    it('should handle multiple validation errors', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle exceptions gracefully', () => {
      // Mock validateEmail to throw an error during processing
      const originalSanitize = sanitizeEmail;
      require('../../src/utils/emailValidator').sanitizeEmail = () => {
        throw new Error('Test error');
      };

      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email validation failed');

      // Restore original function
      require('../../src/utils/emailValidator').sanitizeEmail = originalSanitize;
    });
  });

  describe('DISPOSABLE_DOMAINS', () => {
    it('should export array of disposable domains', () => {
      expect(Array.isArray(DISPOSABLE_DOMAINS)).toBe(true);
      expect(DISPOSABLE_DOMAINS.length).toBeGreaterThan(0);
      expect(DISPOSABLE_DOMAINS).toContain('mailinator.com');
      expect(DISPOSABLE_DOMAINS).toContain('10minutemail.com');
    });
  });
});