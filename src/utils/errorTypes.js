const { HTTP_STATUS } = require('./httpStatusCodes');

class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errorCode = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      details: this.details,
      timestamp: this.timestamp,
      isOperational: this.isOperational
    };
  }
}

class ValidationError extends AppError {
  constructor(message, details = null, field = null) {
    super(message, HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR', details);
    this.field = field;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      field: this.field
    };
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', details = null) {
    super(message, HTTP_STATUS.UNAUTHORIZED, 'AUTHENTICATION_ERROR', details);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access forbidden', details = null) {
    super(message, HTTP_STATUS.FORBIDDEN, 'AUTHORIZATION_ERROR', details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', resource = null) {
    super(message, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND', { resource });
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details = null) {
    super(message, HTTP_STATUS.CONFLICT, 'CONFLICT_ERROR', details);
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details = null, query = null) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR', details);
    this.query = query;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      query: this.query
    };
  }
}

class EmailError extends AppError {
  constructor(message = 'Email operation failed', details = null, recipient = null) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'EMAIL_ERROR', details);
    this.recipient = recipient;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      recipient: this.recipient
    };
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', details = null) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, 'RATE_LIMIT_ERROR', details);
  }
}

class TokenError extends AppError {
  constructor(message = 'Token operation failed', tokenType = null) {
    super(message, HTTP_STATUS.UNAUTHORIZED, 'TOKEN_ERROR', { tokenType });
  }
}

class ExternalServiceError extends AppError {
  constructor(message = 'External service error', service = null, statusCode = HTTP_STATUS.BAD_GATEWAY) {
    super(message, statusCode, 'EXTERNAL_SERVICE_ERROR', { service });
  }
}

// Error type mapping for quick identification
const ERROR_TYPES = {
  APP_ERROR: 'AppError',
  VALIDATION_ERROR: 'ValidationError',
  AUTHENTICATION_ERROR: 'AuthenticationError',
  AUTHORIZATION_ERROR: 'AuthorizationError',
  NOT_FOUND_ERROR: 'NotFoundError',
  CONFLICT_ERROR: 'ConflictError',
  DATABASE_ERROR: 'DatabaseError',
  EMAIL_ERROR: 'EmailError',
  RATE_LIMIT_ERROR: 'RateLimitError',
  TOKEN_ERROR: 'TokenError',
  EXTERNAL_SERVICE_ERROR: 'ExternalServiceError'
};

// Error codes for client identification
const ERROR_CODES = {
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EMAIL_ERROR: 'EMAIL_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  TOKEN_ERROR: 'TOKEN_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
};

const isAppError = (error) => {
  return error instanceof AppError || (error && error.isOperational === true);
};

const getErrorType = (error) => {
  if (error instanceof ValidationError) return ERROR_TYPES.VALIDATION_ERROR;
  if (error instanceof AuthenticationError) return ERROR_TYPES.AUTHENTICATION_ERROR;
  if (error instanceof AuthorizationError) return ERROR_TYPES.AUTHORIZATION_ERROR;
  if (error instanceof NotFoundError) return ERROR_TYPES.NOT_FOUND_ERROR;
  if (error instanceof ConflictError) return ERROR_TYPES.CONFLICT_ERROR;
  if (error instanceof DatabaseError) return ERROR_TYPES.DATABASE_ERROR;
  if (error instanceof EmailError) return ERROR_TYPES.EMAIL_ERROR;
  if (error instanceof RateLimitError) return ERROR_TYPES.RATE_LIMIT_ERROR;
  if (error instanceof TokenError) return ERROR_TYPES.TOKEN_ERROR;
  if (error instanceof ExternalServiceError) return ERROR_TYPES.EXTERNAL_SERVICE_ERROR;
  if (error instanceof AppError) return ERROR_TYPES.APP_ERROR;
  return 'UnknownError';
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  EmailError,
  RateLimitError,
  TokenError,
  ExternalServiceError,
  ERROR_TYPES,
  ERROR_CODES,
  isAppError,
  getErrorType
};