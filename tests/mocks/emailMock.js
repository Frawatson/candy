const { EventEmitter } = require('events');
const { MockEmailService } = require('../helpers/emailHelpers');

// Global email service mock instance
let mockEmailService = new MockEmailService();

// Mock nodemailer if it exists in the project
const mockNodemailer = {
  createTransporter: jest.fn(() => ({
    sendMail: jest.fn(async (mailOptions) => {
      return await mockEmailService.sendEmail({
        to: mailOptions.to,
        from: mailOptions.from,
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text,
        template: mailOptions.template,
        data: mailOptions.templateData,
      });
    }),
    verify: jest.fn(async () => true),
    close: jest.fn(),
  })),
  
  createTestAccount: jest.fn(async () => ({
    user: 'test.user@ethereal.email',
    pass: 'test-password',
    smtp: { host: 'smtp.ethereal.email', port: 587, secure: false },
    imap: { host: 'imap.ethereal.email', port: 993, secure: true },
    pop3: { host: 'pop3.ethereal.email', port: 995, secure: true },
    web: 'https://ethereal.email',
  })),
};

// Mock email service implementation
class EmailServiceMock extends EventEmitter {
  constructor() {
    super();
    this.transporter = null;
    this.isConnected = false;
    this.sentEmails = [];
    this.failureRate = 0;
    this.delay = 0;
  }

  async initialize() {
    this.transporter = mockNodemailer.createTransporter();
    this.isConnected = true;
    this.emit('connected');
    return true;
  }

  async sendEmail(emailData) {
    if (!this.isConnected) {
      throw new Error('Email service not initialized');
    }

    // Simulate random failures
    if (Math.random() < this.failureRate) {
      const error = new Error('Email sending failed');
      error.code = 'SMTP_ERROR';
      throw error;
    }

    // Simulate delay
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    const result = await mockEmailService.sendEmail(emailData);
    this.sentEmails.push({ ...emailData, result });
    
    this.emit('emailSent', { emailData, result });
    return result;
  }

  async sendVerificationEmail(userEmail, verificationToken, userName) {
    return await this.sendEmail({
      to: userEmail,
      from: process.env.SMTP_USER || 'noreply@example.com',
      subject: 'Verify Your Email Address',
      template: 'emailVerification',
      data: {
        userName,
        verificationToken,
        verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`,
      },
    });
  }

  async sendPasswordResetEmail(userEmail, resetToken, userName) {
    return await this.sendEmail({
      to: userEmail,
      from: process.env.SMTP_USER || 'noreply@example.com',
      subject: 'Reset Your Password',
      template: 'passwordReset',
      data: {
        userName,
        resetToken,
        resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`,
        expiresIn: '1 hour',
      },
    });
  }

  async sendWelcomeEmail(userEmail, userName) {
    return await this.sendEmail({
      to: userEmail,
      from: process.env.SMTP_USER || 'noreply@example.com',
      subject: 'Welcome to Our Platform',
      template: 'welcome',
      data: {
        userName,
        platformName: 'Our Platform',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
      },
    });
  }

  async verifyConnection() {
    if (!this.transporter) {
      return false;
    }
    
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  async close() {
    if (this.transporter && this.transporter.close) {
      await this.transporter.close();
    }
    this.isConnected = false;
    this.emit('disconnected');
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

  setFailureRate(rate) {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  setDelay(delay) {
    this.delay = Math.max(0, delay);
  }

  simulateConnectionError() {
    this.isConnected = false;
    this.emit('error', new Error('Connection lost'));
  }

  reset() {
    this.sentEmails = [];
    this.failureRate = 0;
    this.delay = 0;
    this.isConnected = true;
    mockEmailService.reset();
  }
}

// Mock email queue for batch processing
class EmailQueueMock {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.batchSize = 10;
    this.processingDelay = 100;
  }

  enqueue(emailData) {
    const queueItem = {
      id: Date.now() + Math.random(),
      ...emailData,
      status: 'queued',
      enqueuedAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3,
    };

    this.queue.push(queueItem);
    return queueItem.id;
  }

  async processQueue(emailService) {
    if (this.processing) {
      return { message: 'Already processing' };
    }

    this.processing = true;
    const processed = [];
    let batchCount = 0;

    while (this.queue.length > 0 && batchCount < this.batchSize) {
      const item = this.queue.shift();
      item.status = 'processing';
      item.attempts++;

      try {
        await new Promise(resolve => setTimeout(resolve, this.processingDelay));
        const result = await emailService.sendEmail(item);
        
        item.status = 'sent';
        item.result = result;
        item.sentAt = new Date().toISOString();
        
        processed.push(item);
      } catch (error) {
        item.status = 'failed';
        item.error = error.message;
        item.failedAt = new Date().toISOString();

        // Retry logic
        if (item.attempts < item.maxAttempts) {
          item.status = 'retry';
          this.queue.push(item); // Re-queue for retry
        } else {
          item.status = 'permanent_failure';
          processed.push(item);
        }
      }

      batchCount++;
    }

    this.processing = false;
    
    return {
      processed: processed.length,
      remaining: this.queue.length,
      items: processed,
    };
  }

  getQueueStatus() {
    const statusCounts = this.queue.reduce((counts, item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
      return counts;
    }, {});

    return {
      total: this.queue.length,
      processing: this.processing,
      statusCounts,
    };
  }

  clear() {
    this.queue = [];
    this.processing = false;
  }

  setPriority(emailId, priority) {
    const index = this.queue.findIndex(item => item.id === emailId);
    if (index === -1) return false;

    const item = this.queue.splice(index, 1)[0];
    item.priority = priority;

    // Insert based on priority (higher priority first)
    const insertIndex = this.queue.findIndex(queueItem => 
      (queueItem.priority || 0) < priority
    );

    if (insertIndex === -1) {
      this.queue.push(item);
    } else {
      this.queue.splice(insertIndex, 0, item);
    }

    return true;
  }
}

// Create singleton instances for tests
const emailServiceMock = new EmailServiceMock();
const emailQueueMock = new EmailQueueMock();

// Reset function for tests
const resetEmailMocks = () => {
  mockEmailService.reset();
  emailServiceMock.reset();
  emailQueueMock.clear();
};

// Mock factory functions
const createMockEmailService = () => new EmailServiceMock();
const createMockEmailQueue = () => new EmailQueueMock();

module.exports = {
  EmailServiceMock,
  EmailQueueMock,
  mockNodemailer,
  emailServiceMock,
  emailQueueMock,
  resetEmailMocks,
  createMockEmailService,
  createMockEmailQueue,
  mockEmailService, // Direct access to mock service
};