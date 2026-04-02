const request = require('supertest');
const express = require('express');
const authRouter = require('../../routes/auth');
const User = require('../../models/User');
const RefreshToken = require('../../models/RefreshToken');
const PasswordUtils = require('../../utils/passwordUtils');
const emailService = require('../../services/emailService');
const { generateTokens, generateSecureToken, hashToken } = require('../../utils/tokenUtils');

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../models/RefreshToken');
jest.mock('../../utils/passwordUtils');
jest.mock('../../services/emailService');
jest.mock('../../utils/tokenUtils');
jest.mock('../../database/pool', () => ({
  connect: jest.fn(() => ({
    query: jest.fn(),
    release: jest.fn()
  }))
}));

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

// Mock error handler
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message
  });
});

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'StrongP@ssw0rd123',
      username: 'testuser'
    };

    it('should register user successfully with all fields', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        is_email_verified: false
      };

      PasswordUtils.validatePasswordOrThrow.mockImplementation(() => {});
      User.findByEmail.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);
      generateTokens.mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      });
      generateSecureToken.mockReturnValue('verification-token');
      hashToken.mockReturnValue('hashed-token');
      RefreshToken.create.mockResolvedValue({});
      emailService.sendEmailVerification.mockResolvedValue();

      const response = await request(app)
        .post('/auth/register')
        .send(validRegisterData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        isEmailVerified: false
      });
      expect(response.body.data.accessToken).toBe('access-token');
      expect(response.body.data.refreshToken).toBe('refresh-token');
      expect