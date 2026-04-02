const { HTTP_STATUS } = require('../../src/utils/httpStatusCodes');
const { 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError,
  NotFoundError, 
  ConflictError,
  RateLimitError,
  ServerError 
} = require('../../src/utils/errorTypes');

// Error response matchers
const errorMatchers = {
  isValidationError: (response) => {
    return response.status === HTTP_STATUS.BAD_REQUEST &&
           response.body.success === false &&
           (response.body.error || response.body.errors);
  },

  isAuthenticationError: (response) => {
    return response.status === HTTP_STATUS.UNAUTHORIZED &&
           response.body.success === false &&
           response.body.error;
  },

  isAuthorizationError: (response) => {
    return response.status === HTTP_STATUS.FORBIDDEN &&
           response.body.success === false &&
           response.body.error;
  },

  isNotFoundError: (response) => {
    return response.status === HTTP_STATUS.NOT_FOUND &&
           response.body.success === false &&
           response.body.error;
  },

  isConflictError: (response) => {
    return response.status === HTTP_STATUS.CONFLICT &&
           response.body.success === false &&
           response.body.error;
  },

  isRateLimitError: (response) => {
    return response.status === HTTP_STATUS.TOO_MANY_REQUESTS &&
           response.body.success === false &&
           response.body.error;
  },

  isServerError: (response) => {
    return response.status === HTTP_STATUS.INTERNAL_SERVER_ERROR &&
           response.body.success === false &&
           response.body.error;
  },

  hasErrorCode: (response, code) => {
    return response.body.code === code;
  },

  hasErrorMessage: (response, message) => {
    return response.body.error && 
           response.body.error.toLowerCase().includes(message.toLowerCase());
  },

  hasValidationErrors: (response, fields) => {
    if (!response.body.errors) return false;
    
    return fields.every(field => 
      response.body.errors.some(error => 
        error.field === field || error.path === field
      )
    );
  },
};

// Error scenario generators
const createErrorScenarios = () => {
  return {
    // Authentication scenarios
    auth: {
      missingToken: {
        headers: {},
        expectedStatus: HTTP_STATUS.UNAUTHORIZED,
        expectedError: /token/i,
      },
      
      invalidToken: {
        headers: { 'Authorization': 'Bearer invalid-token' },
        expectedStatus: HTTP_STATUS.UNAUTHORIZED,
        expectedError: /invalid.*token/i,
      },
      
      expiredToken: {
        headers: { 'Authorization': 'Bearer expired-token' },
        expectedStatus: HTTP_STATUS.UNAUTHORIZED,
        expectedError: /expired.*token/i,
      },
      
      malformedToken: {
        headers: { 'Authorization': 'invalid-format' },
        expectedStatus: HTTP_STATUS.UNAUTHORIZED,
        expectedError: /invalid.*format/i,
      },
    },

    // Validation scenarios
    validation: {
      missingRequiredFields: {
        body: {},
        expectedStatus: HTTP_STATUS.BAD_REQUEST,
        expectedError: /required/i,
      },
      
      invalidEmail: {
        body: { email: 'invalid-email' },
        expectedStatus: HTTP_STATUS.BAD_REQUEST,
        expectedError: /email/i,
      },
      
      weakPassword: {
        body: { password: '123' },
        expectedStatus: HTTP_STATUS.BAD_REQUEST,
        expectedError: /password/i,
      },
      
      invalidLength: {
        body: { name: 'a'.repeat(256) },
        expectedStatus: HTTP_STATUS.BAD_REQUEST,
        expectedError: /length/i,
      },
    },

    // Rate limiting scenarios
    rateLimit: {
      tooManyRequests: {
        requestCount: 100,
        expectedStatus: HTTP_STATUS.TOO_MANY_REQUESTS,
        expectedError: /rate.*limit/i,
      },
    },

    // Database/server scenarios
    server: {
      databaseError: {
        mockError: new Error('Database connection failed'),
        expectedStatus: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        expectedError: /server.*error/i,
      },
      
      serviceUnavailable: {
        mockError: new Error('Service temporarily unavailable'),
        expectedStatus: HTTP_STATUS.SERVICE_UNAVAILABLE,
        expectedError: /unavailable/i,
      },
    },
  };
};

// Error assertion helpers
const assertErrorResponse = (response, expectedStatus, expectedErrorPattern) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.success).toBe(false);
  expect(response.body.error).toMatch(expectedErrorPattern);
};

const assertValidationErrorResponse = (response, expectedFields) => {
  expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
  expect(response.body.success).toBe(false);
  expect(response.body.errors || response.body.error).toBeDefined();
  
  if (expectedFields && Array.isArray(expectedFields)) {
    expectedFields.forEach(field => {
      expect(response.body.error || JSON.stringify(response.body.errors))
        .toMatch(new RegExp(field, 'i'));
    });
  }
};

const assertAuthenticationErrorResponse = (response) => {
  expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
  expect(response.body.success).toBe(false);
  expect(response.body.error).toBeDefined();
};

const assertAuthorizationErrorResponse = (response) => {
  expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
  expect(response.body.success).toBe(false);