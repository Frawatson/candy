const jwt = require('jsonwebtoken');
const auth = require('../../middleware/auth');
const { UnauthorizedError } = require('../../utils/errorTypes');

// Mock the JWT config
jest.mock('../../config/jwt', () => ({
  JWT_SECRET: 'test-jwt-secret'
}));

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('should authenticate valid Bearer token and attach user data to request', () => {
      const mockUser = {
        sub: '123',
        email: 'test@example.com',
        isEmailVerified: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const token = jwt.sign(mockUser, 'test-jwt-secret');
      req.headers.authorization = `Bearer ${token}`;

      auth(req, res, next);

      expect(req.user).toEqual({
        id: mockUser.sub,
        email: mockUser.email,
        isEmailVerified: mockUser.isEmailVerified,
        iat: mockUser.iat,
        exp: mockUser.exp
      });
      expect(next).toHaveBeenCalledWith();
    });

    it('should handle unverified email status correctly', () => {
      const mockUser = {
        sub: '456',
        email: 'unverified@example.com',
        isEmailVerified: false,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const token = jwt.sign(mockUser, 'test-jwt-secret');
      req.headers.authorization = `Bearer ${token}`;

      auth(req, res, next);

      expect(req.user.isEmailVerified).toBe(false);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Error Cases', () => {
    it('should throw UnauthorizedError when no authorization header is provided', () => {
      auth(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'UnauthorizedError',
          message: 'No authorization header provided'
        })
      );
    });

    it('should throw UnauthorizedError when authorization header has invalid format', () => {
      req.headers.authorization = 'InvalidFormat token123';

      auth(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'UnauthorizedError',
          message: 'Invalid authorization header format'
        })
      );
    });

    it('should throw UnauthorizedError when Bearer token is empty', () => {
      req.headers.authorization = 'Bearer ';

      auth(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'UnauthorizedError',
          message: 'No token provided'
        })
      );
    });

    it('should throw UnauthorizedError when token is invalid', () => {
      req.headers.authorization = 'Bearer invalid-token';

      auth(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'UnauthorizedError',
          message: 'Invalid token'
        })
      );
    });

    it('should throw UnauthorizedError when token is expired', () => {
      const expiredToken = jwt.sign({
        sub: '123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      }, 'test-jwt-secret');

      req.headers.authorization = `Bearer ${expiredToken}`;

      auth(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'UnauthorizedError',
          message: 'Token expired'
        })
      );
    });

    it('should throw UnauthorizedError when token is malformed', () => {
      req.headers.authorization = 'Bearer malformed.token.here';

      auth(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'UnauthorizedError',
          message: 'Invalid token'
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle Bearer with lowercase', () => {
      req.headers.authorization = 'bearer valid-token';

      auth(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'UnauthorizedError',
          message: 'Invalid authorization header format'
        })
      );
    });

    it('should handle authorization header with extra spaces', () => {
      const token = jwt.sign({
        sub: '123',
        email: 'test@example.com',
        isEmailVerified: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      }, 'test-jwt-secret');

      req.headers.authorization = `Bearer   ${token}   `;

      auth(req, res, next);

      // Should still work as substring(7) handles the spaces
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('123');
    });

    it('should pass through other types of errors unchanged', () => {
      const customError = new Error('Some other error');
      
      // Mock jwt.verify to throw a custom error
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw customError;
      });

      const token = 'some-token';
      req.headers.authorization = `Bearer ${token}`;

      auth(req, res, next);

      expect(next).toHaveBeenCalledWith(customError);
    });
  });
});