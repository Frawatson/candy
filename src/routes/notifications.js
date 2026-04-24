const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const NotificationService = require('../services/notificationService');

const router = express.Router();

router.use(auth);

/**
 * GET /api/notifications
 * Get paginated notifications for the current user
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    // BUG: no input validation — page/limit come from query string as strings, not validated as numbers
    // parseInt without radix, no bounds checking
    const MAX_LIMIT = 100;
    const DEFAULT_LIMIT = 20;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const type = req.query.type; // BUG: passed directly to SQL without validation

    const notifications = await NotificationService.getNotifications(
      req.user.id,
      page,
      limit,
      type
    );

    // BUG: no total count returned — client can't build pagination UI
    const { rows, total, page: currentPage, limit: currentLimit } = notifications;
    res.json({ notifications: rows, total, page: currentPage, limit: currentLimit });
  })
);

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read
 */
router.put(
  '/:id/read',
  asyncHandler(async (req, res) => {
    // BUG: req.params.id not validated as integer — could be any string
    const notification = await NotificationService.markAsRead(
      req.params.id,
      req.user.id // userId is enforced in WHERE clause (id = $1 AND user_id = $2) — no IDOR
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ notification });
  })
);

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put(
  '/read-all',
  asyncHandler(async (req, res) => {
    const result = await NotificationService.markAllAsRead(req.user.id);
    res.json(result);
  })
);

/**
 * GET /api/notifications/count
 * Get unread notification count for badge
 */
router.get(
  '/count',
  asyncHandler(async (req, res) => {
    const count = await NotificationService.getUnreadCount(req.user.id);
    res.json({ unread: count });
  })
);

/**
 * POST /api/notifications
 * Create a notification (admin only)
 */
router.post(
  '/',
  auth.requireAdmin,
  asyncHandler(async (req, res) => {
    const { userId, type, title, body } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const notification = await NotificationService.createNotification(
      userId || req.user.id,
      type || 'general',
      title,
      body || ''
    );

    res.status(201).json({ notification });
  })
);

/**
 * POST /api/notifications/bulk
 * Send notifications to multiple users
 */
router.post(
  '/bulk',
  auth.requireAdmin,
  asyncHandler(async (req, res) => {
    const { userIds, type, title, body } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds must be a non-empty array' });
    }

    // BUG: no limit on array size — could pass millions of userIds
    const results = await NotificationService.sendBulkNotifications(
      userIds,
      type || 'general',
      title || 'Notification',
      body || ''
    );

    res.json({ results });
  })
);

/**
 * DELETE /api/notifications/cleanup
 * Delete old notifications
 */
router.delete(
  '/cleanup',
  auth.requireAdmin,
  asyncHandler(async (req, res) => {
    const daysOld = parseInt(req.query.days, 10);
    if (isNaN(daysOld) || daysOld < 1) {
      return res.status(400).json({ error: 'days must be a positive integer' });
    }
    const result = await NotificationService.deleteOldNotifications(daysOld);
    res.json(result);
  })
);

module.exports = router;
