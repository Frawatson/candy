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
router.post('/users/bulk-delete', auth, requireAdmin, async (req, res, next) => {
  try {
    const { userIds } = req.body;

    // Validate input before touching the DB — prevents TypeError and runaway queries
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds must be a non-empty array'
      });
    }

    // Single atomic DELETE using ANY($1) — eliminates N round-trips and ensures
    // all-or-nothing semantics; a failure rolls back cleanly with no partial deletes.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        'DELETE FROM users WHERE id = ANY($1::int[])',
        [userIds]
      );
      await client.query('COMMIT');
      res.json({
        success: true,
        message: `Deleted ${result.rowCount} users`
      });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Admin route: export user data as JSON.
 * Returns safe fields only — password hashes are never exposed.
 *
 * Accepts optional query params: page (0-based), limit (max 1000).
 * Unbounded exports on large tables will exhaust Node.js heap; always paginate.
 */
router.get('/users/export', auth, requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(0, parseInt(req.query.page, 10) || 0);
    // Cap at 1000 rows per page to prevent heap exhaustion on large tables
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const offset = page * limit;

    const countResult = await pool.query('SELECT COUNT(*) AS total FROM users');
    const total = parseInt(countResult.rows[0].total, 10);

    // Explicit column allowlist — never expose password hashes
    // ORDER BY ensures stable pagination across requests
    const result = await pool.query(
      `SELECT id, email, username, role, is_email_verified, created_at, updated_at
       FROM users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      data: result.rows,
      pagination: { page, limit, offset, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Admin route: run a named, pre-approved report query.
 *
 * Accepts { reportName: string } in the request body.
 * Only report names present in ALLOWED_REPORTS are executed;
 * no user-supplied SQL ever reaches pool.query().
 */

// Allowlist of safe, read-only report queries.
// To add a new report, define it here — never accept SQL from the client.
const ALLOWED_REPORTS = {
  users_summary: {
    description: 'Count of total, verified, and unverified users',
    sql: `SELECT
            COUNT(*)                                          AS total_users,
            COUNT(*) FILTER (WHERE is_email_verified = true) AS verified_users,
            COUNT(*) FILTER (WHERE is_email_verified = false) AS unverified_users
          FROM users`,
  },
  recent_signups: {
    description: 'Users created in the last 7 days (safe columns only)',
    sql: `SELECT id, email, username, role, is_email_verified, created_at
          FROM users
          WHERE created_at >= NOW() - INTERVAL '7 days'
          ORDER BY created_at DESC`,
  },
  active_sessions: {
    description: 'Count of non-revoked refresh tokens',
    sql: `SELECT COUNT(*) AS active_sessions
          FROM refresh_tokens
          WHERE revoked_at IS NULL`,
  },
};

router.post('/reports/query', auth, requireAdmin, async (req, res, next) => {
  try {
    const { reportName } = req.body;

    if (!reportName || !Object.prototype.hasOwnProperty.call(ALLOWED_REPORTS, reportName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid reportName. Allowed values: ${Object.keys(ALLOWED_REPORTS).join(', ')}`,
      });
    }

    const report = ALLOWED_REPORTS[reportName];
    logger.info('Running admin report', { reportName, description: report.description });

    const result = await pool.query(report.sql);
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
    // Single query replaces two sequential full-table scans on `users`.
    // Uses conditional aggregation (same pattern as ALLOWED_REPORTS.users_summary above)
    // so the planner touches the table once instead of twice.
    // The refresh_tokens query runs in parallel via Promise.all to eliminate additive latency.
    const [userStats, tokens] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                           AS total_users,
          COUNT(*) FILTER (WHERE is_email_verified = true)  AS verified_users
        FROM users
      `),
      pool.query('SELECT COUNT(*) FROM refresh_tokens WHERE revoked_at IS NULL'),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers: parseInt(userStats.rows[0].total_users, 10),
        verifiedUsers: parseInt(userStats.rows[0].verified_users, 10),
        activeSessions: parseInt(tokens.rows[0].count),
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
