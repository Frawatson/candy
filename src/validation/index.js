const authSchemas = require('./schemas/auth');
const userSchemas = require('./schemas/user');
const commonSchemas = require('./schemas/common');
const { 
  validate, 
  validateBody, 
  validateQuery, 
  validateParams, 
  validateMultiple,
  formatJoiErrors 
} = require('../middleware/validation');

module.exports = {
  // Schemas
  auth: authSchemas,
  user: userSchemas,
  common: commonSchemas,
  
  // Middleware functions
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateMultiple,
  formatJoiErrors
};