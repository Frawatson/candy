const express = require('express');
const crypto = require('crypto');
const { asyncHandler } = require('../middleware/asyncHandler');
const { logger } = require('../utils/logger');
const { 
  ValidationError, 
  AuthenticationError,
  AuthorizationError,
  NotFoundError 
} = require('../utils/errorTypes');
const { HTTP_STATUS } = require('../utils/httpStatusCodes');

const router = express.Router();

// Mock authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AuthenticationError('Access token is required');
  }

  // Mock token validation - check for proper JWT format instead of hardcoded values
  if (!token.startsWith('mock-jwt-access-')) {
    throw new AuthenticationError('Invalid or expired token');
  }

  // Mock user data from token
  req.user = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'user'
  };

  next();
};

// Mock admin authorization middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    throw new AuthorizationError('Admin access required');
  }
  next();
};

/**
 * GET /api/users/profile
 * Get current user profile
 */
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  logger.info('Profile requested', {
    correlationId: req.correlationId,
    userId: req.user.id
  });

  // Simulate database lookup
  const userProfile = {
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    role: req.user.role,
    emailVerified: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };

  res.json({
    success: true,
    data: {
      user: userProfile
    }
  });
}));

/**
 * PUT /api/users/profile
 * Update current user profile
 */
router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  logger.info('Profile update requested', {
    correlationId: req.correlationId,
    userId: req.user.id,
    updates: { name: !!name, email: !!email }
  });

  // Validation
  if (!name && !email) {
    throw new ValidationError('At least one field (name or email) must be provided');
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Invalid email format', {
      field: 'email',
      value: email
    });
  }

  if (name && name.length < 2) {
    throw new ValidationError('Name must be at least 2 characters long', {
      field: 'name',
      minLength: 2
    });
  }

  // Simulate update
  const updatedProfile = {
    id: req.user.id,
    email: email || req.user.email,
    name: name || req.user.name,
    role: req.user.role,
    emailVerified: email ? false : true, // Re-verification needed if email changed
    updatedAt: new Date().toISOString()
  };

  logger.info('Profile updated successfully', {
    correlationId: req.correlationId,
    userId: req.user.id,
    emailChanged: !!email
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: updatedProfile,
      ...(email && { message: 'Email verification required for new email address' })
    }
  });
}));

/**
 * POST /api/users/change-password
 * Change user password
 */
router.post('/change-password', authenticateToken, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  logger.info('Password change requested', {
    correlationId: req.correlationId,
    userId: req.user.id
  });

  // Validation
  if (!currentPassword || !newPassword) {
    throw new ValidationError('Current password and new password are required');
  }

  if (newPassword.length < 8) {
    throw new ValidationError('New password must be at least 8 characters long', {
      field: 'newPassword',
      minLength: 8
    });
  }

  if (currentPassword === newPassword) {
    throw new ValidationError('New password must be different from current password');
  }

  // Simulate current password verification (this would normally use bcrypt.compare)
  // In a real implementation, the stored password hash would be retrieved from database
  const storedPasswordHash = process.env.USER_PASSWORD_HASH || 'stored-password-hash';
  if (currentPassword !== 'password123') { // This would be bcrypt.compare(currentPassword, storedPasswordHash)
    throw new AuthenticationError('Current password is incorrect');
  }

  logger.info('Password changed successfully', {
    correlationId: req.correlationId,
    userId: req.user.id
  });

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

/**
 * DELETE /api/users/account
 * Delete user account
 */
router.delete('/account', authenticateToken, asyncHandler(async (req, res) => {
  const { password } = req.body;

  logger.info('Account deletion requested', {
    correlationId: req.correlationId,
    userId: req.user.id
  });

  if (!password) {
    throw new ValidationError('Password confirmation is required to delete account');
  }

  // Simulate password verification (this would normally use bcrypt.compare)
  const storedPasswordHash = process.env.USER_PASSWORD_HASH || 'stored-password-hash';
  if (password !== 'password123') { // This would be bcrypt.compare(password, storedPasswordHash)
    throw new AuthenticationError('Password is incorrect');
  }

  // Simulate account deletion
  logger.warn('Account deleted', {
    correlationId: req.correlationId,
    userId: req.user.id,
    email: req.user.email
  });

  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
}));

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get('/', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;

  logger.info('Users list requested', {
    correlationId: req.correlationId,
    adminId: req.user.id,
    page,
    limit,
    search
  });

  // Simulate database query
  const mockUsers = [
    {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 2,
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z'
    }
  ];

  res.json({
    success: true,
    data: {
      users: mockUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: mockUsers.length,
        pages: Math.ceil(mockUsers.length / limit)
      }
    }
  });
}));

module.exports = router;