const PasswordUtils = require('../../utils/passwordUtils');
const bcrypt = require('bcrypt');
const { ValidationError } = require('../../utils/errorTypes');

jest.mock('../../config/jwt', () => ({
  BCRYPT_ROUNDS: 12
}));

describe('PasswordUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const hashedPassword = 'hashed-password-result';
      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword);

      const result = await PasswordUtils.hashPassword('plaintext');

      expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', 12);
      expect(result).toBe(hashedPassword);
    });

    it('should throw error when bcrypt fails', async () => {
      const bcryptError = new Error('Bcrypt failed');
      jest.spyOn(bcrypt, 'hash').mockRejectedValue(bcryptError);

      await expect(PasswordUtils.hashPassword('plaintext')).rejects.toThrow(
        'Password hashing failed: Bcrypt failed'
      );
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const result = await PasswordUtils.comparePassword('plaintext', 'hashed');

      expect(bcrypt.compare).toHaveBeenCalledWith('plaintext', 'hashed');
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      const result = await PasswordUtils.comparePassword('wrong', 'hashed');

      expect(result).toBe(false);
    });

    it('should throw error when bcrypt fails', async () => {
      const bcryptError = new Error('Compare failed');
      jest.spyOn(bcrypt, 'compare').mockRejectedValue(bcryptError);

      await expect(PasswordUtils.comparePassword('plain', 'hashed')).rejects.toThrow(
        'Password comparison failed: Compare failed'
      );
    });
  });

  describe('validatePasswordStrength', () => {
    it('should return empty array for strong password', () => {
      const strongPassword = 'StrongP@ssw0rd123';
      const errors = PasswordUtils.validatePasswordStrength(strongPassword);
      
      expect(errors).toEqual([]);
    });

    it('should return error for undefined password', () => {
      const errors = PasswordUtils.validatePasswordStrength(undefined);
      
      expect(errors).toContain('Password is required');
    });

    it('should return error for null password', () => {
      const errors = PasswordUtils.validatePasswordStrength(null);
      
      expect(errors).toContain('Password is required');
    });

    it('should return error for empty password', () => {
      const errors = PasswordUtils.validatePasswordStrength('');
      
      expect(errors).toContain('Password is required');
    });

    it('should return error for password too short', () => {
      const errors = PasswordUtils.validatePasswordStrength('Short1!');
      
      expect(errors).toContain('Password must be at least 8 characters long');
    });

    it('should return error for password too long', () => {
      const longPassword = 'A'.repeat(129) + 'a1!';
      const errors = PasswordUtils.validatePasswordStrength(longPassword);
      
      expect(errors).toContain('Password must be less than 128 characters long');
    });

    it('should return error for password without lowercase', () => {
      const errors = PasswordUtils.validatePasswordStrength('UPPERCASE123!');
      
      expect(errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should return error for password without uppercase', () => {
      const errors = PasswordUtils.validatePasswordStrength('lowercase123!');
      
      expect(errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should return error for password without numbers', () => {
      const errors = PasswordUtils.validatePasswordStrength('PasswordWithout!');
      
      expect(errors).toContain('Password must contain at least one number');
    });

    it('should return error for password without special characters', () => {
      const errors = PasswordUtils.validatePasswordStrength('Password123');
      
      expect(errors).toContain('Password must contain at least one special character');
    });

    it('should return error for common weak passwords', () => {
      const weakPasswords = ['password', 'password123', '123456', 'qwerty'];
      
      weakPasswords.forEach(weakPassword => {
        const errors = PasswordUtils.validatePasswordStrength(weakPassword);
        expect(errors).toContain('Password is too common. Please choose a more secure password');
      });
    });

    it('should return multiple errors for very weak password', () => {
      const errors = PasswordUtils.validatePasswordStrength('pass');
      
      expect(errors).toHaveLength(4); // short, no uppercase, no number, no special char
      expect(errors).toContain('Password must be at least 8 characters long');
      expect(errors).toContain('Password must contain at least one uppercase letter');
      expect(errors).toContain('Password must contain at least one number');
      expect(errors).toContain('Password must contain at least one special character');
    });

    it('should handle case insensitive common password detection', () => {
      const errors = PasswordUtils.validatePasswordStrength('PASSWORD123');
      
      expect(errors).toContain('Password is too common. Please choose a more secure password');
    });
  });

  describe('validatePasswordOrThrow', () => {
    it('should not throw for strong password', () => {
      expect(() => {
        PasswordUtils.validatePasswordOrThrow('StrongP@ssw0rd123');
      }).not.toThrow();
    });

    it('should throw ValidationError for weak password', () => {
      expect(() => {
        PasswordUtils.validatePasswordOrThrow('weak');
      }).toThrow(ValidationError);
    });

    it('should include all validation errors in thrown message', () => {
      expect(() => {
        PasswordUtils.validatePasswordOrThrow('weak');
      }).toThrow(expect.objectContaining({
        message: expect.stringContaining('Password validation failed:')
      }));
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password with default length of 16', () => {
      const password = PasswordUtils.generateSecurePassword();
      
      expect(password).toHaveLength(16);
      expect(typeof password).toBe('string');
    });

    it('should generate password with custom length', () => {
      const password = PasswordUtils.generateSecurePassword(24);
      
      expect(password).toHaveLength(24);
    });

    it('should generate password that passes strength validation', () => {
      const password = PasswordUtils.generateSecurePassword();
      const errors = PasswordUtils.validatePasswordStrength(password);
      
      expect(errors).toEqual([]);
    });

    it('should generate different passwords on multiple calls', () => {
      const password1 = PasswordUtils.generateSecurePassword();
      const password2 = PasswordUtils.generateSecurePassword();
      
      expect(password1).not.toBe(password2);
    });

    it('should contain all required character types', () => {
      const password = PasswordUtils.generateSecurePassword(20);
      
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/\d/.test(password)).toBe(true);
      expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)).toBe(true);
    });
  });

  describe('needsRehash', () => {
    it('should return false when rounds match current setting', () => {
      jest.spyOn(bcrypt, 'getRounds').mockReturnValue(12);
      
      const result = PasswordUtils.needsRehash('hashed-password');
      
      expect(bcrypt.getRounds).toHaveBeenCalledWith('hashed-password');
      expect(result).toBe(false);
    });

    it('should return true when rounds do not match current setting', () => {
      jest.spyOn(bcrypt, 'getRounds').mockReturnValue(10);
      
      const result = PasswordUtils.needsRehash('hashed-password');
      
      expect(result).toBe(true);
    });

    it('should return true when getRounds throws error', () => {
      jest.spyOn(bcrypt, 'getRounds').mockImplementation(() => {
        throw new Error('Invalid hash');
      });
      
      const result = PasswordUtils.needsRehash('invalid-hash');
      
      expect(result).toBe(true);
    });

    it('should return true for malformed hash', () => {
      jest.spyOn(bcrypt, 'getRounds').mockImplementation(() => {
        throw new Error('Malformed hash');
      });
      
      const result = PasswordUtils.needsRehash('not-a-hash');
      
      expect(result).toBe(true);
    });
  });
});