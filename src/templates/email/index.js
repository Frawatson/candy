const passwordResetTemplate = require('./passwordReset');
const emailVerificationTemplate = require('./emailVerification');
const userNotificationTemplate = require('./userNotification');
const { convert } = require('html-to-text');

const EMAIL_TYPES = {
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
  USER_NOTIFICATION: 'user_notification'
};

const getTemplate = (type, data) => {
  switch (type) {
    case EMAIL_TYPES.PASSWORD_RESET:
      return passwordResetTemplate(data);
    case EMAIL_TYPES.EMAIL_VERIFICATION:
      return emailVerificationTemplate(data);
    case EMAIL_TYPES.USER_NOTIFICATION:
      return userNotificationTemplate(data);
    default:
      throw new Error(`Unknown email template type: ${type}`);
  }
};

const generatePlainText = (html) => {
  return convert(html, {
    wordwrap: 130,
    selectors: [
      { selector: 'a', options: { ignoreHref: false } },
      { selector: 'h1', options: { uppercase: false } },
      { selector: 'h2', options: { uppercase: false } },
      { selector: 'h3', options: { uppercase: false } }
    ]
  });
};

const getEmailSubject = (type, data = {}) => {
  switch (type) {
    case EMAIL_TYPES.PASSWORD_RESET:
      return 'Reset Your Authentication System Password';
    case EMAIL_TYPES.EMAIL_VERIFICATION:
      return 'Verify Your Authentication System Email Address';
    case EMAIL_TYPES.USER_NOTIFICATION:
      return data.subject || 'Authentication System Notification';
    default:
      return 'Authentication System Notification';
  }
};

module.exports = {
  EMAIL_TYPES,
  getTemplate,
  generatePlainText,
  getEmailSubject,
  passwordResetTemplate,
  emailVerificationTemplate,
  userNotificationTemplate
};