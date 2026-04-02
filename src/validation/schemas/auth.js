const Joi = require('joi');
const { email, password, loginPassword, name, token, jwtToken } = require('./common');

// Registration validation schema
const registerSchema = Joi.object({
  email,
  password,
  name,
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Password confirmation must match password',
      'any.required': 'Password confirmation is required'
    })
}).messages({
  'object.unknown': 'Unknown field: {#label} is not allowed'
});

// Login validation schema
const loginSchema = Joi.object({
  email,
  password: loginPassword
}).messages({
  'object.unknown': 'Unknown field: {#label} is not allowed'
});

// Forgot password validation schema
const forgotPasswordSchema = Joi.object({
  email
}).messages({
  'object.unknown': 'Unknown field: {#label} is not allowed'
});

// Reset password validation schema
const resetPasswordSchema = Joi.object({
  token,
  newPassword: password,
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Password confirmation must match new password',
      'any.required': 'Password confirmation is required'
    })
}).messages({
  'object.unknown': 'Unknown field: {#label} is not allowed'
});

// Email verification validation schema
const verifyEmailSchema = Joi.object({
  token
}).messages({
  'object.unknown': 'Unknown field: {#label} is not allowed'
});

// Token refresh validation schema
const refreshTokenSchema = Joi.object({
  refreshToken: jwtToken
}).messages({
  'object.unknown': 'Unknown field: {#label} is not allowed'
});

// Resend verification email schema
const resendVerificationSchema = Joi.object({
  email
}).messages({
  'object.unknown': 'Unknown field: {#label} is not allowed'
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  resendVerificationSchema
};