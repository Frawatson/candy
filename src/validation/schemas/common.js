const Joi = require('joi');

// Email validation schema with comprehensive rules
const email = Joi.string()
  .email({ 
    minDomainSegments: 2,
    tlds: { allow: true }
  })
  .lowercase()
  .max(254)
  .required()
  .messages({
    'string.email': 'Please provide a valid email address',
    'string.max': 'Email address must be less than 254 characters',
    'any.required': 'Email is required'
  });

// Password validation schema with complexity rules
const password = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must be less than 128 characters',
    'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)',
    'any.required': 'Password is required'
  });

// Simple password for login (without complexity requirements)
const loginPassword = Joi.string()
  .min(1)
  .max(128)
  .required()
  .messages({
    'string.min': 'Password is required',
    'string.max': 'Password must be less than 128 characters',
    'any.required': 'Password is required'
  });

// Name validation schema
const name = Joi.string()
  .trim()
  .min(2)
  .max(100)
  .pattern(/^[a-zA-Z\s'-]+$/)
  .required()
  .messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name must be less than 100 characters',
    'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes',
    'any.required': 'Name is required'
  });

// Optional name for updates
const optionalName = name.optional();

// Token validation schema (for verification tokens, reset tokens, etc.)
const token = Joi.string()
  .min(32)
  .max(256)
  .alphanum()
  .required()
  .messages({
    'string.min': 'Token must be at least 32 characters long',
    'string.max': 'Token must be less than 256 characters',
    'string.alphanum': 'Token must contain only letters and numbers',
    'any.required': 'Token is required'
  });

// JWT token validation (for refresh tokens)
const jwtToken = Joi.string()
  .min(20)
  .max(2048)
  .required()
  .messages({
    'string.min': 'Invalid token format',
    'string.max': 'Token too long',
    'any.required': 'Token is required'
  });

// Pagination validation schemas
const page = Joi.number()
  .integer()
  .min(1)
  .default(1)
  .messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1'
  });

const limit = Joi.number()
  .integer()
  .min(1)
  .max(100)
  .default(10)
  .messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must be at most 100'
  });

const search = Joi.string()
  .trim()
  .min(1)
  .max(100)
  .optional()
  .messages({
    'string.min': 'Search term must be at least 1 character',
    'string.max': 'Search term must be less than 100 characters'
  });

// Pagination query schema
const paginationQuery = Joi.object({
  page,
  limit,
  search
});

module.exports = {
  email,
  password,
  loginPassword,
  name,
  optionalName,
  token,
  jwtToken,
  page,
  limit,
  search,
  paginationQuery
};