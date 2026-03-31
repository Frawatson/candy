const nodemailer = require('nodemailer');
const { emailConfig, validateEmailConfig } = require('../config/email');
const { isValidEmail, sanitizeEmail } = require('../utils/emailValidator');
const { getTemplate, generatePlainText, getEmailSubject, EMAIL_TYPES } = require('../templates/email');
const { logger } = require('../utils/logger');
const { EmailError } = require('../utils/errorTypes');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      validateEmailConfig();
      
      this.transporter = nodemailer.createTransporter({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth: emailConfig.smtp.auth,
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      await this.transporter.verify();
      this.initialized = true;
      
      logger.info('Email service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize email service', error);
      throw new EmailError(`Email service initialization failed: ${error.message}`);
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async sendEmail({ to, subject, html, text, type = 'generic', correlationId }) {
    try {
      await this.ensureInitialized();

      // Validate email address
      const sanitizedEmail = sanitizeEmail(to);
      if (!isValidEmail(sanitizedEmail)) {
        throw new EmailError(`Invalid email address: ${to}`, { invalidEmail: to });
      }

      // Generate plain text version if not provided
      const plainText = text || generatePlainText(html);

      const mailOptions = {
        from: `${emailConfig.from.name} <${emailConfig.from.email}>`,
        to: sanitizedEmail,
        subject,
        html,
        text: plainText
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      // Log successful send
      logger.info('Email sent successfully', {
        correlationId,
        recipient: sanitizedEmail,
        type,
        messageId: result.messageId,
        subject
      });
      
      return {
        success: true,
        messageId: result.messageId,
        type,
        recipient: sanitizedEmail
      };
    } catch (error) {
      logger.error('Email send failed', {
        correlationId,
        error,
        recipient: to,
        type,
        subject
      });
      
      if (error instanceof EmailError) {
        throw error;
      }
      
      throw new EmailError(`Failed to send email: ${error.message}`, {
        originalError: error.message,
        recipient: to,
        type
      });
    }
  }

  async sendPasswordReset(email, data, correlationId) {
    try {
      const { name, resetToken, baseUrl } = data;
      
      if (!resetToken) {
        throw new EmailError('Reset token is required', { missingField: 'resetToken' });
      }
      
      if (!baseUrl) {
        throw new EmailError('Base URL is required', { missingField: 'baseUrl' });
      }

      const resetLink = `${baseUrl}/auth/reset-password?token=${resetToken}`;
      const templateData = {
        name,
        resetLink,
        tokenExpiry: '1 hour'
      };

      const html = getTemplate(EMAIL_TYPES.PASSWORD_RESET, templateData);
      const subject = getEmailSubject(EMAIL_TYPES.PASSWORD_RESET);

      return await this.sendEmail({
        to: email,
        subject,
        html,
        type: EMAIL_TYPES.PASSWORD_RESET,
        correlationId
      });
    } catch (error) {
      logger.error('Password reset email failed', {
        correlationId,
        error,
        recipient: email
      });
      
      if (error instanceof EmailError) {
        throw error;
      }
      
      throw new EmailError(`Failed to send password reset email: ${error.message}`, {
        originalError: error.message,
        recipient: email,
        type: EMAIL_TYPES.PASSWORD_RESET
      });
    }
  }

  async sendEmailVerification(email, data, correlationId) {
    try {
      const { name, verificationToken, baseUrl } = data;
      
      if (!verificationToken) {
        throw new EmailError('Verification token is required', { missingField: 'verificationToken' });
      }
      
      if (!baseUrl) {
        throw new EmailError('Base URL is required', { missingField: 'baseUrl' });
      }

      const verificationLink = `${baseUrl}/auth/verify-email?token=${verificationToken}`;
      const templateData = {
        name,
        email,
        verificationLink
      };

      const html = getTemplate(EMAIL_TYPES.EMAIL_VERIFICATION, templateData);
      const subject = getEmailSubject(EMAIL_TYPES.EMAIL_VERIFICATION);

      return await this.sendEmail({
        to: email,
        subject,
        html,
        type: EMAIL_TYPES.EMAIL_VERIFICATION,
        correlationId
      });
    } catch (error) {
      logger.error('Email verification send failed', {
        correlationId,
        error,
        recipient: email
      });
      
      if (error instanceof EmailError) {
        throw error;
      }
      
      throw new EmailError(`Failed to send email verification: ${error.message}`, {
        originalError: error.message,
        recipient: email,
        type: EMAIL_TYPES.EMAIL_VERIFICATION
      });
    }
  }

  async sendNotification(email, data, correlationId) {
    try {
      const { name, subject, content, type = 'info', actionButton, footerMessage } = data;
      
      if (!subject) {
        throw new EmailError('Notification subject is required', { missingField: 'subject' });
      }
      
      if (!content) {
        throw new EmailError('Notification content is required', { missingField: 'content' });
      }

      const templateData = {
        name,
        subject,
        content,
        type,
        actionButton,
        footerMessage
      };

      const html = getTemplate(EMAIL_TYPES.USER_NOTIFICATION, templateData);

      return await this.sendEmail({
        to: email,
        subject,
        html,
        type: EMAIL_TYPES.USER_NOTIFICATION,
        correlationId
      });
    } catch (error) {
      logger.error('Notification email failed', {
        correlationId,
        error,
        recipient: email
      });
      
      if (error instanceof EmailError) {
        throw error;
      }
      
      throw new EmailError(`Failed to send notification email: ${error.message}`, {
        originalError: error.message,
        recipient: email,
        type: EMAIL_TYPES.USER_NOTIFICATION
      });
    }
  }

  async sendBulkEmails(emails, data, type, correlationId) {
    const results = [];
    const startTime = Date.now();
    
    logger.info('Starting bulk email send', {
      correlationId,
      emailCount: emails.length,
      type
    });
    
    for (const email of emails) {
      try {
        let result;
        
        switch (type) {
          case EMAIL_TYPES.PASSWORD_RESET:
            result = await this.sendPasswordReset(email, data, correlationId);
            break;
          case EMAIL_TYPES.EMAIL_VERIFICATION:
            result = await this.sendEmailVerification(email, data, correlationId);
            break;
          case EMAIL_TYPES.USER_NOTIFICATION:
            result = await this.sendNotification(email, data, correlationId);
            break;
          default:
            result = {
              success: false,
              error: `Unknown email type: ${type}`,
              recipient: email
            };
        }
        
        results.push(result);
        
        // Small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        logger.error('Bulk email item failed', {
          correlationId,
          error,
          recipient: email,
          type
        });
        
        results.push({
          success: false,
          error: error.message,
          type,
          recipient: email
        });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const duration = Date.now() - startTime;
    
    logger.info('Bulk email completed', {
      correlationId,
      total: results.length,
      successful,
      failed,
      duration: `${duration}ms`,
      type
    });
    
    return {
      total: results.length,
      successful,
      failed,
      results,
      duration
    };
  }

  async testConnection(correlationId) {
    try {
      await this.ensureInitialized();
      await this.transporter.verify();
      
      logger.info('Email service connection test successful', { correlationId });
      
      return { success: true, message: 'Email service connection successful' };
    } catch (error) {
      logger.error('Email service connection test failed', {
        correlationId,
        error
      });
      
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;