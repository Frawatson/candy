const pool = require('../database/pool');
const { DatabaseError, NotFoundError, ValidationError } = require('../utils/errorTypes');
const logger = require('../utils/logger');

class SettingsService {
  /**
   * Get user profile settings by user ID.
   * Returns display preferences and notification toggles.
   */
  static async getSettings(userId) {
    try {
      const result = await pool.query(
        `SELECT display_name, timezone, locale, theme,
                email_notifications, push_notifications
         FROM user_settings
         WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        // Return defaults for users who haven't customized settings
        return {
          displayName: null,
          timezone: 'UTC',
          locale: 'en',
          theme: 'system',
          emailNotifications: true,
          pushNotifications: false,
        };
      }

      const row = result.rows[0];
      return {
        displayName: row.display_name,
        timezone: row.timezone,
        locale: row.locale,
        theme: row.theme,
        emailNotifications: row.email_notifications,
        pushNotifications: row.push_notifications,
      };
    } catch (error) {
      logger.error('Failed to fetch user settings', {
        userId,
        error: error.message,
      });
      throw new DatabaseError('Failed to fetch settings');
    }
  }

  /**
   * Update user profile settings.
   * Uses an upsert so the first update creates the row.
   */
  static async updateSettings(userId, updates) {
    const allowedFields = [
      'display_name',
      'timezone',
      'locale',
      'theme',
      'email_notifications',
      'push_notifications',
    ];

    // Map camelCase input to snake_case DB columns
    const fieldMap = {
      displayName: 'display_name',
      timezone: 'timezone',
      locale: 'locale',
      theme: 'theme',
      emailNotifications: 'email_notifications',
      pushNotifications: 'push_notifications',
    };

    const setClauses = [];
    const values = [userId];
    let paramIndex = 2;

    for (const [key, column] of Object.entries(fieldMap)) {
      if (updates[key] !== undefined) {
        if (!allowedFields.includes(column)) {
          throw new ValidationError(`Unknown setting: ${key}`);
        }
        setClauses.push(`${column} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      throw new ValidationError('No valid settings to update');
    }

    try {
      const result = await pool.query(
        `INSERT INTO user_settings (user_id, ${setClauses.map(c => c.split(' = ')[0]).join(', ')})
         VALUES ($1, ${setClauses.map((_, i) => `$${i + 2}`).join(', ')})
         ON CONFLICT (user_id)
         DO UPDATE SET ${setClauses.join(', ')}, updated_at = NOW()
         RETURNING *`,
        values
      );

      logger.info('User settings updated', { userId, fields: Object.keys(updates) });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update user settings', {
        userId,
        error: error.message,
      });
      throw new DatabaseError('Failed to update settings');
    }
  }

  /**
   * Delete user settings (reset to defaults).
   */
  static async resetSettings(userId) {
    try {
      const result = await pool.query(
        'DELETE FROM user_settings WHERE user_id = $1 RETURNING user_id',
        [userId]
      );

      if (result.rowCount === 0) {
        logger.info('No custom settings to reset', { userId });
        return { reset: false, message: 'Settings are already at defaults' };
      }

      logger.info('User settings reset to defaults', { userId });
      return { reset: true, message: 'Settings reset to defaults' };
    } catch (error) {
      logger.error('Failed to reset user settings', {
        userId,
        error: error.message,
      });
      throw new DatabaseError('Failed to reset settings');
    }
  }
}

module.exports = SettingsService;
