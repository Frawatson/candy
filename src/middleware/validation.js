const Joi = require('joi');
const { ValidationError } = require('../utils/errorTypes');
const { logger } = require('../utils/logger');

/**
 * Validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {string} target - What to validate: 'body', 'query', or 'params'
 * @returns {Function} Express middleware function
 */
const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[target];
      
      // Validate the data against the schema
      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false, // Get all validation errors, not just the first one
        allowUnknown: false, // Don't allow unknown fields
        stripUnknown: true // Remove unknown fields from the validated data
      });

      if (error) {
        const validationDetails = formatJoiErrors(error);
        
        logger.warn('Validation failed', {
          correlationId: req.correlationId,
          target,
          errors: validationDetails,
          requestData: dataToValidate
        });

        throw new ValidationError('Validation failed', {
          target,
          details: validationDetails
        });
      }

      // Replace the original data with the validated and sanitized data
      req[target] = value;
      
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Format Joi validation errors into a more user-friendly format
 * @param {Object} joiError - Joi validation error object
 * @returns {Array} Array of formatted error objects
 */
const formatJoiErrors = (joiError) => {
  return joiError.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value,
    type: detail.type
  }));
};

/**
 * Validate request body
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateBody = (schema) => validate(schema, 'body');

/**
 * Validate query parameters
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateQuery = (schema) => validate(schema, 'query');

/**
 * Validate route parameters
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateParams = (schema) => validate(schema, 'params');

/**
 * Multiple validation middleware - validates multiple targets
 * @param {Object} schemas - Object with keys for different targets (body, query, params)
 * @returns {Function} Express middleware function
 */
const validateMultiple = (schemas) => {
  return (req, res, next) => {
    try {
      const errors = [];

      // Validate each specified target
      Object.entries(schemas).forEach(([target, schema]) => {
        const dataToValidate = req[target];
        
        const { error, value } = schema.validate(dataToValidate, {
          abortEarly: false,
          allowUnknown: false,
          stripUnknown: true
        });

        if (error) {
          errors.push({
            target,
            details: formatJoiErrors(error)
          });
        } else {
          // Replace with validated data
          req[target] = value;
        }
      });

      if (errors.length > 0) {
        logger.warn('Multi-target validation failed', {
          correlationId: req.correlationId,
          errors
        });

        throw new ValidationError('Validation failed', {
          multipleTargets: true,
          errors
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateMultiple,
  formatJoiErrors
};