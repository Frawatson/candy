const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

describe('Auth Schema Documentation', () => {
  let specs;

  beforeAll(() => {
    const options = {
      definition: {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' }
      },
      apis: [path.join(__dirname, '../../../../docs/schemas/auth.js')]
    };
    specs = swaggerJsdoc(options);
  });

  describe('Request Schemas', () => {
    it('should define RegisterRequest schema correctly', () => {
      const schema = specs.components.schemas.RegisterRequest;
      
      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.required).toEqual(['email', 'password', 'name']);
      
      expect(schema.properties.email).toBeDefined();
      expect(schema.properties.email.type).toBe('string');
      expect(schema.properties.email.format).toBe('email');
      
      expect(schema.properties.password).toBeDefined();
      expect(schema.properties.password.type).toBe('string');
      expect(schema.properties.password.format).toBe('password');
      expect(schema.properties.password.minLength).toBe(8);
      
      expect(schema.properties.name).toBeDefined();
      expect(schema.properties.name.type).toBe('string');
      expect(schema.properties.name.minLength).toBe(2);
      expect(schema.properties.name.maxLength).toBe(50);
    });

    it('should define LoginRequest schema correctly', () => {
      const schema = specs.components.schemas.LoginRequest;
      
      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.required).toEqual(['email', 'password']);
      
      expect(schema.properties.email.format).toBe('email');
      expect(schema.properties.password.format).toBe('password');
    });

    it('should define ForgotPasswordRequest schema correctly', () => {
      const schema = specs.components.schemas.ForgotPasswordRequest;
      
      expect(schema).toBeDefined();
      expect(schema.required).toEqual(['email']);
      expect(schema.properties.email.format).toBe('email');
    });

    it('should define ResetPasswordRequest schema correctly', () => {
      const schema = specs.components.schemas.ResetPasswordRequest;
      
      expect(schema).toBeDefined();
      expect(schema.required).toEqual(['token', 'newPassword']);
      expect(schema.properties.newPassword.minLength).toBe(8);
    });

    it('should define VerifyEmailRequest schema correctly', () => {
      const schema = specs.components.schemas.VerifyEmailRequest;
      
      expect(schema).toBeDefined();
      expect(schema.required).toEqual(['token']);
      expect(schema.properties.token.type).toBe('string');
    });

    it('should define RefreshTokenRequest schema correctly', () => {
      const schema = specs.components.schemas.RefreshTokenRequest;
      
      expect(schema).toBeDefined();
      expect(schema.required).toEqual(['refreshToken']);
      expect(schema.properties.refreshToken.type).toBe('string');
    });
  });

  describe('Response Schemas', () => {
    it('should define User schema correctly', () => {
      const schema = specs.components.schemas.User;
      
      expect(schema).toBeDefined();
      expect(schema.properties.id).toBeDefined();
      expect(schema.properties.id.type).toBe('integer');
      
      expect(schema.properties.email).toBeDefined();
      expect(schema.properties.email.format).toBe('email');
      
      expect(schema.properties.emailVerified).toBeDefined();
      expect(schema.properties.emailVerified.type).toBe('boolean');
      
      expect(schema.properties.createdAt).toBeDefined();
      expect(schema.properties.createdAt.format).toBe('date-time');
    });

    it('should define Tokens schema correctly', () => {
      const schema = specs.components.schemas.Tokens;
      
      expect(schema).toBeDefined();
      expect(schema.properties.accessToken).toBeDefined();
      expect(schema.properties.accessToken.type).toBe('string');
      
      expect(schema.properties.refreshToken).toBeDefined();
      expect(schema.properties.refreshToken.type).toBe('string');
    });

    it('should define composite response schemas correctly', () => {
      const schemas = [
        'RegisterResponse',
        'LoginResponse', 
        'ForgotPasswordResponse',
        'ResetPasswordResponse',
        'VerifyEmailResponse',
        'RefreshTokenResponse'
      ];

      schemas.forEach(schemaName => {
        const schema = specs.components.schemas[schemaName];
        expect(schema).toBeDefined();
        expect(schema.allOf).toBeDefined();
        expect(schema.allOf.length).toBe(2);
        expect(schema.allOf[0].$ref).toBe('#/components/schemas/SuccessResponse');
      });
    });
  });

  describe('Schema Examples', () => {
    it('should have appropriate examples for all schemas', () => {
      const schemasWithExamples = [
        'RegisterRequest',
        'LoginRequest',
        'ForgotPasswordRequest'
      ];

      schemasWithExamples.forEach(schemaName => {
        const schema = specs.components.schemas[schemaName];
        Object.values(schema.properties).forEach(property => {
          if (property.example) {
            expect(property.example).toBeDefined();
            
            // Validate email examples
            if (property.format === 'email') {
              expect(property.example).toContain('@');
              expect(property.example).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            }
          }
        });
      });
    });

    it('should have secure password examples', () => {
      const passwordFields = ['password', 'newPassword'];
      
      passwordFields.forEach(field => {
        const registerSchema = specs.components.schemas.RegisterRequest;
        if (registerSchema.properties[field]?.example) {
          const example = registerSchema.properties[field].example;
          expect(example.length).toBeGreaterThanOrEqual(8);
          // Should contain at least one special character and number
          expect(example).toMatch(/[0-9]/);
          expect(example).toMatch(/[!@#$%^&*]/);
        }
      });
    });
  });
});