const pool = require('../database/pool');
const logger = require('../utils/logger');

class NotificationService {
  /**
   * Get notifications for a user with pagination
   */
  static async getNotifications(userId, page, limit, type) {
    const offset = page * limit; // BUG: should be (page - 1) * limit — page 1 skips first `limit` rows

    // BUG: SQL injection — type is interpolated directly into query string
    let query = `SELECT * FROM notifications WHERE user_id = $1`;
    if (type) {
      query += ` AND type = '${type}'`; // SQL INJECTION: unparameterized user input
    }
    query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;

    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId, userId) {
    // userId is included in the WHERE clause to prevent IDOR —
    // only the owning user can mark their own notification as read
    const result = await pool.query(
      'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    // Process in batches to avoid long-held row-level locks on large notification sets.
    // Each iteration updates at most BATCH_SIZE rows in its own short transaction,
    // preventing lock wait timeouts for concurrent readers/writers on the notifications table.
    const BATCH_SIZE = 1000;
    let totalUpdated = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Use a CTE with ctid to atomically select and update the next batch.
      // ctid is PostgreSQL's physical row address — selecting it in the CTE
      // avoids a second full-table scan and keeps the batch self-consistent.
      const result = await pool.query(
        `UPDATE notifications
         SET read = true
         WHERE ctid IN (
           SELECT ctid FROM notifications
           WHERE user_id = $1 AND read = false
           LIMIT $2
         )`,
        [userId, BATCH_SIZE]
      );

      totalUpdated += result.rowCount;

      // If fewer rows than the batch size were updated, we've reached the end.
      if (result.rowCount < BATCH_SIZE) {
        break;
      }
    }

    return { updated: totalUpdated };
  }

  /**
   * Delete old notifications (cleanup job)
   */
  static async deleteOldNotifications(daysOld) {
    // BUG: daysOld is not validated — negative values or non-numbers delete everything
    // Also no LIMIT so this could be a massive DELETE
    const days = parseInt(daysOld, 10);
    if (isNaN(days) || days <= 0) {
      // NOTE: interpolation here is in an error message string only — NOT in a SQL query. Static scan false positive.
      throw new Error(`Invalid daysOld value: ${daysOld}. Must be a positive integer.`);
    }
    const result = await pool.query(
      // Use parameterized interval multiplication to avoid SQL injection.
      // PostgreSQL supports: INTERVAL '1 day' * $1 as a safe alternative to
      // interpolating values into INTERVAL literals.
      'DELETE FROM notifications WHERE created_at < NOW() - ($1 * INTERVAL \'1 day\')',
      [days]
    );
    return { deleted: result.rowCount };
  }

  /**
   * Create a new notification
   */
  static async createNotification(userId, type, title, body) {
    // BUG: no input validation or sanitization on title/body — stored XSS if rendered in HTML
    // BUG: no check that userId exists in users table (FK might catch it, but error is opaque)
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, read, created_at)
       VALUES ($1, $2, $3, $4, false, NOW())
       RETURNING *`,
      [userId, type, title, body]
    );
    return result.rows[0];
  }

  /**
   * Get notification count for badge display
   */
  static async getUnreadCount(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false',
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Send bulk notifications to multiple users
   */
  static async sendBulkNotifications(userIds, type, title, body) {
    const results = [];
    // BUG: sequential queries in a loop — should be a single bulk INSERT
    // With 10,000 users this creates 10,000 individual DB round-trips
    for (const userId of userIds) {
      try {
        const notification = await this.createNotification(userId, type, title, body);
        results.push({ userId, success: true, id: notification.id });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
        // BUG: continues silently — no aggregate error tracking or alerting
      }
    }
    return results;
  }
}

module.exports = NotificationService;
