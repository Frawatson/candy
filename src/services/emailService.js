const nodemailer = require('nodemailer');
const emailConfig = require('../config/email');
const { EMAIL_TYPES, getTemplate, getEmailSubject, generatePlainText } = require('../templates/email');
const { EmailError } = require('../utils/errorTypes');
const logger = require('../utils/logger');
const { validateEmail } = require('../utils/emailValidator');
const crypto = require('crypto');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialize email service with SMTP configuration
   */
  async initialize() {
    try {
      if (this.initialized) {
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth: {
          user: emailConfig.smtp.user,
          pass: emailConfig.smtp.pass,
        },
        connectionTimeout: emailConfig.connectionTimeout || 60000,
        greetingTimeout: emailConfig.greetingTimeout || 30000,
        socketTimeout: emailConfig.socketTimeout || 60000,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5
      });

      // Verify SMTP connection
      await this.verifyConnection();
      this.initialized = true;
      
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service', { error: error.message });
      throw new EmailError('Failed to initialize email service', 'INIT_FAILED');
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('SMTP connection verification failed', { error: error.message });
      throw new EmailError('SMTP connection failed', 'CONNECTION_FAILED');
    }
  }

  /**
   * Generate correlation ID for email tracking
   */
  generateCorrelationId() {
    return crypto.randomUUID();
  }

  /**
   * Log email attempt
   */
  async logEmailAttempt(recipient, emailType, subject, correlationId, status = 'pending', errorMessage = null) {
    try {
      const pool = require('../database/pool');
      const client = await pool.connect();
      
      try {
        await client.query(`
          INSERT INTO email_logs (recipient, email_type, subject, correlation_id, status, error_message, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [recipient, emailType, subject, correlationId, status, errorMessage]);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Failed to log email attempt', { 
        error: error.message, 
        recipient: recipient?.substring(0, 10) + '...',
        correlationId 
      });
    }
  }

  /**
   * Update email log with result
   */
  async updateEmailLog(correlationId, status, messageId = null, errorMessage = null) {
    try {
      const pool = require('../database/pool');
      const client = await pool.connect();
      
      try {
        await client.query(`
          UPDATE email_logs 
          SET status = $1, message_id = $2, error_message = $3, 
              sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE sent_at END,
              updated_at = NOW()
          WHERE correlation_id = $4
        `, [status, messageId, errorMessage, correlationId]);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Failed to update email log', { 
        error: error.message, 
        correlationId 
      });
    }
  }

  /**
   * Send email with retry mechanism
   */
  async sendEmailWithRetry(mailOptions, correlationId, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.initialized) {
          await this.initialize();
        }

        const info = await this.transporter.sendMail(mailOptions);
        
        await this.updateEmailLog(correlationId, 'sent', info.messageId);
        
        logger.info('Email sent successfully', {
          recipient: mailOptions.to?.substring(0, 10) + '...',
          subject: mailOptions.subject,
          messageId: info.messageId,
          correlationId,
          attempt
        });

        return info;
      } catch (error) {
        lastError = error;
        logger.warn(`Email send attempt ${attempt} failed`, {
          error: error.message,
          recipient: mailOptions.to?.substring(0, 10) + '...',
          correlationId,
          attempt,
          maxRetries
        });

        if (attempt === maxRetries) {
          await this.updateEmailLog(correlationId, 'failed', null, error.message);
          break;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new EmailError(`Failed to send email after ${maxRetries} attempts: ${lastError.message}`, 'SEND_FAILED');
  }

  /**
   * Send generic email
   */
  async sendEmail(to, subject, htmlContent, textContent, correlationId = null) {
    try {
      // Generate correlation ID if not provided
      const cId = correlationId || this.generateCorrelationId();

      // Validate email
      const validation = validateEmail(to);
      if (!validation.isValid) {
        throw new EmailError(`Invalid recipient email: ${validation.errors.join(', ')}`, 'INVALID_EMAIL');
      }

      // Use sanitized email
      const sanitizedTo = validation.sanitized;

      // Log attempt
      await this.logEmailAttempt(sanitizedTo, 'generic', subject, cId);

      const mailOptions = {
        from: `${emailConfig.from.name} <${emailConfig.from.email}>`,
        to: sanitizedTo,
        subject,
        html: htmlContent,
        text: textContent || generatePlainText(htmlContent),
        headers: {
          'X-Correlation-ID': cId
        }
      };

      return await this.sendEmailWithRetry(mailOptions, cId);
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(`Failed to send email: ${error.message}`, 'SEND_FAILED');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(to, data, correlationId = null) {
    try {
      const cId = correlationId || this.generateCorrelationId();
      const { resetToken, ...templateData } = data;

      // Build reset link
      const resetLink = `${emailConfig.baseUrl}/auth/reset-password?token=${resetToken}`;
      
      const emailData = {
        ...templateData,
        resetLink,
        expirationTime: '1 hour'
      };

      const template = getTemplate(EMAIL_TYPES.PASSWORD_RESET);
      const htmlContent = template(emailData);
      const subject = getEmailSubject(EMAIL_TYPES.PASSWORD_RESET);

      // Validate email
      const validation = validateEmail(to);
      if (!validation.isValid) {
        throw new EmailError(`Invalid recipient email: ${validation.errors.join(', ')}`, 'INVALID_EMAIL');
      }

      await this.logEmailAttempt(validation.sanitized, EMAIL_TYPES.PASSWORD_RESET, subject, cId);

      const mailOptions = {
        from: `${emailConfig.from.name} <${emailConfig.from.email}>`,
        to: validation.sanitized,
        subject,
        html: htmlContent,
        text: generatePlainText(htmlContent),
        headers: {
          'X-Correlation-ID': cId
        }
      };

      const result = await this.sendEmailWithRetry(mailOptions, cId);

      logger.info('Password reset email sent', {
        recipient: validation.sanitized.substring(0, 10) + '...',
        correlationId: cId
      });

      return result;
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(`Failed to send password reset email: ${error.message}`, 'SEND_FAILED');
    }
  }

  /**
   * Send email verification email
   */
  async sendEmailVerification(to, data, correlationId = null) {
    try {
      const cId = correlationId || this.generateCorrelationId();
      const { verificationToken, ...templateData } = data;

      // Build verification link
      const verificationLink = `${emailConfig.baseUrl}/auth/verify-email?token=${verificationToken}`;
      
      const emailData = {
        ...templateData,
        verificationLink
      };

      const template = getTemplate(EMAIL_TYPES.EMAIL_VERIFICATION);
      const htmlContent = template(emailData);
      const subject = getEmailSubject(EMAIL_TYPES.EMAIL_VERIFICATION);

      // Validate email
      const validation = validateEmail(to);
      if (!validation.isValid) {
        throw new EmailError(`Invalid recipient email: ${validation.errors.join(', ')}`, 'INVALID_EMAIL');
      }

      await this.logEmailAttempt(validation.sanitized, EMAIL_TYPES.EMAIL_VERIFICATION, subject, cId);

      const mailOptions = {
        from: `${emailConfig.from.name} <${emailConfig.from.email}>`,
        to: validation.sanitized,
        subject,
        html: htmlContent,
        text: generatePlainText(htmlContent),
        headers: {
          'X-Correlation-ID': cId
        }
      };

      const result = await this.sendEmailWithRetry(mailOptions, cId);

      logger.info('Email verification sent', {
        recipient: validation.sanitized.substring(0, 10) + '...',
        correlationId: cId
      });

      return result;
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(`Failed to send email verification: ${error.message}`, 'SEND_FAILED');
    }
  }

  /**
   * Send user notification email
   */
  async sendUserNotification(to, data, correlationId = null) {
    try {
      const cId = correlationId || this.generateCorrelationId();

      const template = getTemplate(EMAIL_TYPES.USER_NOTIFICATION);
      const htmlContent = template(data);
      const subject = data.title || getEmailSubject(EMAIL_TYPES.USER_NOTIFICATION);

      // Validate email
      const validation = validateEmail(to);
      if (!validation.isValid) {
        throw new EmailError(`Invalid recipient email: ${validation.errors.join(', ')}`, 'INVALID_EMAIL');
      }

      await this.logEmailAttempt(validation.sanitized, EMAIL_TYPES.USER_NOTIFICATION, subject, cId);

      const mailOptions = {
        from: `${emailConfig.from.name} <${emailConfig.from.email}>`,
        to: validation.sanitized,
        subject,
        html: htmlContent,
        text: generatePlainText(htmlContent),
        headers: {
          'X-Correlation-ID': cId
        }
      };

      const result = await this.sendEmailWithRetry(mailOptions, cId);

      logger.info('User notification sent', {
        recipient: validation.sanitized.substring(0, 10) + '...',
        type: data.type || 'info',
        correlationId: cId
      });

      return result;
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(`Failed to send user notification: ${error.message}`, 'SEND_FAILED');
    }
  }

  /**
   * Close email service connections
   */
  async close() {
    try {
      if (this.transporter) {
        this.transporter.close();
        this.transporter = null;
      }
      this.initialized = false;
      logger.info('Email service closed');
    } catch (error) {
      logger.error('Error closing email service', { error: error.message });
    }
  }
}

// Create and export singleton instance
const emailService = new EmailService();

// Initialize on first require (but don't wait for it)
emailService.initialize().catch(error => {
  logger.error('Failed to auto-initialize email service', { error: error.message });
});

module.exports = emailService;