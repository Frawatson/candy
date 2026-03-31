const { logger } = require('../utils/logger');

/**
 * Async handler wrapper that catches errors in async route handlers
 * and passes them to the error handling middleware
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    const correlationId = req.correlationId;
    
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Add correlation ID to error for tracking
      if (correlationId) {
        error.correlationId = correlationId;
      }

      // Log the error with context
      logger.error('Async handler caught error', {
        correlationId,
        error: error.message,
        stack: error.stack,
        route: req.route?.path,
        method: req.method,
        url: req.url,
        userId: req.user?.id,
        body: req.method !== 'GET' ? req.body : undefined
      });

      next(error);
    });
  };
};

/**
 * Async middleware wrapper for middleware functions
 */
const asyncMiddleware = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Batch async handler for processing multiple operations
 */
const batchAsyncHandler = (operations) => {
  return asyncHandler(async (req, res, next) => {
    const results = [];
    const errors = [];

    for (const operation of operations) {
      try {
        const result = await operation(req, res);
        results.push(result);
      } catch (error) {
        errors.push({
          operation: operation.name || 'anonymous',
          error: error.message,
          stack: error.stack
        });
      }
    }

    if (errors.length > 0) {
      logger.warn('Batch operation had errors', {
        correlationId: req.correlationId,
        successCount: results.length,
        errorCount: errors.length,
        errors
      });
    }

    req.batchResults = { results, errors };
    next();
  });
};

/**
 * Timeout wrapper for async operations
 */
const timeoutHandler = (timeoutMs = 30000) => {
  return (fn) => {
    return asyncHandler(async (req, res, next) => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      try {
        const result = await Promise.race([
          fn(req, res, next),
          timeoutPromise
        ]);
        return result;
      } catch (error) {
        if (error.message.includes('timed out')) {
          logger.warn('Operation timeout', {
            correlationId: req.correlationId,
            timeout: timeoutMs,
            route: req.route?.path,
            method: req.method
          });
        }
        throw error;
      }
    });
  };
};

/**
 * Retry wrapper for async operations with exponential backoff
 */
const retryHandler = (maxRetries = 3, baseDelay = 1000) => {
  return (fn) => {
    return asyncHandler(async (req, res, next) => {
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await fn(req, res, next);
        } catch (error) {
          lastError = error;
          
          if (attempt === maxRetries) {
            logger.error('All retry attempts failed', {
              correlationId: req.correlationId,
              maxRetries,
              finalError: error.message,
              route: req.route?.path
            });
            throw error;
          }

          const delay = baseDelay * Math.pow(2, attempt - 1);
          
          logger.warn('Operation failed, retrying', {
            correlationId: req.correlationId,
            attempt,
            maxRetries,
            delay,
            error: error.message
          });

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    });
  };
};

/**
 * Cache wrapper for async operations
 */
const cacheHandler = (ttl = 300000) => { // 5 minutes default
  const cache = new Map();
  
  return (keyFn) => {
    return (fn) => {
      return asyncHandler(async (req, res, next) => {
        const cacheKey = keyFn(req);
        const cached = cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < ttl) {
          logger.debug('Cache hit', {
            correlationId: req.correlationId,
            cacheKey,
            age: Date.now() - cached.timestamp
          });
          return cached.data;
        }

        const result = await fn(req, res, next);
        
        cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });

        // Clean up expired entries periodically
        if (cache.size > 100) {
          const now = Date.now();
          for (const [key, value] of cache.entries()) {
            if (now - value.timestamp > ttl) {
              cache.delete(key);
            }
          }
        }

        logger.debug('Cache miss, data cached', {
          correlationId: req.correlationId,
          cacheKey,
          cacheSize: cache.size
        });

        return result;
      });
    };
  };
};

module.exports = {
  asyncHandler,
  asyncMiddleware,
  batchAsyncHandler,
  timeoutHandler,
  retryHandler,
  cacheHandler
};