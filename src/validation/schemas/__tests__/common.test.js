const { 
  email, 
  password, 
  loginPassword, 
  name, 
  optionalName, 
  token, 
  jwtToken, 
  page, 
  limit, 
  search, 
  paginationQuery 
} = require('../common');

describe('Common Validation Schemas', () => {
  describe('email schema', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@domain.org',
        'a@b.co'
      ];

      validEmails.forEach(emailValue => {
        const { error, value } = email.validate(emailValue);
        expect(error).toBeUndefined();
        expect(value).toBe(emailValue.toLowerCase());
      });
    });

    it('should convert email to lowercase', () => {
      const { error, value } = email.validate('TEST@EXAMPLE.COM');
      expect(error).toBeUndefined();
      expect(value).toBe('test@example.com');
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user..double@domain.com',
        'user@domain..com'
      ];

      invalidEmails.forEach(emailValue => {
        const { error } = email.validate(emailValue);
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Please provide a valid email address');
      });
    });

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const { error } = email.validate(longEmail);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Email address must be less than 254 characters');
    });

    it('should require email to be present', () => {
      const { error } = email.validate(undefined);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Email is required');
    });
  });

  describe('password schema', () => {
    it('should validate strong passwords', () => {
      const validPasswords = [
        'Password123!',
        'MyStr0ng@Pass',
        'Complex1$Password',
        'Test123&'
      ];

      validPasswords.forEach(pass => {
        const { error } = password.validate(pass);
        expect(error).toBeUndefined();
      });
    });

    it('should reject passwords missing uppercase letters', () => {
      const { error } = password.validate('password123!');
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('at least one lowercase letter, one uppercase letter');
    });

    it('should reject passwords missing lowercase letters', () => {
      const { error } = password.validate('PASSWORD123!');
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('at least one lowercase letter, one uppercase letter');
    });

    it('should reject passwords missing numbers', () => {
      const { error } = password.validate('Password!');
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('at least one lowercase letter, one uppercase letter');
    });

    it('should reject passwords missing special characters', () => {
      const { error } = password.validate('Password123');
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('at least one lowercase letter, one uppercase letter');
    });

    it('should reject passwords that are too short', () => {
      const { error } = password.validate('Pass1!');
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Password must be at least 8 characters long');
    });

    it('should reject passwords that are too long', () => {
      const longPassword = 'Password123!' + 'a'.repeat(120);
      const { error } = password.validate(longPassword);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Password must be less than 128 characters');
    });

    it('should require password to be present', () => {
      const { error } = password.validate(undefined);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Password is required');
    });
  });

  describe('loginPassword schema', () => {
    it('should validate any non-empty password', () => {
      const passwords = ['weak', 'Password123!', 'a'];
      
      passwords.forEach(pass => {
        const { error } = loginPassword.validate(pass);
        expect(error).toBeUndefined();
      });
    });

    it('should reject empty passwords', () => {
      const { error } = loginPassword.validate('');
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Password is required');
    });

    it('should reject passwords that are too long', () => {
      const longPassword = 'a'.repeat(130);
      const { error } = loginPassword.validate(longPassword);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Password must be less than 128 characters');
    });
  });

  describe('name schema', () => {
    it('should validate proper names', () => {
      const validNames = [
        'John Doe',
        'Mary-Jane Watson',
        "O'Connor",
        'Jean-Pierre',
        'Anna Maria'
      ];

      validNames.forEach(nameValue => {
        const { error, value } = name.validate(nameValue);
        expect(error).toBeUndefined();
        expect(value).toBe(nameValue.trim());
      });
    });

    it('should trim whitespace from names', () => {
      const { error, value } = name.validate('  John Doe  ');
      expect(error).toBeUndefined();
      expect(value).toBe('John Doe');
    });

    it('should reject names with invalid characters', () => {
      const invalidNames = [
        'John123',
        'John@Doe',
        'John.Doe',
        'John_Doe',
        'John#Doe'
      ];

      invalidNames.forEach(nameValue => {
        const { error } = name.validate(nameValue);
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Name can only contain letters, spaces, hyphens, and apostrophes');
      });
    });

    it('should reject names that are too short', () => {
      const { error } = name.validate('A');
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Name must be at least 2 characters long');
    });

    it('should reject names that are too long', () => {
      const longName = 'A'.repeat(101);
      const { error } = name.validate(longName);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Name must be less than 100 characters');
    });
  });

  describe('optionalName schema', () => {
    it('should accept valid names', () => {
      const { error } = optionalName.validate('John Doe');
      expect(error).toBeUndefined();
    });

    it('should accept undefined values', () => {
      const { error } = optionalName.validate(undefined);
      expect(error).toBeUndefined();
    });
  });

  describe('token schema', () => {
    it('should validate proper tokens', () => {
      const validToken = 'a'.repeat(32);
      const { error } = token.validate(validToken);
      expect(error).toBeUndefined();
    });

    it('should reject tokens that are too short', () => {
      const shortToken = 'a'.repeat(31);
      const { error } = token.validate(shortToken);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Token must be at least 32 characters long');
    });

    it('should reject tokens that are too long', () => {
      const longToken = 'a'.repeat(257);
      const { error } = token.validate(longToken);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Token must be less than 256 characters');
    });

    it('should reject tokens with non-alphanumeric characters', () => {
      const invalidToken = 'a'.repeat(31) + '!';
      const { error } = token.validate(invalidToken);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Token must contain only letters and numbers');
    });
  });

  describe('jwtToken schema', () => {
    it('should validate JWT-like tokens', () => {
      const validJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const { error } = jwtToken.validate(validJwtToken);
      expect(error).toBeUndefined();
    });

    it('should reject tokens that are too short', () => {
      const shortToken = 'short';
      const { error } = jwtToken.validate(shortToken);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Invalid token format');
    });

    it('should reject tokens that are too long', () => {
      const longToken = 'a'.repeat(2049);
      const { error } = jwtToken.validate(longToken);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Token too long');
    });
  });

  describe('pagination schemas', () => {
    describe('page schema', () => {
      it('should validate positive integers', () => {
        const { error, value } = page.validate(5);
        expect(error).toBeUndefined();
        expect(value).toBe(5);
      });

      it('should default to 1 when not provided', () => {
        const { error, value } = page.validate(undefined);
        expect(error).toBeUndefined();
        expect(value).toBe(1);
      });

      it('should reject zero and negative numbers', () => {
        const { error } = page.validate(0);
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Page must be at least 1');
      });

      it('should reject non-integers', () => {
        const { error } = page.validate(1.5);
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Page must be an integer');
      });
    });

    describe('limit schema', () => {
      it('should validate numbers within range', () => {
        const { error, value } = limit.validate(25);
        expect(error).toBeUndefined();
        expect(value).toBe(25);
      });

      it('should default to 10 when not provided', () => {
        const { error, value } = limit.validate(undefined);
        expect(error).toBeUndefined();
        expect(value).toBe(10);
      });

      it('should reject numbers above 100', () => {
        const { error } = limit.validate(101);
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Limit must be at most 100');
      });
    });

    describe('search schema', () => {
      it('should validate search terms', () => {
        const { error, value } = search.validate('test query');
        expect(error).toBeUndefined();
        expect(value).toBe('test query');
      });

      it('should trim search terms', () => {
        const { error, value } = search.validate('  test  ');
        expect(error).toBeUndefined();
        expect(value).toBe('test');
      });

      it('should accept undefined values', () => {
        const { error } = search.validate(undefined);
        expect(error).toBeUndefined();
      });

      it('should reject search terms that are too long', () => {
        const longSearch = 'a'.repeat(101);
        const { error } = search.validate(longSearch);
        expect(error).toBeDefined();
        expect(error.details[0].message).toBe('Search term must be less than 100 characters');
      });
    });

    describe('paginationQuery schema', () => {
      it('should validate complete pagination query', () => {
        const query = { page: 2, limit: 20, search: 'test' };
        const { error, value } = paginationQuery.validate(query);
        expect(error).toBeUndefined();
        expect(value).toEqual(query);
      });

      it('should apply defaults for missing values', () => {
        const { error, value } = paginationQuery.validate({});
        expect(error).toBeUndefined();
        expect(value).toEqual({ page: 1, limit: 10 });
      });
    });
  });
});