const { testDb } = require('./testDatabase');

// Mock email service responses
const mockEmailResponses = {
  success: {
    success: true,
    messageId: 'mock-message-id-' + Date.now(),
    response: '250 OK',
  },
  failure: {
    success: false,
    error: 'SMTP connection failed',
    code: 'ECONNREFUSED',
  },
  timeout: {
    success: false,
    error: 'Connection timeout',
    code: 'ETIMEDOUT',
  },
};

// Email service mock
class MockEmailService {
  constructor() {
    this.sentEmails = [];
    this.shouldFail = false;
    this.failureType = 'failure';
    this.delay = 0;
  }

  async sendEmail(emailData) {
    // Simulate delay
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    // Simulate failure
    if (this.shouldFail) {
      const error = new Error(mockEmailResponses[this.failureType].error);
      error.code = mockEmailResponses[this.failureType].code;
      throw error;
    }

    // Record sent email
    const sentEmail = {
      ...emailData,
      sentAt: new Date().toISOString(),
      messageId: mockEmailResponses.success.messageId,
    };

    this.sentEmails.push(sentEmail);

    // Log to test database
    await testDb.logEmail({
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      template: emailData.template,
      status: 'sent',
    });

    return mockEmailResponses.success;
  }

  async sendVerificationEmail(userEmail, verificationToken) {
    return await this.sendEmail({
      to: userEmail,
      from: 'noreply@example.com',
      subject: 'Verify Your Email Address',
      template: 'emailVerification',
      data: {
        verificationToken,
        verificationUrl: `http://localhost:3000/verify-email?token=${verificationToken}`,
      },
    });
  }

  async sendPasswordResetEmail(userEmail, resetToken) {
    return await this.sendEmail({
      to: userEmail,
      from: 'noreply@example.com',
      subject: 'Reset Your Password',
      template: 'passwordReset',
      data: {
        resetToken,
        resetUrl: `http://localhost:3000/reset-password?token=${resetToken}`,
      },
    });
  }

  async sendWelcomeEmail(userEmail, userName) {
    return await this.sendEmail({
      to: userEmail,
      from: 'noreply@example.com',
      subject: 'Welcome to Our Platform',
      template: 'welcome',
      data: {
        userName,
      },
    });
  }

  // Test utilities
  getSentEmails() {
    return [...this.sentEmails];
  }

  getEmailsSentTo(email) {
    return this.sentEmails.filter(e => e.to === email);
  }

  getEmailsByTemplate(template) {
    return this.sentEmails.filter(e => e.template === template);
  }

  clearSentEmails() {
    this.sentEmails = [];
  }

  setFailure(shouldFail, failureType = 'failure') {
    this.shouldFail = shouldFail;
    this.failureType = failureType;
  }

  setDelay(delay) {
    this.delay = delay;
  }

  reset() {
    this.sentEmails = [];
    this.shouldFail = false;
    this.failureType = 'failure';
    this.delay = 0;
  }
}

// Email template validators
const validateEmailTemplate = (template, data) => {
  const templates = {
    emailVerification: ['verificationToken', 'verificationUrl'],
    passwordReset: ['resetToken', 'resetUrl'],
    welcome: ['userName'],
    userNotification: ['message'],
  };

  const requiredFields = templates[template];
  if (!requiredFields) {
    return { valid: false, error: 'Unknown template' };
  }

  const missingFields = requiredFields.filter(field => !data[field]);
  if (missingFields.length > 0) {
    return { 
      valid: false, 
      error: `Missing required fields: ${missingFields.join(', ')}` 
    };
  }

  return { valid: true };
};

// Email content matchers for testing
const emailContentMatchers = {
  hasVerificationLink: (email) => {
    return email.data && email.data.verificationUrl && 
           email.data.verificationUrl.includes('verify-email');
  },

  hasResetLink: (email) => {
    return email.data && email.data.resetUrl && 
           email.data.resetUrl.includes('reset-password');
  },

  hasValidSubject: (email) => {
    return email.subject && email.subject.length > 0;
  },

  hasValidRecipient: (email) => {
    return email.to && email.to.includes('@');
  },

  isFromValidSender: (email) => {
    return email.from && (
      email.from.includes('noreply@') || 
      email.from.includes('support@')
    );
  },
};

// Email queue simulation
class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  enqueue(emailData) {
    this.queue.push({
      ...emailData,
      id: Date.now() + Math.random(),
      status: 'queued',
      enqueuedAt: new Date().toISOString(),
    });
  }

  async processQueue(emailService) {
    if (this.processing) return;
    
    this.processing = true;
    const processed = [];

    while (this.queue.length > 0) {
      const emailData = this.queue.shift();
      emailData.status = 'processing';

      try {
        await emailService.sendEmail(emailData);
        emailData.status = 'sent';
        emailData.sentAt = new Date().toISOString();
      } catch (error) {
        emailData.status = 'failed';
        emailData.error = error.message;
        emailData.failedAt = new Date().toISOString();
      }

      processed.push(emailData);
    }

    this.processing = false;
    return processed;
  }

  getQueueStatus() {
    return {
      queued: this.queue.length,
      processing: this.processing,
    };
  }

  clear() {
    this.queue = [];
    this.processing = false;
  }
}

// Test helpers
const createMockEmailService = () => new MockEmailService();

const waitForEmailDelivery = async (mockService, timeout = 1000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (mockService.getSentEmails().length > 0) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  return false;
};

const assertEmailSent = (mockService, recipient, template) => {
  const emails = mockService.getEmailsSentTo(recipient);
  const templateEmails = emails.filter(e => e.template === template);
  return templateEmails.length > 0;
};

module.exports = {
  MockEmailService,
  EmailQueue,
  mockEmailResponses,
  validateEmailTemplate,
  emailContentMatchers,
  createMockEmailService,
  waitForEmailDelivery,
  assertEmailSent,
};