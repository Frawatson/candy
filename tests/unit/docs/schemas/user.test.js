const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

describe('User Schema Documentation', () => {
  let specs;

  beforeAll(() => {
    const options = {
      definition: {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' }
      },
      apis: [path.join(__dirname, '../../../../docs/schemas/user.js')]
    };
    specs = swaggerJsdoc(options);
  });

  describe('User Management Request Schemas', () => {
    it('should define ChangePasswordRequest schema correctly', () => {
      const schema = specs.components.schemas.ChangePasswordRequest;
      
      expect(schema).toBeDefined();
      expect(schema.required).toEqual(['currentPassword', 'newPassword']);
      
      expect(schema.properties.currentPassword.format).toBe('password');
      expect(schema.properties.newPassword.format).toBe('password');
      expect(schema.properties.newPassword.minLength).toBe(8);
    });

    it('should define UpdateProfileRequest schema correctly', () => {
      const schema = specs.components.schemas.UpdateProfileRequest;
      
      expect(schema).toBeDefined();
      expect(schema.properties.name).toBeDefined();
      expect(schema.properties.name.minLength).toBe(2);
      expect(schema.properties.name.maxLength).toBe(50);
      
      expect(schema.properties.email).toBeDefined();
      expect(schema.properties.email.format).toBe('email');
    });

    it('should define UserListQuery schema correctly', () => {
      const schema = specs.components.schemas.UserListQuery;
      
      expect(schema).toBeDefined();
      expect(schema.properties.page).toBeDefined();
      expect(schema.properties.page.minimum).toBe(1);
      expect(schema.properties.page.default).toBe(1);
      
      expect(schema.properties.limit).toBeDefined();
      expect(schema.properties.limit.minimum).toBe(1);
      expect(schema.properties.limit.maximum).toBe(100);
      expect(schema.properties.limit.default).toBe(10);
      
      expect(schema.properties.sortBy).toBeDefined();
      expect(schema.properties.sortBy.enum).toContain('name');
      expect(schema.properties.sortBy.enum).toContain('email');
      expect(schema.properties.sortBy.enum).toContain('createdAt');
      
      expect(schema.properties.sortOrder).toBeDefined();
      expect(schema.properties.sortOrder.enum).toEqual(['asc', 'desc']);
    });
  });

  describe('User Response Schemas', () => {
    it('should define UserProfile schema correctly', () => {
      const schema = specs.components.schemas.UserProfile;
      
      expect(schema).toBeDefined();
      expect(schema.properties.id).toBeDefined();
      expect(schema.properties.email).toBeDefined();
      expect(schema.properties.name).toBeDefined();
      expect(schema.properties.emailVerified).toBeDefined();
      expect(schema.properties.createdAt).toBeDefined();
      expect(schema.properties.updatedAt).toBeDefined();
      
      expect(schema.properties.createdAt.format).toBe('date-time');
      expect(schema.properties.updatedAt.format).toBe('date-time');
    });

    it('should define PaginationMeta schema correctly', () => {
      const schema = specs.components.schemas.PaginationMeta;
      
      expect(schema).toBeDefined();
      
      const requiredFields = ['page', 'limit', 'total', 'pages', 'hasNext', 'hasPrev'];
      requiredFields.forEach(field => {
        expect(schema.properties[field]).toBeDefined();
      });
      
      expect(schema.properties.hasNext.type).toBe('boolean');
      expect(schema.properties.hasPrev.type).toBe('boolean');
    });

    it('should define composite response schemas correctly', () => {
      const responseSchemas = [
        'UserListResponse',
        'UserProfileResponse',
        'ChangePasswordResponse',
        'DeleteAccountResponse'
      ];

      responseSchemas.forEach(schemaName => {
        const schema = specs.components.schemas[schemaName];
        expect(schema).toBeDefined();
        expect(schema.allOf).toBeDefined();
        expect(schema.allOf[0].$ref).toBe('#/components/schemas/SuccessResponse');
      });
    });
  });

  describe('Schema Validation Rules', () => {
    it('should have proper validation constraints', () => {
      const updateProfileSchema = specs.components.schemas.UpdateProfileRequest;
      
      // Name validation
      expect(updateProfileSchema.properties.name.minLength).toBe(2);
      expect(updateProfileSchema.properties.name.maxLength).toBe(50);
      
      // Email validation
      expect(updateProfileSchema.properties.email.format).toBe('email');
    });

    it('should have appropriate query parameter constraints', () => {
      const querySchema = specs.components.schemas.UserListQuery;
      
      // Pagination constraints
      expect(querySchema.properties.page.minimum).toBe(1);
      expect(querySchema.properties.limit.minimum).toBe(1);
      expect(querySchema.properties.limit.maximum).toBe(100);
      
      // Sort validation
      expect(querySchema.properties.sortBy.enum).toHaveLength(3);
      expect(querySchema.properties.sortOrder.enum).toHaveLength(2);
    });
  });

  describe('Response Data Structure', () => {
    it('should define UserListResponse with proper pagination', () => {
      const schema = specs.components.schemas.UserListResponse;
      
      expect(schema).toBeDefined();
      const dataSchema = schema.allOf[1].properties.data;
      
      expect(dataSchema.properties.users).toBeDefined();
      expect(dataSchema.properties.users.type).toBe('array');
      expect(dataSchema.properties.users.items.$ref).toBe('#/components/schemas/UserProfile');
      
      expect(dataSchema.properties.pagination).toBeDefined();
      expect(dataSchema.properties.pagination.$ref).toBe('#/components/schemas/PaginationMeta');
    });

    it('should define proper timestamp formats', () => {
      const userProfile = specs.components.schemas.UserProfile;
      const deleteResponse = specs.components.schemas.DeleteAccountResponse;
      
      expect(userProfile.properties.createdAt.format).toBe('date-time');
      expect(userProfile.properties.updatedAt.format).toBe('date-time');
      
      const deletedAtField = deleteResponse.allOf[1].properties.data.properties.deletedAt;
      expect(deletedAtField.format).toBe('date-time');
    });
  });
});