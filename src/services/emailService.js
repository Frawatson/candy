const nodemailer = require('nodemailer');
const { emailConfig, validateEmailConfig } = require('../config/email');
const { isValidEmail, sanitizeEmail } = require('../utils/emailValidator');
const { getTemplate, generatePlainText, getEmailSubject, EMAIL_TYPES } = require('../templates/email');

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
      
      console.log('Email service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize email service:', error.message);
      throw new Error(`Email service initialization failed: ${error.message}`);
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async sendEmail({ to, subject, html, text, type = 'generic' }) {
    try {
      await this.ensureInitialized();

      // Validate email address
      const sanitizedEmail = sanitizeEmail(to);
      if (!isValidEmail(sanitizedEmail)) {
        throw new Error(`Invalid email address: ${to}`);
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
      console.log(`Email sent successfully to ${sanitizedEmail} (Type: ${type})`);
      
      return {
        success: true,
        messageId: result.messageId,
        type,
        recipient: sanitizedEmail
      };
    } catch (error) {
      console.error('Email send failed:', error.message);
      
      return {
        success: false,
        error: error.message,
        type,
        recipient: to
      };
    }
  }

  async sendPasswordReset(email, data) {
    try {
      const { name, resetToken, baseUrl } = data;
      
      if (!resetToken) {
        throw new Error('Reset token is required');
      }
      
      if (!baseUrl) {
        throw new Error('Base URL is required');
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
        type: EMAIL_TYPES.PASSWORD_RESET
      });
    } catch (error) {
      console.error('Password reset email failed:', error.message);
      return {
        success: false,
        error: error.message,
        type: EMAIL_TYPES.PASSWORD_RESET,
        recipient: email
      };
    }
  }

  async sendEmailVerification(email, data) {
    try {
      const { name, verificationToken, baseUrl } = data;
      
      if (!verificationToken) {
        throw new Error('Verification token is required');
      }
      
      if (!baseUrl) {
        throw new Error('Base URL is required');
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
        type: EMAIL_TYPES.EMAIL_VERIFICATION
      });
    } catch (error) {
      console.error('Email verification send failed:', error.message);
      return {
        success: false,
        error: error.message,
        type: EMAIL_TYPES.EMAIL_VERIFICATION,
        recipient: email
      };
    }
  }

  async sendNotification(email, data) {
    try {
      const { name, subject, content, type = 'info', actionButton, footerMessage } = data;
      
      if (!subject) {
        throw new Error('Notification subject is required');
      }
      
      if (!content) {
        throw new Error('Notification content is required');
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
        type: EMAIL_TYPES.USER_NOTIFICATION
      });
    } catch (error) {
      console.error('Notification email failed:', error.message);
      return {
        success: false,
        error: error.message,
        type: EMAIL_TYPES.USER_NOTIFICATION,
        recipient: email
      };
    }
  }

  async sendBulkEmails(emails, data, type) {
    const results = [];
    
    for (const email of emails) {
      try {
        let result;
        
        switch (type) {
          case EMAIL_TYPES.PASSWORD_RESET:
            result = await this.sendPasswordReset(email, data);
            break;
          case EMAIL_TYPES.EMAIL_VERIFICATION:
            result = await this.sendEmailVerification(email, data);
            break;
          case EMAIL_TYPES.USER_NOTIFICATION:
            result = await this.sendNotification(email, data);
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
    
    console.log(`Bulk email completed: ${successful} successful, ${failed} failed`);
    
    return {
      total: results.length,
      successful,
      failed,
      results
    };
  }

  async testConnection() {
    try {
      await this.ensureInitialized();
      await this.transporter.verify();
      return { success: true, message: 'Email service connection successful' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;