const { specs, swaggerUiOptions } = require('../../../docs/swagger');

describe('Swagger Configuration', () => {
  describe('OpenAPI Specification', () => {
    it('should have valid OpenAPI 3.0 structure', () => {
      expect(specs).toBeDefined();
      expect(specs.openapi).toBe('3.0.0');
      expect(specs.info).toBeDefined();
      expect(specs.info.title).toBe('Auth API');
      expect(specs.info.version).toBe('1.0.0');
      expect(specs.info.description).toContain('authentication');
    });

    it('should have correct server configuration', () => {
      expect(specs.servers).toBeInstanceOf(Array);
      expect(specs.servers.length).toBeGreaterThan(0);
      
      const server = specs.servers[0];
      expect(server.url).toBeDefined();
      expect(server.description).toBeDefined();
    });

    it('should define security schemes', () => {
      expect(specs.components.securitySchemes).toBeDefined();
      expect(specs.components.securitySchemes.BearerAuth).toBeDefined();
      expect(specs.components.securitySchemes.BearerAuth.type).toBe('http');
      expect(specs.components.securitySchemes.BearerAuth.scheme).toBe('bearer');
      expect(specs.components.securitySchemes.BearerAuth.bearerFormat).toBe('JWT');
    });

    it('should define common schemas', () => {
      const schemas = specs.components.schemas;
      
      expect(schemas.Error).toBeDefined();
      expect(schemas.Error.type).toBe('object');
      expect(schemas.Error.required).toContain('success');
      expect(schemas.Error.required).toContain('error');
      expect(schemas.Error.required).toContain('code');

      expect(schemas.ValidationError).toBeDefined();
      expect(schemas.ValidationError.properties.details).toBeDefined();

      expect(schemas.SuccessResponse).toBeDefined();
      expect(schemas.SuccessResponse.required).toContain('success');
      expect(schemas.SuccessResponse.required).toContain('message');
    });

    it('should define common error responses', () => {
      const responses = specs.components.responses;
      
      const errorTypes = [
        'BadRequest', 'Unauthorized', 'Forbidden', 
        'NotFound', 'Conflict', 'TooManyRequests', 
        'InternalServerError'
      ];

      errorTypes.forEach(errorType => {
        expect(responses[errorType]).toBeDefined();
        expect(responses[errorType].description).toBeDefined();
        expect(responses[errorType].content).toBeDefined();
        expect(responses[errorType].content['application/json']).toBeDefined();
      });
    });

    it('should define appropriate tags', () => {
      expect(specs.tags).toBeInstanceOf(Array);
      
      const tagNames = specs.tags.map(tag => tag.name);
      expect(tagNames).toContain('Authentication');
      expect(tagNames).toContain('Token Management');
      expect(tagNames).toContain('User Management');

      specs.tags.forEach(tag => {
        expect(tag.name).toBeDefined();
        expect(tag.description).toBeDefined();
      });
    });
  });

  describe('Swagger UI Options', () => {
    it('should have valid UI configuration', () => {
      expect(swaggerUiOptions).toBeDefined();
      expect(swaggerUiOptions.customSiteTitle).toBe('Auth API Documentation');
      expect(swaggerUiOptions.customfavIcon).toBe('/favicon.ico');
    });

    it('should have custom CSS styling', () => {
      expect(swaggerUiOptions.customCss).toBeDefined();
      expect(swaggerUiOptions.customCss).toContain('.swagger-ui');
      expect(swaggerUiOptions.customCss).toContain('--color-primary');
    });

    it('should have proper swagger options', () => {
      const options = swaggerUiOptions.swaggerOptions;
      
      expect(options.persistAuthorization).toBe(true);
      expect(options.displayRequestDuration).toBe(true);
      expect(options.docExpansion).toBe('list');
      expect(options.filter).toBe(true);
      expect(options.showExtensions).toBe(true);
      expect(options.tryItOutEnabled).toBe(true);
    });
  });

  describe('Environment-based Configuration', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should use development server URL in development', () => {
      process.env.NODE_ENV = 'development';
      const { specs: devSpecs } = require('../../../docs/swagger');
      
      const devServer = devSpecs.servers.find(s => s.description.includes('Development'));
      expect(devServer).toBeDefined();
      expect(devServer.url).toContain('localhost');
    });

    it('should use production server URL in production', () => {
      process.env.NODE_ENV = 'production';
      delete require.cache[require.resolve('../../../docs/swagger')];
      const { specs: prodSpecs } = require('../../../docs/swagger');
      
      const prodServer = prodSpecs.servers.find(s => s.description.includes('Production'));
      expect(prodServer).toBeDefined();
      expect(prodServer.url).toContain('https://');
    });
  });
});