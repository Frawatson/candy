const passwordResetTemplate = require('./passwordReset');
const emailVerificationTemplate = require('./emailVerification');
const userNotificationTemplate = require('./userNotification');

const EMAIL_TYPES = {
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
  USER_NOTIFICATION: 'user_notification'
};

const EMAIL_SUBJECTS = {
  [EMAIL_TYPES.PASSWORD_RESET]: 'Reset Your Password',
  [EMAIL_TYPES.EMAIL_VERIFICATION]: 'Verify Your Email Address',
  [EMAIL_TYPES.USER_NOTIFICATION]: 'Account Notification'
};

/**
 * Get email template by type
 * @param {string} type - Email type constant
 * @returns {Function} Template function
 */
function getTemplate(type) {
  switch (type) {
    case EMAIL_TYPES.PASSWORD_RESET:
      return passwordResetTemplate;
    case EMAIL_TYPES.EMAIL_VERIFICATION:
      return emailVerificationTemplate;
    case EMAIL_TYPES.USER_NOTIFICATION:
      return userNotificationTemplate;
    default:
      throw new Error(`Unknown email template type: ${type}`);
  }
}

/**
 * Get email subject by type
 * @param {string} type - Email type constant
 * @returns {string} Email subject
 */
function getEmailSubject(type) {
  return EMAIL_SUBJECTS[type] || 'Account Notification';
}

/**
 * Convert HTML to plain text
 * @param {string} html - HTML content
 * @returns {string} Plain text version
 */
function generatePlainText(html) {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  EMAIL_TYPES,
  EMAIL_SUBJECTS,
  getTemplate,
  getEmailSubject,
  generatePlainText
};