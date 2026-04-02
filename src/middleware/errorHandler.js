const { logger } = require('../utils/logger');
const { HTTP_STATUS, getStatusMessage } = require('../utils/httpStatusCodes');
const { 
  isAppError, 
  getErrorType, 
  ValidationError, 
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  DatabaseError,
  EmailError
} = require('../utils/errorTypes');

/**
 * Main error handling middleware
 * This should be the last middleware in the chain
 */
const errorHandler = (err, req, res, next) => {
  const correlationId = req.correlationId || err.correlationId;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Log the error with context
  logger.error('Error handled by middleware', {
    correlationId,
    error: err.message,
    stack: err.stack,
    type: getErrorType(err),
    route: req.route?.path,
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined
  });

  // Default error response
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let errorResponse = {
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      correlationId
    }
  };

  // Handle known application errors
  if (isAppError(err)) {
    statusCode = err.statusCode;
    errorResponse.error = {
      message: err.message,
      code: err.errorCode,
      correlationId,
      ...(err.details && { details: err.details }),
      ...(err.field && { field: err.field })
    };

    // Add development-only information
    if (!isProduction) {
      errorResponse.error.type = getErrorType(err);
      errorResponse.error.timestamp = err.timestamp;
    }
  }
  // Handle Joi validation errors
  else if (err.isJoi) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorResponse.error = {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      correlationId,
      details: err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }))
    };
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    errorResponse.error = {
      message: 'Invalid token',
      code: 'TOKEN_ERROR',
      correlationId
    };
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    errorResponse.error = {
      message: 'Token expired',
      code: 'TOKEN_EXPIRED',
      correlationId
    };
  }
  // Handle bcrypt errors
  else if (err.name === 'BcryptError') {
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    errorResponse.error = {
      message: 'Authentication processing error',
      code: 'AUTH_PROCESSING_ERROR',
      correlationId
    };
  }
  // Handle database errors
  else if (err.code && err.code.startsWith('23')) { // PostgreSQL constraint errors
    statusCode = HTTP_STATUS.CONFLICT;
    errorResponse.error = {
      message: getDatabaseErrorMessage(err),
      code: 'DATABASE_CONSTRAINT_ERROR',
      correlationId
    };
  }
  else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
    errorResponse.error = {
      message: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE',
      correlationId
    };
  }
  // Handle rate limiting
  else if (err.status === 429) {
    statusCode = HTTP_STATUS.TOO_MANY_REQUESTS;
    errorResponse.error = {
      message: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      correlationId,
      retryAfter: err.retryAfter
    };
  }
  // Handle syntax errors in JSON
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorResponse.error = {
      message: 'Invalid JSON in request body',
      code: 'INVALID_JSON',
      correlationId
    };
  }

  // Add stack trace in development
  if (!isProduction && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  // Add request information in development
  if (!isProduction) {
    errorResponse.debug = {
      method: req.method,
      url: req.url,
      headers: sanitizeHeaders(req.headers),
      query: req.query,
      params: req.params
    };
  }

  // Set security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 * Should be placed after all routes but before error handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.method} ${req.url} not found`);
  next(error);
};

/**
 * Global unhandled promise rejection handler
 */
const unhandledRejectionHandler = (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString()
  });

  // Graceful shutdown
  process.exit(1);
};

/**
 * Global uncaught exception handler
 */
const uncaughtExceptionHandler = (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    code: error.code
  });

  // Graceful shutdown
  process.exit(1);
};

/**
 * Health check error handler
 */
const healthCheckHandler = (req, res, next) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
};

// Helper functions
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

function getDatabaseErrorMessage(err) {
  if (err.code === '23505') {
    return 'Resource already exists';
  }
  if (err.code === '23503') {
    return 'Referenced resource not found';
  }
  if (err.code === '23502') {
    return 'Required field missing';
  }
  if (err.code === '23514') {
    return 'Invalid data format';
  }
  return 'Database operation failed';
}

/**
 * Error boundary for async operations
 */
const createErrorBoundary = (fallbackResponse) => {
  return (req, res, next) => {
    try {
      next();
    } catch (error) {
      logger.error('Error boundary caught error', {
        correlationId: req.correlationId,
        error: error.message,
        stack: error.stack
      });

      if (fallbackResponse) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(fallbackResponse);
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validation error formatter
 */
const formatValidationError = (error) => {
  if (error.isJoi) {
    return new ValidationError(
      'Validation failed',
      error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }))
    );
  }
  return error;
};

module.exports = {
  errorHandler,
  notFoundHandler,
  unhandledRejectionHandler,
  uncaughtExceptionHandler,
  healthCheckHandler,
  createErrorBoundary,
  formatValidationError
};