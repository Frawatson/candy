const emailVerificationTemplate = require('../../../src/templates/email/emailVerification');

describe('Email Verification Template', () => {
  const mockData = {
    name: 'Jane Smith',
    verificationLink: 'https://example.com/verify?token=xyz789'
  };

  it('should generate HTML email with all provided data', () => {
    const result = emailVerificationTemplate(mockData);
    
    expect(result).toContain('Hi Jane Smith!');
    expect(result).toContain(mockData.verificationLink);
    expect(result).toContain('Verify My Email');
    expect(result).toContain('<!DOCTYPE html>');
  });

  it('should handle missing name gracefully', () => {
    const dataWithoutName = { ...mockData };
    delete dataWithoutName.name;
    
    const result = emailVerificationTemplate(dataWithoutName);
    expect(result).toContain('Hi!');
    expect(result).not.toContain('Hi !');
  });

  it('should include welcome icon and messaging', () => {
    const result = emailVerificationTemplate(mockData);
    expect(result).toContain('👋');
    expect(result).toContain('Welcome!');
    expect(result).toContain('Thank you for signing up!');
  });

  it('should include benefits section', () => {
    const result = emailVerificationTemplate(mockData);
    expect(result).toContain('Why verify your email?');
    expect(result).toContain('Secure your account');
    expect(result).toContain('Receive important account notifications');
    expect(result).toContain('Get access to all premium features');
    expect(result).toContain('Ensure account recovery options');
  });

  it('should include fallback link section', () => {
    const result = emailVerificationTemplate(mockData);
    expect(result).toContain('If the button above doesn\'t work');
    expect(result).toContain(`<code>${mockData.verificationLink}</code>`);
  });

  it('should use green color scheme for success', () => {
    const result = emailVerificationTemplate(mockData);
    expect(result).toContain('background-color: #10B981');
    expect(result).toContain('background-color: #F0FDF4');
    expect(result).toContain('border: 1px solid #10B981');
  });

  it('should mention 24-hour expiration', () => {
    const result = emailVerificationTemplate(mockData);
    expect(result).toContain('24 hours');
    expect(result).toContain('expire in 24 hours for security reasons');
  });

  it('should have proper responsive design', () => {
    const result = emailVerificationTemplate(mockData);
    expect(result).toContain('@media (max-width: 600px)');
    expect(result).toContain('display: block;');
    expect(result).toContain('width: 100%;');
  });

  it('should contain CTA button with correct styling', () => {
    const result = emailVerificationTemplate(mockData);
    expect(result).toContain(`<a href="${mockData.verificationLink}" class="cta-button"`);
    expect(result).toContain('Verify My Email');
  });

  it('should handle special characters in data', () => {
    const specialData = {
      name: 'François & 中文',
      verificationLink: 'https://example.com/verify?token=xyz&redirect=%2Fdashboard'
    };
    
    const result = emailVerificationTemplate(specialData);
    expect(result).toContain('François & 中文');
    expect(result).toContain(specialData.verificationLink);
  });

  it('should have welcoming footer message', () => {
    const result = emailVerificationTemplate(mockData);
    expect(result).toContain('Welcome to our community!');
    expect(result).toContain('We\'re excited to have you on board');
  });

  it('should have proper HTML structure', () => {
    const result = emailVerificationTemplate(mockData);
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<html lang="en">');
    expect(result).toContain('<head>');
    expect(result).toContain('<body>');
    expect(result).toContain('</html>');
  });
});