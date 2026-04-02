const User = require('../../models/User');
const bcrypt = require('bcrypt');
const { DatabaseError } = require('../../utils/errorTypes');

// Mock the database pool
const mockPool = {
  connect: jest.fn(),
  query: jest.fn()
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

jest.mock('../../database/pool', () => mockPool);
jest.mock('../../config/jwt', () => ({
  BCRYPT_ROUNDS: 12
}));

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [] });
  });

  describe('create', () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser'
    };

    it('should create user successfully with all fields', async () => {
      const hashedPassword = 'hashed-password';
      const mockUser = {
        id: 1,
        email: userData.email,
        username: userData.username,
        is_email_verified: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword);
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUser] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await User.create(userData);

      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [userData.email, hashedPassword, userData.username]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result).toEqual(mockUser);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create user successfully without username', async () => {
      const userDataNoUsername = {
        email: 'test@example.com',
        password: 'password123'
      };
      const hashedPassword = 'hashed-password';
      const mockUser = {
        id: 1,
        email: userDataNoUsername.email,
        username: null,
        is_email_verified: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword);
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUser] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await User.create(userDataNoUsername);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [userDataNoUsername.email, hashedPassword, null]
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw DatabaseError when email already exists', async () => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password');
      const duplicateError = new Error('Duplicate key violation');
      duplicateError.constraint = 'users_email_unique';
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(duplicateError) // INSERT fails
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(User.create(userData)).rejects.toThrow(
        expect.objectContaining({
          name: 'DatabaseError',
          message: 'Email already exists'
        })
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw DatabaseError for other database errors', async () => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password');
      const dbError = new Error('Database connection failed');
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(dbError); // INSERT fails

      await expect(User.create(userData)).rejects.toThrow(
        expect.objectContaining({
          name: 'DatabaseError',
          message: 'Failed to create user: Database connection failed'
        })
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password',
        username: 'testuser',
        is_email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await User.findByEmail('test@example.com');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, email, password, username'),
        ['test@example.com']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await User.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should throw DatabaseError on query failure', async () => {
      const dbError = new Error('Query failed');
      mockPool.query.mockRejectedValue(dbError);

      await expect(User.findByEmail('test@example.com')).rejects.toThrow(
        expect.objectContaining({
          name: 'DatabaseError',
          message: 'Failed to find user by email: Query failed'
        })
      );
    });
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        is_email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await User.findById(1);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, email, username'),
        [1]
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await User.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching passwords', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const result = await User.verifyPassword('plaintext', 'hashed');

      expect(bcrypt.compare).toHaveBeenCalledWith('plaintext', 'hashed');
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      const result = await User.verifyPassword('wrongpassword', 'hashed');

      expect(result).toBe(false);
    });

    it('should throw DatabaseError on bcrypt failure', async () => {
      const bcryptError = new Error('Bcrypt failed');
      jest.spyOn(bcrypt, 'compare').mockRejectedValue(bcryptError);

      await expect(User.verifyPassword('plain', 'hashed')).rejects.toThrow(
        expect.objectContaining({
          name: 'DatabaseError',
          message: 'Password verification failed: Bcrypt failed'
        })
      );
    });
  });

  describe('updateEmailVerification', () => {
    it('should update email verification successfully', async () => {
      const mockUpdatedUser = {
        id: 1,
        email: 'test@example.com',
        is_email_verified: true,
        email_verified_at: new Date()
      };

      mockPool.query.mockResolvedValue({ rows: [mockUpdatedUser] });

      const result = await User.updateEmailVerification(1, true);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [true, expect.any(Date), 1]
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should set verification to false with null timestamp', async () => {
      const mockUpdatedUser = {
        id: 1,
        email: 'test@example.com',
        is_email_verified: false,
        email_verified_at: null
      };

      mockPool.query.mockResolvedValue({ rows: [mockUpdatedUser] });

      const result = await User.updateEmailVerification(1, false);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [false, null, 1]
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should return null when user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await User.updateEmailVerification(999, true);

      expect(result).toBeNull();
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      const hashedPassword = 'new-hashed-password';
      const mockUpdatedUser = {
        id: 1,
        email: 'test@example.com',
        updated_at: new Date()
      };

      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword);
      mockPool.query.mockResolvedValue({ rows: [mockUpdatedUser] });

      const result = await User.updatePassword(1, 'newpassword123');

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 12);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [hashedPassword, 1]
      );
      expect(result).toEqual(mockUpdatedUser);
    });
  });

  describe('emailExists', () => {
    it('should return true when email exists', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await User.emailExists('existing@example.com');

      expect(result).toBe(true);
    });

    it('should return false when email does not exist', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await User.emailExists('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      const mockProfile = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        is_email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query.mockResolvedValue({ rows: [mockProfile] });

      const result = await User.getProfile(1);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, email, username'),
        [1]
      );
      expect(result).toEqual(mockProfile);
    });

    it('should return null when user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await User.getProfile(999);

      expect(result).toBeNull();
    });
  });
});