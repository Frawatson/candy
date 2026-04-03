const {
  EMAIL_TYPES,
  EMAIL_SUBJECTS,
  getTemplate,
  getEmailSubject,
  generatePlainText
} = require('../../../src/templates/email');

// Mock the template modules
jest.mock('../../../src/templates/email/passwordReset', () => jest.fn());
jest.mock('../../../src/templates/email/emailVerification', () => jest.fn());
jest.mock('../../../src/templates/email/userNotification', () => jest.fn());

const passwordResetTemplate = require('../../../src/templates/email/passwordReset');
const emailVerificationTemplate = require('../../../src/templates/email/emailVerification');
const userNotificationTemplate = require('../../../src/templates/email/userNotification');

describe('Email Templates Index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('EMAIL_TYPES constant', () => {
    it('should contain all required email types', () => {
      expect(EMAIL_TYPES.PASSWORD_RESET).toBe('password_reset');
      expect(EMAIL_TYPES.EMAIL_VERIFICATION).toBe('email_verification');
      expect(EMAIL_TYPES.USER_NOTIFICATION).toBe('user_notification');
    });
  });

  describe('EMAIL_SUBJECTS constant', () => {
    it('should contain subjects for all email types', () => {
      expect(EMAIL_SUBJECTS[EMAIL_TYPES.PASSWORD_RESET]).toBe('Reset Your Password');
      expect(EMAIL_SUBJECTS[EMAIL_TYPES.EMAIL_VERIFICATION]).toBe('Verify Your Email Address');
      expect(EMAIL_SUBJECTS[EMAIL_TYPES.USER_NOTIFICATION]).toBe('Account Notification');
    });
  });

  describe('getTemplate', () => {
    it('should return password reset template for PASSWORD_RESET type', () => {
      const result = getTemplate(EMAIL_TYPES.PASSWORD_RESET);
      expect(result).toBe(passwordResetTemplate);
    });

    it('should return email verification template for EMAIL_VERIFICATION type', () => {
      const result = getTemplate(EMAIL_TYPES.EMAIL_VERIFICATION);
      expect(result).toBe(emailVerificationTemplate);
    });

    it('should return user notification template for USER_NOTIFICATION type', () => {
      const result = getTemplate(EMAIL_TYPES.USER_NOTIFICATION);
      expect(result).toBe(userNotificationTemplate);
    });

    it('should throw error for unknown template type', () => {
      expect(() => getTemplate('unknown_type')).toThrow('Unknown email template type: unknown_type');
    });

    it('should throw error for null or undefined type', () => {
      expect(() => getTemplate(null)).toThrow('Unknown email template type: null');
      expect(() => getTemplate(undefined)).toThrow('Unknown email template type: undefined');
    });
  });

  describe('getEmailSubject', () => {
    it('should return correct subject for PASSWORD_RESET type', () => {
      const result = getEmailSubject(EMAIL_TYPES.PASSWORD_RESET);
      expect(result).toBe('Reset Your Password');
    });

    it('should return correct subject for EMAIL_VERIFICATION type', () => {
      const result = getEmailSubject(EMAIL_TYPES.EMAIL_VERIFICATION);
      expect(result).toBe('Verify Your Email Address');
    });

    it('should return correct subject for USER_NOTIFICATION type', () => {
      const result = getEmailSubject(EMAIL_TYPES.USER_NOTIFICATION);
      expect(result).toBe('Account Notification');
    });

    it('should return default subject for unknown type', () => {
      const result = getEmailSubject('unknown_type');
      expect(result).toBe('Account Notification');
    });

    it('should return default subject for null or undefined', () => {
      expect(getEmailSubject(null)).toBe('Account Notification');
      expect(getEmailSubject(undefined)).toBe('Account Notification');
    });
  });

  describe('generatePlainText', () => {
    it('should convert basic HTML to plain text', () => {
      const html = '<p>Hello <strong>World</strong>!</p>';
      const result = generatePlainText(html);
      expect(result).toBe('Hello World!');
    });

    it('should remove style tags and content', () => {
      const html = '<style>body { color: red; }</style><p>Content</p>';
      const result = generatePlainText(html);
      expect(result).toBe('Content');
    });

    it('should remove script tags and content', () => {
      const html = '<script>alert("test");</script><p>Content</p>';
      const result = generatePlainText(html);
      expect(result).toBe('Content');
    });

    it('should decode HTML entities', () => {
      const html = '<p>&nbsp;&amp;&lt;&gt;&quot;&#39;</p>';
      const result = generatePlainText(html);
      expect(result).toBe(' &<>"\'');
    });

    it('should normalize whitespace', () => {
      const html = '<p>Multiple   \n\t  spaces</p>';
      const result = generatePlainText(html);
      expect(result).toBe('Multiple spaces');
    });

    it('should handle complex HTML structure', () => {
      const html = `
        <div>
          <h1>Title</h1>
          <p>Paragraph with <a href="#">link</a></p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `;
      const result = generatePlainText(html);
      expect(result).toBe('Title Paragraph with link Item 1 Item 2');
    });

    it('should handle empty or invalid input', () => {
      expect(generatePlainText('')).toBe('');
      expect(generatePlainText(null)).toBe('');
      expect(generatePlainText(undefined)).toBe('');
    });

    it('should handle malformed HTML gracefully', () => {
      const html = '<p>Unclosed paragraph<div>Another element';
      const result = generatePlainText(html);
      expect(result).toBe('Unclosed paragraphAnother element');
    });

    it('should preserve text content while removing tags', () => {
      const html = '<div><p>Line 1</p><p>Line 2</p></div>';
      const result = generatePlainText(html);
      expect(result).toBe('Line 1 Line 2');
    });
  });
});