const Joi = require('joi');
const { email, password, loginPassword, optionalName, paginationQuery } = require('./common');

// Profile update validation schema
const updateProfileSchema = Joi.object({
  name: optionalName,
  email: email.optional()
}).min(1).messages({
  'object.min': 'At least one field (name or email) must be provided',
  'object.unknown': 'Unknown field: {#label} is not allowed'
});

// Password change validation schema
const changePasswordSchema = Joi.object({
  currentPassword: loginPassword,
  newPassword: password,
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Password confirmation must match new password',
      'any.required': 'Password confirmation is required'
    })
}).custom((value, helpers) => {
  if (value.currentPassword === value.newPassword) {
    return helpers.error('password.same');
  }
  return value;
}).messages({
  'password.same': 'New password must be different from current password',
  'object.unknown': 'Unknown field: {#label} is not allowed'
});

// Account deletion validation schema
const deleteAccountSchema = Joi.object({
  password: loginPassword,
  confirmation: Joi.string()
    .valid('DELETE')
    .required()
    .messages({
      'any.only': 'Confirmation must be exactly "DELETE"',
      'any.required': 'Confirmation is required'
    })
}).messages({
  'object.unknown': 'Unknown field: {#label} is not allowed'
});

// User listing validation schema (for admin endpoints)
const getUsersQuerySchema = paginationQuery;

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
  getUsersQuerySchema
};