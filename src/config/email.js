const emailConfig = {
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  from: {
    email: process.env.FROM_EMAIL || 'noreply@authentication-system.com',
    name: process.env.FROM_NAME || 'Authentication System'
  }
};

const validateEmailConfig = () => {
  const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required email configuration: ${missing.join(', ')}`);
  }
  
  return true;
};

module.exports = {
  emailConfig,
  validateEmailConfig
};