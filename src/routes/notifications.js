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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // BUG: default 50 is too high, no max cap
    const type = req.query.type; // BUG: passed directly to SQL without validation

    const notifications = await NotificationService.getNotifications(
      req.user.id,
      page,
      limit,
      type
    );

    // BUG: no total count returned — client can't build pagination UI
    res.json({ notifications });
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
      req.user.id // BUG: passed but service ignores it — IDOR vulnerability
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
 * Create a notification (admin only — but no admin check here)
 */
router.post(
  '/',
  // BUG: no admin/role check — any authenticated user can create notifications for any user
  asyncHandler(async (req, res) => {
    const { userId, type, title, body } = req.body;

    // BUG: no validation that userId, type, title, body are present and valid
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const notification = await NotificationService.createNotification(
      userId || req.user.id, // BUG: allows targeting any user
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
  // BUG: no admin check, no rate limiting on bulk endpoint
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
  // BUG: no admin check — any user can trigger cleanup
  asyncHandler(async (req, res) => {
    const daysOld = req.query.days || 30; // BUG: user-controlled, goes directly to SQL
    const result = await NotificationService.deleteOldNotifications(daysOld);
    res.json(result);
  })
);

module.exports = router;
