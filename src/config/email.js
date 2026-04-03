const logger = require('../utils/logger');

// Validate required environment variables
const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL', 'FROM_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  const error = `Missing required email environment variables: ${missingVars.join(', ')}`;
  logger.error(error);
  throw new Error(error);
}

const emailConfig = {
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  from: {
    email: process.env.FROM_EMAIL,
    name: process.env.FROM_NAME,
  },
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  
  // Connection settings
  connectionTimeout: parseInt(process.env.EMAIL_CONNECTION_TIMEOUT, 10) || 60000, // 60 seconds
  greetingTimeout: parseInt(process.env.EMAIL_GREETING_TIMEOUT, 10) || 30000, // 30 seconds
  socketTimeout: parseInt(process.env.EMAIL_SOCKET_TIMEOUT, 10) || 60000, // 60 seconds
  
  // Retry settings
  maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES, 10) || 3,
  retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY, 10) || 1000, // 1 second base delay
  
  // Rate limiting
  rateLimit: parseInt(process.env.EMAIL_RATE_LIMIT, 10) || 5, // emails per second
  
  // Template settings
  templates: {
    cacheEnabled: process.env.EMAIL_TEMPLATE_CACHE !== 'false',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000'
  },

  // Feature flags
  features: {
    htmlToText: process.env.EMAIL_HTML_TO_TEXT !== 'false',
    tracking: process.env.EMAIL_TRACKING !== 'false',
    logging: process.env.EMAIL_LOGGING !== 'false'
  }
};

// Validate SMTP port
if (isNaN(emailConfig.smtp.port) || emailConfig.smtp.port < 1 || emailConfig.smtp.port > 65535) {
  throw new Error('Invalid SMTP_PORT: must be a number between 1 and 65535');
}

// Validate base URL format
try {
  new URL(emailConfig.baseUrl);
} catch (error) {
  throw new Error(`Invalid BASE_URL format: ${emailConfig.baseUrl}`);
}

// Log configuration (without sensitive data)
logger.info('Email configuration loaded', {
  host: emailConfig.smtp.host,
  port: emailConfig.smtp.port,
  secure: emailConfig.smtp.secure,
  from: emailConfig.from.email,
  baseUrl: emailConfig.baseUrl,
  connectionTimeout: emailConfig.connectionTimeout,
  maxRetries: emailConfig.maxRetries
});

module.exports = emailConfig;