const EmailService = require('../../src/services/emailService');
const nodemailer = require('nodemailer');
const emailConfig = require('../../src/config/email');
const { EmailError } = require('../../src/utils/errorTypes');
const { EMAIL_TYPES } = require('../../src/templates/email');

// Mock dependencies
jest.mock('nodemailer');
jest.mock('../../src/config/email');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock nodemailer transporter
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
const mockVerify = jest.fn().mockResolvedValue(true);
const mockTransporter = {
  verify: mockVerify,
  sendMail: mockSendMail,
};
nodemailer.createTransport = jest.fn().mockReturnValue(mockTransporter);

// Mock email config
emailConfig.smtp = {
  host: 'smtp.test.com',
  port: 587,
  secure: false,
  auth: {
    user: 'test@test.com',
    pass: 'testpass',
  },
};
emailConfig.from = {
  email: 'noreply@test.com',
  name: 'Test Service',
};

// Mock environment variables
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'testpass';
process.env.FROM_EMAIL = 'noreply@test.com';
process.env.FROM_NAME = 'Test Service';

describe('EmailService', () => {
  let emailService;

  beforeEach(() => {
    jest.clearAllMocks();
    nodemailer.createTransport.mockReturnValue(mockTransporter);
    mockVerify.mockResolvedValue(true);
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
    // Re-instantiate or reset the singleton state between tests
    emailService = EmailService;
    if (emailService.initialized !== undefined) {
      emailService.initialized = false;
      emailService.transporter = null;
    }
  });

  describe('initialize', () => {
    it('should initialize successfully with valid config', async () => {
      const result = await emailService.initialize();
      expect(result).toBe(true);
      expect(emailService.initialized).toBe(true);
    });

    it('should throw error with missing config', async () => {
      const savedHost = process.env.SMTP_HOST;
      delete process.env.SMTP_HOST;
      // Also clear the mock config to simulate missing config
      const savedConfig = emailConfig.smtp;
      emailConfig.smtp = null;

      await expect(emailService.initialize()).rejects.toThrow(
        'Missing required email configuration'
      );

      // Restore for other tests
      process.env.SMTP_HOST = savedHost;
      emailConfig.smtp = savedConfig;
    });
  });

  describe('sendEmail', () => {
    beforeEach(async () => {
      await emailService.initialize();
    });

    it('should send email successfully', async () => {
      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        type: 'test',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(result.recipient).toBe('test@example.com');
    });

    it('should reject invalid email addresses', async () => {
      const result = await emailService.sendEmail({
        to: 'invalid-email',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email address');
    });

    it('should sanitize email addresses', async () => {
      const result = await emailService.sendEmail({
        to: '  TEST@EXAMPLE.COM  ',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });

      expect(result.success).toBe(true);
      expect(result.recipient).toBe('test@example.com');
    });

    it('should propagate transporter errors gracefully', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection refused'));

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('sendPasswordReset', () => {
    beforeEach(async () => {
      await emailService.initialize();
    });

    it('should send password reset email with valid data', async () => {
      const result = await emailService.sendPasswordReset('test@example.com', {
        name: 'John Doe',
        resetToken: 'test-token',
        baseUrl: 'https://example.com',
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe(EMAIL_TYPES.PASSWORD_RESET);
    });

    it('should fail without reset token', async () => {
      const result = await emailService.sendPasswordReset('test@example.com', {
        name: 'John Doe',
        baseUrl: 'https://example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Reset token is required');
    });

    it('should fail without base URL', async () => {
      const result = await emailService.sendPasswordReset('test@example.com', {
        name: 'John Doe',
        resetToken: 'test-token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Base URL is required');
    });
  });

  describe('sendEmailVerification', () => {
    beforeEach(async () => {
      await emailService.initialize();
    });

    it('should send email verification with valid data', async () => {
      const result = await emailService.sendEmailVerification('test@example.com', {
        name: 'John Doe',
        verificationToken: 'test-token',
        baseUrl: 'https://example.com',
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe(EMAIL_TYPES.EMAIL_VERIFICATION);
    });

    it('should fail without verification token', async () => {
      const result = await emailService.sendEmailVerification('test@example.com', {
        name: 'John Doe',
        baseUrl: 'https://example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Verification token is required');
    });
  });

  describe('sendNotification', () => {
    beforeEach(async () => {
      await emailService.initialize();
    });

    it('should send notification with valid data', async () => {
      const result = await emailService.sendNotification('test@example.com', {
        name: 'John Doe',
        subject: 'Test Notification',
        content: 'This is a test notification',
        type: 'info',
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe(EMAIL_TYPES.USER_NOTIFICATION);
    });

    it('should fail without subject', async () => {
      const result = await emailService.sendNotification('test@example.com', {
        name: 'John Doe',
        content: 'This is a test notification',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Notification subject is required');
    });

    it('should fail without content', async () => {
      const result = await emailService.sendNotification('test@example.com', {
        name: 'John Doe',
        subject: 'Test Notification',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Notification content is required');
    });
  });

  describe('sendBulkEmails', () => {
    beforeEach(async () => {
      await emailService.initialize();
    });

    it('should send bulk notifications', async () => {
      const emails = ['test1@example.com', 'test2@example.com'];
      const data = {
        name: 'User',
        subject: 'Bulk Notification',
        content: 'This is a bulk notification',
      };

      const result = await emailService.sendBulkEmails(
        emails,
        data,
        EMAIL_TYPES.USER_NOTIFICATION
      );

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const result = await emailService.testConnection();
      expect(result.success).toBe(true);
      expect(result.message).toContain('successful');
    });

    it('should return failure when transporter verify fails', async () => {
      mockVerify.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await emailService.testConnection();
      expect(result.success).toBe(false);
    });
  });
});