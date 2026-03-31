const request = require('supertest');
const crypto = require('crypto');

/**
 * Test helper utilities for Auth API testing
 */

// Mock data generators
const mockUser = (overrides = {}) => ({
  id: Math.floor(Math.random() * 10000),
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

const mockTokens = () => ({
  accessToken: `mock-jwt-access-${crypto.randomBytes(16).toString('hex')}`,
  refreshToken: `mock-jwt-refresh-${crypto.randomBytes(16).toString('hex')}`
});

const mockActiveToken = (overrides = {}) => ({
  id: `token-${crypto.randomBytes(8).toString('hex')}`,
  deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
  ipAddress: '192.168.1.100',
  lastUsed: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  isCurrentToken: false,
  ...overrides
});

// Request helpers
const makeRequest = (app) => ({
  post: (url) => request(app).post(url),
  get: (url) => request(app).get(url),
  put: (url) => request(app).put(url),
  delete: (url) => request(app).delete(url),
  patch: (url) => request(app).patch(url)
});

const withAuth = (requestBuilder, token) => {
  return requestBuilder.set('Authorization', `Bearer ${token}`);
};

const withHeaders = (requestBuilder, headers = {}) => {
  Object.entries(headers).forEach(([key, value]) => {
    requestBuilder.set(key, value);
  });
  return requestBuilder;
};

// Validation helpers
const expectValidationError = (response, field) => {
  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.code).toBe('VALIDATION_ERROR');
  expect(response.body.details).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        field: expect.stringContaining(field)
      })
    ])
  );
};

const expectAuthError = (response, message = 'Invalid credentials') => {
  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
  expect(response.body.code).toBe('AUTHENTICATION_ERROR');
  expect(response.body.error).toContain(message);
};

const expectSuccess = (response, statusCode = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(true);
  expect(response.body.message).toBeDefined();
  expect(response.body.data).toBeDefined();
};

const expectError = (response, statusCode, errorCode) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(false);
  expect(response.body.error).toBeDefined();
  expect(response.body.code).toBe(errorCode);
};

// Rate limiting helpers
const makeMultipleRequests = async (requestBuilder, count = 5) => {
  const promises = Array(count).fill().map(() => requestBuilder.send());
  return Promise.all(promises);
};

// Database mock helpers
const mockDatabase = () => {
  const users = new Map();
  const tokens = new Map();
  const resetTokens = new Map();
  const verificationTokens = new Map();

  return {
    users: {
      create: jest.fn((userData) => {
        const user = mockUser(userData);
        users.set(user.id, user);
        return Promise.resolve(user);
      }),
      findByEmail: jest.fn((email) => {
        const user = Array.from(users.values()).find(u => u.email === email);
        return Promise.resolve(user || null);
      }),
      findById: jest.fn((id) => {
        return Promise.resolve(users.get(id) || null);
      }),
      update: jest.fn((id, updates) => {
        const user = users.get(id);
        if (user) {
          const updated = { ...user, ...updates, updatedAt: new Date().toISOString() };
          users.set(id, updated);
          return Promise.resolve(updated);
        }
        return Promise.resolve(null);
      }),
      delete: jest.fn((id) => {
        const existed = users.has(id);
        users.delete(id);
        return Promise.resolve(existed);
      }),
      list: jest.fn(({ page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc' }) => {
        const allUsers = Array.from(users.values());
        const filtered = search 
          ? allUsers.filter(u => u.name.includes(search) || u.email.includes(search))
          : allUsers;
        
        const sorted = filtered.sort((a, b) => {
          const aVal = a[sortBy];
          const bVal = b[sortBy];
          const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          return sortOrder === 'desc' ? -comparison : comparison;
        });

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedUsers = sorted.slice(startIndex, endIndex);

        return Promise.resolve({
          users: paginatedUsers,
          pagination: {
            page,
            limit,
            total: filtered.length,
            pages: Math.ceil(filtered.length / limit),
            hasNext: endIndex < filtered.length,
            hasPrev: page > 1
          }
        });
      })
    },
    tokens: {
      create: jest.fn((tokenData) => {
        const token = { id: crypto.randomBytes(16).toString('hex'), ...tokenData };
        tokens.set(token.id, token);
        return Promise.resolve(token);
      }),
      findByToken: jest.fn((token) => {
        const tokenData = Array.from(tokens.values()).find(t => t.token === token);
        return Promise.resolve(tokenData || null);
      }),
      revoke: jest.fn((tokenId) => {
        const existed = tokens.has(tokenId);
        tokens.delete(tokenId);
        return Promise.resolve(existed);
      }),
      revokeAllForUser: jest.fn((userId) => {
        const userTokens = Array.from(tokens.values()).filter(t => t.userId === userId);
        userTokens.forEach(t => tokens.delete(t.id));
        return Promise.resolve(userTokens.length);
      }),
      findActiveForUser: jest.fn((userId) => {
        const userTokens = Array.from(tokens.values()).filter(t => t.userId === userId);
        return Promise.resolve(userTokens);
      })
    },
    resetTokens: {
      create: jest.fn((tokenData) => {
        const token = { id: crypto.randomBytes(32).toString('hex'), ...tokenData };
        resetTokens.set(token.token, token);
        return Promise.resolve(token);
      }),
      findByToken: jest.fn((token) => {
        return Promise.resolve(resetTokens.get(token) || null);
      }),
      delete: jest.fn((token) => {
        const existed = resetTokens.has(token);
        resetTokens.delete(token);
        return Promise.resolve(existed);
      })
    },
    verificationTokens: {
      create: jest.fn((tokenData) => {
        const token = { id: crypto.randomBytes(32).toString('hex'), ...tokenData };
        verificationTokens.set(token.token, token);
        return Promise.resolve(token);
      }),
      findByToken: jest.fn((token) => {
        return Promise.resolve(verificationTokens.get(token) || null);
      }),
      delete: jest.fn((token) => {
        const existed = verificationTokens.has(token);
        verificationTokens.delete(token);
        return Promise.resolve(existed);
      })
    },
    // Reset all mocks
    reset: () => {
      users.clear();
      tokens.clear();
      resetTokens.clear();
      verificationTokens.clear();
      Object.values(mockDatabase().users).forEach(fn => fn.mockClear?.());
      Object.values(mockDatabase().tokens).forEach(fn => fn.mockClear?.());
      Object.values(mockDatabase().resetTokens).forEach(fn => fn.mockClear?.());
      Object.values(mockDatabase().verificationTokens).forEach(fn => fn.mockClear?.());
    }
  };
};

module.exports = {
  mockUser,
  mockTokens,
  mockActiveToken,
  makeRequest,
  withAuth,
  withHeaders,
  expectValidationError,
  expectAuthError,
  expectSuccess,
  expectError,
  makeMultipleRequests,
  mockDatabase
};