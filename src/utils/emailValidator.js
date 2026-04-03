const logger = require('./logger');

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  'guerrillamail.info',
  'guerrillamail.biz',
  'guerrillamail.com',
  'guerrillamail.de',
  'guerrillamail.net',
  'guerrillamail.org',
  'mailinator.com',
  'tempmail.org',
  'temp-mail.org',
  'throwaway.email',
  'getnada.com',
  'fakeinbox.com',
  'maildrop.cc',
  'yopmail.com',
  'mohmal.com',
  'mailnesia.com',
  'trashmail.com',
  'dispostable.com',
  '33mail.com',
  'spamgourmet.com',
  'incognitomail.org',
  'anonymbox.com'
]);

// RFC 5322 compliant email regex (simplified but robust)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
  try {
    if (!email || typeof email !== 'string') {
      return false;
    }

    // Basic length check
    if (email.length > 320) { // RFC 5321 limit
      return false;
    }

    // Test against regex
    if (!EMAIL_REGEX.test(email)) {
      return false;
    }

    // Split email into local and domain parts
    const [localPart, domain] = email.split('@');
    
    // Local part validation
    if (!localPart || localPart.length > 64) { // RFC 5321 limit
      return false;
    }

    // Domain validation
    if (!domain || domain.length > 253) { // RFC 1035 limit
      return false;
    }

    // Check for consecutive dots
    if (email.includes('..')) {
      return false;
    }

    // Check for leading/trailing dots in local part
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return false;
    }

    return true;
  } catch (error) {
    logger.warn('Email validation error', { 
      error: error.message,
      email: email ? email.substring(0, 10) + '...' : 'undefined'
    });
    return false;
  }
}

/**
 * Sanitize email address
 * @param {string} email - Email address to sanitize
 * @returns {string} Sanitized email address
 */
function sanitizeEmail(email) {
  try {
    if (!email || typeof email !== 'string') {
      return '';
    }

    // Trim whitespace and convert to lowercase
    let sanitized = email.trim().toLowerCase();
    
    // Remove any null bytes or control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Normalize unicode characters
    sanitized = sanitized.normalize('NFKC');

    return sanitized;
  } catch (error) {
    logger.warn('Email sanitization error', { 
      error: error.message,
      email: email ? email.substring(0, 10) + '...' : 'undefined'
    });
    return '';
  }
}

/**
 * Check if email domain is from a disposable email service
 * @param {string} email - Email address to check
 * @returns {boolean} True if from disposable email service
 */
function isDisposableEmail(email) {
  try {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const sanitized = sanitizeEmail(email);
    if (!sanitized) {
      return false;
    }

    const domain = sanitized.split('@')[1];
    if (!domain) {
      return false;
    }

    return DISPOSABLE_DOMAINS.has(domain);
  } catch (error) {
    logger.warn('Disposable email check error', { 
      error: error.message,
      email: email ? email.substring(0, 10) + '...' : 'undefined'
    });
    return false;
  }
}

/**
 * Validate domain format
 * @param {string} domain - Domain to validate
 * @returns {boolean} True if valid domain
 */
function isValidDomain(domain) {
  try {
    if (!domain || typeof domain !== 'string') {
      return false;
    }

    // Domain length check
    if (domain.length > 253) {
      return false;
    }

    // Split into labels
    const labels = domain.split('.');
    
    if (labels.length < 2) {
      return false;
    }

    // Check each label
    for (const label of labels) {
      if (!label || label.length > 63) {
        return false;
      }

      // Check label format (letters, numbers, hyphens, but not starting/ending with hyphen)
      if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label)) {
        return false;
      }
    }

    // TLD should be at least 2 characters and not all numeric
    const tld = labels[labels.length - 1];
    if (tld.length < 2 || /^\d+$/.test(tld)) {
      return false;
    }

    return true;
  } catch (error) {
    logger.warn('Domain validation error', { 
      error: error.message,
      domain: domain ? domain.substring(0, 20) + '...' : 'undefined'
    });
    return false;
  }
}

/**
 * Comprehensive email validation
 * @param {string} email - Email address to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.allowDisposable - Allow disposable email addresses
 * @returns {Object} Validation result
 */
function validateEmail(email, options = {}) {
  const { allowDisposable = false } = options;
  
  const result = {
    isValid: false,
    errors: [],
    sanitized: ''
  };

  try {
    // Sanitize first
    const sanitized = sanitizeEmail(email);
    result.sanitized = sanitized;

    if (!sanitized) {
      result.errors.push('Email address is required');
      return result;
    }

    // Format validation
    if (!isValidEmail(sanitized)) {
      result.errors.push('Invalid email format');
      return result;
    }

    // Domain validation
    const domain = sanitized.split('@')[1];
    if (!isValidDomain(domain)) {
      result.errors.push('Invalid email domain');
      return result;
    }

    // Disposable email check
    if (!allowDisposable && isDisposableEmail(sanitized)) {
      result.errors.push('Disposable email addresses are not allowed');
      return result;
    }

    result.isValid = true;
    return result;

  } catch (error) {
    logger.error('Email validation error', { 
      error: error.message,
      email: email ? email.substring(0, 10) + '...' : 'undefined'
    });
    
    result.errors.push('Email validation failed');
    return result;
  }
}

module.exports = {
  isValidEmail,
  sanitizeEmail,
  isDisposableEmail,
  isValidDomain,
  validateEmail,
  DISPOSABLE_DOMAINS: Array.from(DISPOSABLE_DOMAINS)
};