const PasswordUtil = require('../../utils/password.util');
const bcrypt = require('bcryptjs');

// Mock bcryptjs
jest.mock('bcryptjs');

describe('PasswordUtil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'TestPassword123!';
      const salt = 'mockedSalt';
      const hashedPassword = 'mockedHashedPassword';

      bcrypt.genSalt.mockResolvedValue(salt);
      bcrypt.hash.mockResolvedValue(hashedPassword);

      const result = await PasswordUtil.hashPassword(password);

      expect(bcrypt.genSalt).toHaveBeenCalledWith(4);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, salt);
      expect(result).toBe(hashedPassword);
    });

    it('should throw error when hashing fails', async () => {
      bcrypt.genSalt.mockRejectedValue(new Error('Hashing failed'));

      await expect(PasswordUtil.hashPassword('password')).rejects.toThrow('Password hashing failed');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'TestPassword123!';
      const hash = 'hashedPassword';

      bcrypt.compare.mockResolvedValue(true);

      const result = await PasswordUtil.comparePassword(password, hash);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'TestPassword123!';
      const hash = 'hashedPassword';

      bcrypt.compare.mockResolvedValue(false);

      const result = await PasswordUtil.comparePassword(password, hash);

      expect(result).toBe(false);
    });

    it('should throw error when comparison fails', async () => {
      bcrypt.compare.mockRejectedValue(new Error('Compare failed'));

      await expect(PasswordUtil.comparePassword('password', 'hash')).rejects.toThrow('Password comparison failed');
    });
  });

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const strongPassword = 'TestPassword123!';

      const result = PasswordUtil.validatePassword(strongPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const shortPassword = 'Test1!';

      const result = PasswordUtil.validatePassword(shortPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase letter', () => {
      const password = 'testpassword123!';

      const result = PasswordUtil.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const password = 'TESTPASSWORD123!';

      const result = PasswordUtil.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without numbers', () => {
      const password = 'TestPassword!';

      const result = PasswordUtil.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special characters', () => {
      const password = 'TestPassword123';

      const result = PasswordUtil.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject common passwords', () => {
      const commonPassword = 'password123';

      const result = PasswordUtil.validatePassword(commonPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common. Please choose a more secure password');
    });

    it('should handle null or undefined password', () => {
      const result = PasswordUtil.validatePassword(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });
  });

  describe('isCommonPassword', () => {
    it('should detect common passwords', () => {
      const commonPasswords = ['password', '123456', 'qwerty'];

      commonPasswords.forEach(password => {
        expect(PasswordUtil.isCommonPassword(password)).toBe(true);
      });
    });

    it('should detect common passwords case-insensitively', () => {
      expect(PasswordUtil.isCommonPassword('PASSWORD')).toBe(true);
      expect(PasswordUtil.isCommonPassword('Password')).toBe(true);
    });

    it('should not flag secure passwords as common', () => {
      const securePasswords = ['SecurePassword123!', 'MyUniquePass456$'];

      securePasswords.forEach(password => {
        expect(PasswordUtil.isCommonPassword(password)).toBe(false);
      });
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password with default length', () => {
      const password = PasswordUtil.generateSecurePassword();

      expect(password).toHaveLength(12);
    });

    it('should generate password with specified length', () => {
      const length = 16;
      const password = PasswordUtil.generateSecurePassword(length);

      expect(password).toHaveLength(length);
    });

    it('should generate password with all character types', () => {
      const password = PasswordUtil.generateSecurePassword(20);

      expect(password).toMatch(/[A-Z]/); // Uppercase
      expect(password).toMatch(/[a-z]/); // Lowercase
      expect(password).toMatch(/\d/); // Numbers
      expect(password).toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/); // Special chars
    });

    it('should generate unique passwords', () => {
      const password1 = PasswordUtil.generateSecurePassword();
      const password2 = PasswordUtil.generateSecurePassword();

      expect(password1).not.toBe(password2);
    });
  });
});