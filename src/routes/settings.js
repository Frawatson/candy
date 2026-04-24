const express = require('express');
const Joi = require('joi');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const SettingsService = require('../services/settingsService');
const { ValidationError } = require('../utils/errorTypes');
const router = express.Router();

// All settings routes require authentication
router.use(auth);

// Validation schemas
const updateSettingsSchema = Joi.object({
  displayName: Joi.string().trim().min(1).max(100).optional(),
  timezone: Joi.string()
    .pattern(/^[A-Za-z0-9_/+\-]+$/)
    .max(50)
    .optional()
    .messages({ 'string.pattern.base': 'Invalid timezone format' }),
  locale: Joi.string()
    .pattern(/^[a-z]{2}(-[A-Z]{2})?$/)
    .optional()
    .messages({ 'string.pattern.base': 'Locale must be like "en" or "en-US"' }),
  theme: Joi.string().valid('light', 'dark', 'system').optional(),
  emailNotifications: Joi.boolean().optional(),
  pushNotifications: Joi.boolean().optional(),
}).min(1).messages({
  'object.min': 'At least one setting must be provided',
});

/**
 * GET /api/settings
 * Get current user's profile settings
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const settings = await SettingsService.getSettings(req.user.id);
    res.json({ settings });
  })
);

/**
 * PUT /api/settings
 * Update current user's profile settings
 */
router.put(
  '/',
  asyncHandler(async (req, res) => {
    const { error, value } = updateSettingsSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      throw new ValidationError(messages.join('; '));
    }

    const updated = await SettingsService.updateSettings(req.user.id, value);
    res.json({ message: 'Settings updated', settings: updated });
  })
);

/**
 * DELETE /api/settings
 * Reset current user's settings to defaults
 */
router.delete(
  '/',
  asyncHandler(async (req, res) => {
    // resetSettings() deletes the row; when no row exists getSettings()
    // returns a hardcoded default object — no DB read is needed after reset.
    await SettingsService.resetSettings(req.user.id);
    const settings = SettingsService.getDefaultSettings();
    res.json({ message: 'Settings reset to defaults', settings });
  })
);

module.exports = router;
