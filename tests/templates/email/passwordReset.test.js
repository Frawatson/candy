const passwordResetTemplate = require('../../../src/templates/email/passwordReset');

describe('Password Reset Email Template', () => {
  const mockData = {
    name: 'John Doe',
    resetLink: 'https://example.com/reset?token=abc123',
    expirationTime: '1 hour'
  };

  it('should generate HTML email with all provided data', () => {
    const result = passwordResetTemplate(mockData);
    
    expect(result).toContain('Hello John Doe');
    expect(result).toContain(mockData.resetLink);
    expect(result).toContain('1 hour');
    expect(result).toContain('Reset My Password');
    expect(result).toContain('<!DOCTYPE html>');
  });

  it('should handle missing name gracefully', () => {
    const dataWithoutName = { ...mockData };
    delete dataWithoutName.name;
    
    const result = passwordResetTemplate(dataWithoutName);
    expect(result).toContain('Hello,');
    expect(result).not.toContain('Hello ,');
  });

  it('should use default expiration time when not provided', () => {
    const dataWithoutExpiration = { ...mockData };
    delete dataWithoutExpiration.expirationTime;
    
    const result = passwordResetTemplate(dataWithoutExpiration);
    expect(result).toContain('1 hour');
  });

  it('should include security notice', () => {
    const result = passwordResetTemplate(mockData);
    expect(result).toContain('Security Notice');
    expect(result).toContain('If you didn\'t request this password reset');
  });

  it('should include fallback link section', () => {
    const result = passwordResetTemplate(mockData);
    expect(result).toContain('If the button above doesn\'t work');
    expect(result).toContain(`<code>${mockData.resetLink}</code>`);
  });

  it('should be responsive with media queries', () => {
    const result = passwordResetTemplate(mockData);
    expect(result).toContain('@media (max-width: 600px)');
  });

  it('should have proper DOCTYPE and meta tags', () => {
    const result = passwordResetTemplate(mockData);
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<meta charset="UTF-8">');
    expect(result).toContain('<meta name="viewport"');
  });

  it('should contain CTA button with correct href', () => {
    const result = passwordResetTemplate(mockData);
    expect(result).toContain(`<a href="${mockData.resetLink}" class="cta-button"`);
  });

  it('should handle special characters in data', () => {
    const specialData = {
      name: 'José & María',
      resetLink: 'https://example.com/reset?token=abc123&user=special',
      expirationTime: '30 minutes'
    };
    
    const result = passwordResetTemplate(specialData);
    expect(result).toContain('José & María');
    expect(result).toContain(specialData.resetLink);
  });

  it('should have proper email structure', () => {
    const result = passwordResetTemplate(mockData);
    expect(result).toContain('<div class="container">');
    expect(result).toContain('<div class="header">');
    expect(result).toContain('<div class="content">');
    expect(result).toContain('<div class="footer">');
  });
});