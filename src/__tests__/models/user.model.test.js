// Create user model first for testing
const db = require('../../database/connection');

// Mock the database connection
jest.mock('../../database/connection');

// User model implementation would go here for testing
class UserModel {
  static async create(userData) {
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, first_name, last_name, is_active, created_at
    `;
    const values = [userData.email, userData.passwordHash, userData.firstName, userData.lastName];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async updateLoginAttempts(userId, attempts) {
    const query = 'UPDATE users SET login_attempts = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await db.query(query, [attempts, userId]);
  }

  static async lockUser(userId, lockoutDuration) {
    const lockedUntil = new Date(Date.now() + lockoutDuration);
    const query = 'UPDATE users SET locked_until = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await db.query(query, [lockedUntil, userId]);
  }

  static async updateLastLogin(userId) {
    const query = 'UPDATE users SET last_login = CURRENT_TIMESTAMP, login_attempts = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await db.query(query, [userId]);
  }
}

describe('UserModel', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: 'hashedPassword',
    first_name: 'John',
    last_name: 'Doe',
    is_active: true,
    created_at: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        firstName: 'John',
        lastName: 'Doe'
      };

      db.query.mockResolvedValue({
        rows: [mockUser]
      });

      const result = await UserModel.create(userData);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [userData.email, userData.passwordHash, userData.firstName, userData.lastName]
      );
      expect(result).toEqual(mockUser);
    });

    it('should handle database errors', async () => {
      db.query.mockRejectedValue(new Error('Database error'));

      await expect(UserModel.create({})).rejects.toThrow('Database error');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      db.query.mockResolvedValue({
        rows: [mockUser]
      });

      const result = await UserModel.findByEmail('test@example.com');

      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        ['test@example.com']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return undefined for non-existent user', async () => {
      db.query.mockResolvedValue({
        rows: []
      });

      const result = await UserModel.findByEmail('nonexistent@example.com');

      expect(result).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      db.query.mockResolvedValue({
        rows: [mockUser]
      });

      const result = await UserModel.findById('user-123');

      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        ['user-123']
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateLoginAttempts', () => {
    it('should update login attempts', async () => {
      db.query.mockResolvedValue({ rowCount: 1 });

      await UserModel.updateLoginAttempts('user-123', 3);

      expect(db.query).toHaveBeenCalledWith(
        'UPDATE users SET login_attempts = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [3, 'user-123']
      );
    });
  });

  describe('lockUser', () => {
    it('should lock user account', async () => {
      db.query.mockResolvedValue({ rowCount: 1 });

      await UserModel.lockUser('user-123', 900000); // 15 minutes

      expect(db.query).toHaveBeenCalledWith(
        'UPDATE users SET locked_until = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [expect.any(Date), 'user-123']
      );
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login time and reset attempts', async () => {
      db.query.mockResolvedValue({ rowCount: 1 });

      await UserModel.updateLastLogin('user-123');

      expect(db.query).toHaveBeenCalledWith(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP, login_attempts = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['user-123']
      );
    });
  });
});

module.exports = UserModel;