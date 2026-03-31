const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

describe('Refresh Token Schema Documentation', () => {
  let specs;

  beforeAll(() => {
    const options = {
      definition: {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' }
      },
      apis: [path.join(__dirname, '../../../../docs/schemas/refresh.js')]
    };
    specs = swaggerJsdoc(options);
  });

  describe('Refresh Token Management Request Schemas', () => {
    it('should define LogoutRequest schema correctly', () => {
      const schema = specs.components.schemas.LogoutRequest;
      
      expect(schema).toBeDefined();
      expect(schema.properties.refreshToken).toBeDefined();
      expect(schema.properties.refreshToken.type).toBe('string');
      
      expect(schema.properties.logoutAll).toBeDefined();
      expect(schema.properties.logoutAll.type).toBe('boolean');
      expect(schema.properties.logoutAll.default).toBe(false);
    });

    it('should define RevokeTokenRequest schema correctly', () => {
      const schema = specs.components.schemas.RevokeTokenRequest;
      
      expect(schema).toBeDefined();
      expect(schema.required).toEqual(['refreshToken']);
      expect(schema.properties.refreshToken.type).toBe('string');
    });

    it('should define ValidateTokenRequest schema correctly', () => {
      const schema = specs.components.schemas.ValidateTokenRequest;
      
      expect(schema).toBeDefined();
      expect(schema.required).toEqual(['refreshToken']);
      expect(schema.properties.refreshToken.type).toBe('string');
    });
  });

  describe('Refresh Token Response Schemas', () => {
    it('should define ActiveToken schema correctly', () => {
      const schema = specs.components.schemas.ActiveToken;
      
      expect(schema).toBeDefined();
      
      const requiredProperties = [
        'id', 'deviceInfo', 'ipAddress', 'lastUsed', 
        'createdAt', 'expiresAt', 'isCurrentToken'
      ];
      
      requiredProperties.forEach(prop => {
        expect(schema.properties[prop]).toBeDefined();
      });
      
      // Check date-time formats
      expect(schema.properties.lastUsed.format).toBe('date-time');
      expect(schema.properties.createdAt.format).toBe('date-time');
      expect(schema.properties.expiresAt.format).toBe('date-time');
      
      // Check boolean type
      expect(schema.properties.isCurrentToken.type).toBe('boolean');
    });

    it('should define LogoutResponse schema correctly', () => {
      const schema = specs.components.schemas.LogoutResponse;
      
      expect(schema).toBeDefined();
      expect(schema.allOf).toBeDefined();
      expect(schema.allOf[0].$ref).toBe('#/components/schemas/SuccessResponse');
      
      const dataSchema = schema.all