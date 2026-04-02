const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  resendVerificationSchema
} = require('../auth');

describe('Auth Validation Schemas', () => {
  describe('registerSchema', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'John Doe',
      confirmPassword: 'Password123!'
    };

    it('should validate complete registration data', () => {
      const { error } = registerSchema.validate(validRegistrationData);
      expect(error).toBeUndefined();
    });

    it('should reject when passwords do not match', () => {
      const data = {
        ...validRegistrationData,
        confirmPassword: 'DifferentPassword123!'
      };
      const { error } = registerSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Password confirmation must match password');
    });

    it('should reject missing confirmPassword', () => {
      const { confirmPassword, ...data } = validRegistrationData;
      const { error } = registerSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Password confirmation is required');
    });

    it('should reject unknown fields', () => {
      const data = {
        ...validRegistrationData,
        unknownField: 'value'
      };
      const { error } = registerSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Unknown field');
    });

    it('should reject invalid email format', () => {
      const data = {
        ...validRegistrationData,
        email: 'invalid-email'
      };
      const { error } = registerSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Please provide a valid email address');
    });

    it('should reject weak password', () => {
      const data = {
        ...validRegistrationData,
        password: 'weak',
        confirmPassword: 'weak'
      };
      const { error } = registerSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Password must be at least 8 characters long');
    });

    it('should reject invalid name', () => {
      const data = {
        ...validRegistrationData,
        name: 'J'
      };
      const { error } = registerSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Name must be at least 2 characters long');
    });
  });

  describe('loginSchema', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'anypassword'
    };

    it('should validate complete login data', () => {
      const { error } = loginSchema.validate(validLoginData);
      expect(error).toBeUndefined();
    });

    it('should accept any password format for login', () => {
      const data = {
        ...validLoginData,
        password: 'weak'
      };
      const { error } = loginSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should reject missing email', () => {
      const { email, ...data } = validLoginData;
      const { error } = loginSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Email is required');
    });

    it('should reject missing password', () => {
      const { password, ...data } = validLoginData;
      const { error } = loginSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Password is required');
    });

    it('should reject unknown fields', () => {
      const data = {
        ...validLoginData,
        rememberMe: true
      };
      const { error } = loginSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Unknown field');
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should validate email', () => {
      const { error } = forgotPasswordSchema.validate({ email: 'test@example.com' });
      expect(error).toBeUndefined();
    });

    it('should reject invalid email', () => {
      const { error } = forgotPasswordSchema.validate({ email: 'invalid-email' });
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Please provide a valid email address');
    });

    it('should reject missing email', () => {
      const { error } = forgotPasswordSchema.validate({});
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Email is required');
    });

    it('should reject unknown fields', () => {
      const { error } = forgotPasswordSchema.validate({ 
        email: 'test@example.com',
        extraField: 'value'
      });
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Unknown field');
    });
  });

  describe('resetPasswordSchema', () => {
    const validResetData = {
      token: 'a'.repeat(32),
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!'
    };

    it('should validate complete reset data', () => {
      const { error } = resetPasswordSchema.validate(validResetData);
      expect(error).toBeUndefined();
    });

    it('should reject when passwords do not match', () => {
      const data = {
        ...validResetData,
        confirmPassword: 'DifferentPassword123!'
      };
      const { error } = resetPasswordSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Password confirmation must match new password');
    });

    it('should reject invalid token', () => {
      const data = {
        ...validResetData,
        token: 'short'
      };
      const { error } = resetPasswordSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Token must be at least 32 characters long');
    });

    it('should reject weak new password', () => {
      const data = {
        ...validResetData,
        newPassword: 'weak',
        confirmPassword: 'weak'
      };
      const { error } = resetPasswordSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Password must be at least 8 characters long');
    });
  });

  describe('verifyEmailSchema', () => {
    it('should validate token', () => {
      const token = 'a'.repeat(32);
      const { error } = verifyEmailSchema.validate({ token });
      expect(error).toBeUndefined();
    });

    it('should reject invalid token', () => {
      const { error } = verifyEmailSchema.validate({ token: 'short' });
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Token must be at least 32 characters long');
    });

    it('should reject missing token', () => {
      const { error } = verifyEmailSchema.validate({});
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Token is required');
    });
  });

  describe('refreshTokenSchema', () => {
    it('should validate JWT token', () => {
      const refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const { error } = refreshTokenSchema.validate({ refreshToken });
      expect(error).toBeUndefined();
    });

    it('should reject short token', () => {
      const { error } = refreshTokenSchema.validate({ refreshToken: 'short' });
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Invalid token format');
    });

    it('should reject missing token', () => {
      const { error } = refreshTokenSchema.validate({});
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Token is required');
    });
  });

  describe('resendVerificationSchema', () => {
    it('should validate email', () => {
      const { error } = resendVerificationSchema.validate({ email: 'test@example.com' });
      expect(error).toBeUndefined();
    });

    it('should reject invalid email', () => {
      const { error } = resendVerificationSchema.validate({ email: 'invalid' });
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Please provide a valid email address');
    });

    it('should reject missing email', () => {
      const { error } = resendVerificationSchema.validate({});
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Email is required');
    });
  });
});