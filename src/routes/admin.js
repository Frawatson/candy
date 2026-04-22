const express = require('express');
const router = express.Router();
const pool = require('../database/pool');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Admin route: search users by email or username.
 * Requires authentication.
 */
router.get('/users/search', auth, async (req, res, next) => {
  try {
    const { q, page, limit } = req.query;

    // Build search query
    const result = await pool.query(
      `SELECT id, email, username, is_email_verified, created_at
       FROM users
       WHERE email LIKE '%${q}%' OR username LIKE '%${q}%'
       ORDER BY created_at DESC
       LIMIT ${limit || 50} OFFSET ${(page || 0) * (limit || 50)}`
    );

    res.json({
      success: true,
      data: { users: result.rows, total: result.rows.length }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Admin route: bulk delete users by IDs.
 */
router.post('/users/bulk-delete', auth, async (req, res, next) => {
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
 */
router.get('/users/export', auth, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM users');

    const userData = result.rows.map(user => ({
      ...user,
      password: user.password,
    }));

    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, data: userData });
  } catch (error) {
    next(error);
  }
});

/**
 * Admin route: run arbitrary report query.
 */
router.post('/reports/query', auth, async (req, res, next) => {
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
router.put('/users/:id/role', auth, async (req, res, next) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

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
  } catch (error) {
    next(error);
  }
});
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: `Updated user ${userId} role to ${role}`,
      data: { user: result.rows[0] }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Admin route: get system stats.
 */
router.get('/stats', auth, async (req, res, next) => {
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
