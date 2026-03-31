const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auth API',
      version: '1.0.0',
      description: 'Comprehensive authentication API with user management, JWT tokens, and email verification',
      contact: {
        name: 'API Support',
        email: 'support@authapi.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' ? 'https://api.authapi.com' : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token for authenticated requests'
        },
        RefreshToken: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT refresh token for token rotation'
        }
      },
      schemas: {
        // Error schemas
        Error: {
          type: 'object',
          required: ['success', 'error', 'code'],
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Human-readable error message'
            },
            code: {
              type: 'string',
              description: 'Machine-readable error code'
            },
            correlationId: {
              type: 'string',
              description: 'Request correlation ID for tracking'
            }
          }
        },
        ValidationError: {
          type: 'object',
          required: ['success', 'error', 'code', 'details'],
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Validation failed'
            },
            code: {
              type: 'string',
              example: 'VALIDATION_ERROR'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field name that failed validation'
                  },
                  message: {
                    type: 'string',
                    description: 'Validation error message'
                  }
                }
              }
            }
          }
        },
        // Success response wrapper
        SuccessResponse: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data payload'
            }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad request - Invalid input parameters',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationError'
              },
              example: {
                success: false,
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: [
                  {
                    field: 'email',
                    message: 'Email is required'
                  }
                ]
              }
            }
          }
        },
        Unauthorized: {
          description: 'Unauthorized - Invalid or missing authentication',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Invalid credentials',
                code: 'AUTHENTICATION_ERROR'
              }
            }
          }
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Access denied',
                code: 'AUTHORIZATION_ERROR'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Resource not found',
                code: 'NOT_FOUND'
              }
            }
          }
        },
        Conflict: {
          description: 'Conflict - Resource already exists',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'User already exists with this email',
                code: 'CONFLICT_ERROR'
              }
            }
          }
        },
        TooManyRequests: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Too many requests',
                code: 'RATE_LIMIT_EXCEEDED'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Internal server error',
                code: 'SERVER_ERROR'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and account management endpoints'
      },
      {
        name: 'Token Management',
        description: 'JWT token refresh and management endpoints'
      },
      {
        name: 'User Management',
        description: 'User profile and account management endpoints'
      }
    ]
  },
  apis: [
    path.join(__dirname, '../src/routes/auth.js'),
    path.join(__dirname, '../src/routes/auth/refresh.js'),
    path.join(__dirname, '../src/routes/users.js'),
    path.join(__dirname, './schemas/*.js'),
    path.join(__dirname, './examples/*.js')
  ]
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUiOptions: {
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: var(--color-primary, #6366F1); }
      .swagger-ui .scheme-container { 
        background: var(--color-surface, #F8FAFC); 
        border: 1px solid var(--color-border, #E2E8F0);
        border-radius: var(--radius, 8px);
      }
      .swagger-ui .btn.authorize { 
        background-color: var(--color-primary, #6366F1);
        border-color: var(--color-primary, #6366F1);
      }
      .swagger-ui .btn.authorize:hover { 
        background-color: var(--color-accent, #F59E0B);
        border-color: var(--color-accent, #F59E0B);
      }
    `,
    customSiteTitle: 'Auth API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      tryItOutEnabled: true
    }
  }
};