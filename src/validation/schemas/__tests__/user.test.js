const {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
  getUsersQuerySchema
} = require('../user');

describe('User Validation Schemas', () => {
  describe('updateProfileSchema', () => {
    it('should validate name update', () => {
      const { error } = updateProfileSchema.validate({ name: 'John Doe' });
      expect(error).toBeUndefined();
    });

    it('should validate email update', () => {
      const { error } = updateProfileSchema.validate({ email: 'new@example.com' });
      expect(error).toBeUndefined();
    });

    it('should validate both name and email update', () => {
      const data = { name: 'John Doe', email: 'new@example.com' };
      const { error } = updateProfileSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should reject empty object', () => {
      const { error } = updateProfileSchema.validate({});
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('At least one field (name or email) must be provided');
    });

    it('should reject invalid email', () => {
      const { error } = updateProfileSchema.validate({ email: 'invalid-email' });
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Please provide a valid email address');
    });

    it('should reject invalid name', () => {
      const { error } = updateProfileSchema.validate({ name: 'J' });
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Name must be at least 2 characters long');
    });

    it('should reject unknown fields', () => {
      const data = { name: 'John Doe', phone: '123-456-7890' };
      const { error } = updateProfileSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Unknown field');
    });
  });

  describe('changePasswordSchema', () => {
    const validPasswordData = {
      currentPassword: 'currentpass',
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!'
    };

    it('should validate password change data', () => {
      const { error } = changePasswordSchema.validate(validPasswordData);
      expect(error).toBeUndefined();
    });

    it('should reject when new passwords do not match', () => {
      const data = {
        ...validPasswordData,
        confirmPassword: 'DifferentPassword123!'
      };
      const { error } = changePasswordSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Password confirmation must match new password');
    });

    it('should reject when new password is same as current', () => {
      const data = {
        currentPassword: 'SamePassword123!',
        newPassword: 'SamePassword123!',
        confirmPassword: 'SamePassword123!'
      };
      const { error } = changePasswordSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('New password must be different from current password');
    });

    it('should reject weak new password', () => {
      const data = {
        ...validPasswordData,
        newPassword: 'weak',
        confirmPassword: 'weak'
      };
      const { error } = changePasswordSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Password must be at least 8 characters long');
    });

    it('should reject missing current password', () => {
      const { currentPassword, ...data } = validPasswordData;
      const { error } = changePasswordSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Password is required');
    });

    it('should reject missing new password', () => {
      const { newPassword, ...data } = validPasswordData;
      const { error } = changePasswordSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Password is required');
    });

    it('should reject missing confirm password', () => {
      const { confirmPassword, ...data } = validPasswordData;
      const { error } = changePasswordSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Password confirmation is required');
    });
  });

  describe('deleteAccountSchema', () => {
    const validDeleteData = {
      password: 'currentpassword',
      confirmation: 'DELETE'
    };

    it('should validate account deletion data', () => {
      const { error } = deleteAccountSchema.validate(validDeleteData);
      expect(error).toBeUndefined();
    });

    it('should reject incorrect confirmation', () => {
      const data = {
        ...validDeleteData,
        confirmation: 'delete'
      };
      const { error } = deleteAccountSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Confirmation must be exactly "DELETE"');
    });

    it('should reject missing confirmation', () => {
      const { confirmation, ...data } = validDeleteData;
      const { error } = deleteAccountSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Confirmation is required');
    });

    it('should reject missing password', () => {
      const { password, ...data } = validDeleteData;
      const { error } = deleteAccountSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Password is required');
    });

    it('should reject unknown fields', () => {
      const data = {
        ...validDeleteData,
        reason: 'Not satisfied'
      };
      const { error } = deleteAccountSchema.validate(data);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Unknown field');
    });
  });

  describe('getUsersQuerySchema', () => {
    it('should validate complete query parameters', () => {
      const query = { page: 2, limit: 20, search: 'john' };
      const { error, value } = getUsersQuerySchema.validate(query);
      expect(error).toBeUndefined();
      expect(value).toEqual(query);
    });

    it('should apply defaults for missing parameters', () => {
      const { error, value } = getUsersQuerySchema.validate({});
      expect(error).toBeUndefined();
      expect(value).toEqual({ page: 1, limit: 10 });
    });

    it('should validate with only search parameter', () => {
      const query = { search: 'test user' };
      const { error, value } = getUsersQuerySchema.validate(query);
      expect(error).toBeUndefined();
      expect(value).toEqual({ page: 1, limit: 10, search: 'test user' });
    });

    it('should reject invalid page number', () => {
      const { error } = getUsersQuerySchema.validate({ page: 0 });
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Page must be at least 1');
    });

    it('should reject limit above maximum', () => {
      const { error } = getUsersQuerySchema.validate({ limit: 101 });
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Limit must be at most 100');
    });

    it('should reject search term that is too long', () => {
      const longSearch = 'a'.repeat(101);
      const { error } = getUsersQuerySchema.validate({ search: longSearch });
      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Search term must be less than 100 characters');
    });
  });
});