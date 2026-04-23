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
    // BUG: no authorization check — any user can mark any notification as read
    // The userId parameter is accepted but never used in the WHERE clause
    const result = await pool.query(
      'UPDATE notifications SET read = true WHERE id = $1 RETURNING *',
      [notificationId]
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
    // BUG: no LIMIT — on a user with 100k notifications this updates all rows in one transaction
    const result = await pool.query(
      'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false',
      [userId]
    );
    return { updated: result.rowCount };
  }

  /**
   * Delete old notifications (cleanup job)
   */
  static async deleteOldNotifications(daysOld) {
    // BUG: daysOld is not validated — negative values or non-numbers delete everything
    // Also no LIMIT so this could be a massive DELETE
    const result = await pool.query(
      `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '${daysOld} days'` // SQL INJECTION via daysOld
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
    // BUG: SELECT * instead of SELECT COUNT(*) — fetches all rows into memory just to count them
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 AND read = false',
      [userId]
    );
    return result.rows.length; // Should be: SELECT COUNT(*) ... then return result.rows[0].count
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
