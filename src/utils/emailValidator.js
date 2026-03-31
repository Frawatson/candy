const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Check basic format
  if (!emailRegex.test(email)) {
    return false;
  }
  
  // Check length constraints
  if (email.length > 254) {
    return false;
  }
  
  // Check local part length (before @)
  const localPart = email.split('@')[0];
  if (localPart.length > 64) {
    return false;
  }
  
  return true;
};

const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return '';
  }
  
  return email.trim().toLowerCase();
};

const validateEmailDomain = (email) => {
  if (!isValidEmail(email)) {
    return false;
  }
  
  const domain = email.split('@')[1];
  
  // Basic domain validation
  if (domain.length < 1 || domain.length > 253) {
    return false;
  }
  
  // Check for valid domain format
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain);
};

module.exports = {
  isValidEmail,
  sanitizeEmail,
  validateEmailDomain
};