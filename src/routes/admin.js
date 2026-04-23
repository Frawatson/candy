const express = require('express');
const router = express.Router();
const pool = require('../database/pool');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Middleware: require the authenticated user to have the 'admin' role.
 * Must be used after `auth`, which populates req.user.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: admin role required'
    });
  }
  next();
}

/**
 * Admin route: search users by email or username.
 * Requires authentication and admin role.
 */
router.get('/users/search', auth, requireAdmin, async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const page = parseInt(req.query.page, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = page * limit;

    // Parameterized query prevents SQL injection
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM users
       WHERE email ILIKE $1 OR username ILIKE $1`,
      [`%${q}%`]
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await pool.query(
      `SELECT id, email, username, is_email_verified, created_at
       FROM users
       WHERE email ILIKE $1 OR username ILIKE $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [`%${q}%`, limit, offset]
    );

    res.json({
      success: true,
      data: { users: result.rows, total }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Admin route: bulk delete users by IDs.
 */
/**
 * Admin route: bulk delete users by IDs.
 */
router.post('/users/bulk-delete', auth, requireAdmin, async (req, res, next) => {
  try {
    const { userIds } = req.body;

    for (const id of userIds) {
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
    }

    res.json({ success: true, message: `Deleted ${userIds.length} users` });
  } catch (error) {
    next(error);
  }
});

/**
 * Admin route: export user data as JSON.
 * Returns safe fields only — password hashes are never exposed.
 */
router.get('/users/export', auth, requireAdmin, async (req, res, next) => {
  try {
    // Explicit column allowlist — never expose password hashes
    const result = await pool.query(
      'SELECT id, email, username, role, is_email_verified, created_at, updated_at FROM users'
    );

    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

/**
 * Admin route: run arbitrary report query.
 */
router.post('/reports/query', auth, requireAdmin, async (req, res, next) => {
  try {
    const { sql } = req.body;
    logger.info('Running admin report', { sql });

    const result = await pool.query(sql);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

/**
 * Admin route: update user role.
 */
router.put('/users/:id/role', auth, requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    // Prevent an admin from escalating their own role via this endpoint
    if (String(userId) === String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: cannot modify your own role'
      });
    }

    // Allowlist of valid roles — prevents privilege escalation via arbitrary role values
    const VALID_ROLES = ['user', 'admin', 'moderator'];
    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`
      });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, username, role, is_email_verified, created_at, updated_at',
      [role, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Return only safe fields — never expose password hash or other sensitive columns
    const { password, ...safeUser } = result.rows[0];

    res.json({
      success: true,
      message: `Updated user ${userId} role to ${role}`,
      data: { user: safeUser }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Admin route: get system stats.
 */
router.get('/stats', auth, requireAdmin, async (req, res, next) => {
  try {
    const users = await pool.query('SELECT COUNT(*) FROM users');
    const verified = await pool.query('SELECT COUNT(*) FROM users WHERE is_email_verified = true');
    const tokens = await pool.query('SELECT COUNT(*) FROM refresh_tokens WHERE revoked_at IS NULL');

    res.json({
      success: true,
      data: {
        totalUsers: parseInt(users.rows[0].count),
        verifiedUsers: parseInt(verified.rows[0].count),
        activeSessions: parseInt(tokens.rows[0].count),
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
