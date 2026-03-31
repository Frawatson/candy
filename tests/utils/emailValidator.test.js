const { isValidEmail, sanitizeEmail, validateEmailDomain } = require('../../src/utils/emailValidator');

describe('EmailValidator', () => {
  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'firstname-lastname@example.com',
        'test123@test-domain.com'
      ];

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        '',
        null,
        undefined,
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
        'test@.com',
        'test @example.com',
        'test@example..com'
      ];

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });

    it('should reject emails with local part too long', () => {
      const longLocalEmail = 'a'.repeat(65) + '@example.com';
      expect(isValidEmail(longLocalEmail)).toBe(false);
    });
  });

  describe('sanitizeEmail', () => {
    it('should trim and lowercase emails', () => {
      expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
      expect(sanitizeEmail('User@Domain.Org')).toBe('user@domain.org');
    });

    it('should handle invalid inputs', () => {
      expect(sanitizeEmail(null)).toBe('');
      expect(sanitizeEmail(undefined)).toBe('');
      expect(sanitizeEmail(123)).toBe('');
    });

    it('should preserve valid email structure', () => {
      expect(sanitizeEmail('user+tag@example.com')).toBe('user+tag@example.com');
      expect(sanitizeEmail('first.last@sub.domain.com')).toBe('first.last@sub.domain.com');
    });
  });

  describe('validateEmailDomain', () => {
    it('should validate emails with valid domains', () => {
      const validEmails = [
        'test@example.com',
        'user@sub.domain.co.uk',
        'test@single-word-domain.com',
        'user@123domain.org'
      ];

      validEmails.forEach(email => {
        expect(validateEmailDomain(email)).toBe(true);
      });
    });

    it('should reject emails with invalid domains', () => {
      const invalidEmails = [
        'test@.com',
        'test@domain.',
        'test@domain..com',
        'test@-domain.com',
        'test@domain-.com',
        'invalid-email'
      ];

      invalidEmails.forEach(email => {
        expect(validateEmailDomain(email)).toBe(false);
      });
    });

    it('should reject domains that are too long', () => {
      const longDomain = 'a'.repeat(254) + '.com';
      const email = `test@${longDomain}`;
      expect(validateEmailDomain(email)).toBe(false);
    });
  });
});