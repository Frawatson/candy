const userNotificationTemplate = require('../../../src/templates/email/userNotification');

describe('User Notification Email Template', () => {
  const mockData = {
    name: 'Alice Johnson',
    title: 'Account Update',
    message: 'Your account has been successfully updated.',
    actionUrl: 'https://example.com/dashboard',
    actionText: 'View Dashboard',
    type: 'success'
  };

  describe('Basic functionality', () => {
    it('should generate HTML email with all provided data', () => {
      const result = userNotificationTemplate(mockData);
      
      expect(result).toContain('Hello Alice Johnson');
      expect(result).toContain('Account Update');
      expect(result).toContain('Your account has been successfully updated.');
      expect(result).toContain('View Dashboard');
      expect(result).toContain(mockData.actionUrl);
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalData = {
        name: 'Bob',
        message: 'Test message'
      };
      
      const result = userNotificationTemplate(minimalData);
      expect(result).toContain('Hello Bob');
      expect(result).toContain('Test message');
      expect(result).toContain('Account Notification'); // default title
    });

    it('should use default values when fields are missing', () => {
      const result = userNotificationTemplate({ message: 'Test' });
      
      expect(result).toContain('Hello,'); // no name
      expect(result).toContain('Account Notification'); // default title
      expect(result).not.toContain('View Details'); // no action button when no URL
    });
  });

  describe('Notification types and styling', () => {
    it('should apply success styling for success type', () => {
      const successData = { ...mockData, type: 'success' };
      const result = userNotificationTemplate(successData);
      
      expect(result).toContain('#10B981'); // success color
      expect(result).toContain('#F0FDF4'); // success background
    });

    it('should apply error styling for error type', () => {
      const errorData = { ...mockData, type: 'error' };
      const result = userNotificationTemplate(errorData);
      
      expect(result).toContain('#EF4444'); // error color
      expect(result).toContain('#FEF2F2'); // error background
    });

    it('should apply warning styling for warning type', () => {
      const warningData = { ...mockData, type: 'warning' };
      const result = userNotificationTemplate(warningData);
      
      expect(result).toContain('#F59E0B'); // warning color
      expect(result).toContain('#FEF3C7'); // warning background
    });

    it('should apply info styling for info type', () => {
      const infoData = { ...mockData, type: 'info' };
      const result = userNotificationTemplate(infoData);
      
      expect(result).toContain('#6366F1'); // info color
      expect(result).toContain('#EEF2FF'); // info background
    });

    it('should default to info styling for unknown type', () => {
      const unknownData = { ...mockData, type: 'unknown' };
      const result = userNotificationTemplate(unknownData);
      
      expect(result).toContain('#6366F1'); // defaults to info color
    });

    it('should default to info styling when type is not provided', () => {
      const noTypeData = { ...mockData };
      delete noTypeData.type;
      const result = userNotificationTemplate(noTypeData);
      
      expect(result).toContain('#6366F1'); // defaults to info color
    });
  });

  describe('Action button behavior', () => {
    it('should include action button when actionUrl is provided', () => {
      const result = userNotificationTemplate(mockData);
      
      expect(result).toContain('<div class="button-container">');
      expect(result).toContain(`<a href="${mockData.actionUrl}"`);
      expect(result).toContain(mockData.actionText);
    });

    it('should not include action button when actionUrl is missing', () => {
      const dataWithoutAction = { ...mockData };
      delete dataWithoutAction.actionUrl;
      
      const result = userNotificationTemplate(dataWithoutAction);
      expect(result).not.toContain('<div class="button-container">');
      expect(result).not.toContain('<a href=');
    });

    it('should use default action text when not provided', () => {
      const dataWithDefaultAction = { ...mockData };
      delete dataWithDefaultAction.actionText;
      
      const result = userNotificationTemplate(dataWithDefaultAction);
      expect(result).toContain('View Details');
    });
  });

  describe('Content structure', () => {
    it('should have notification box with title and message', () => {
      const result = userNotificationTemplate(mockData);
      
      expect(result).toContain('<div class="notification-box">');
      expect(result).toContain(`<h3>${mockData.title}</h3>`);
      expect(result).toContain(`<p>${mockData.message}</p>`);
    });

    it('should have proper HTML structure', () => {
      const result = userNotificationTemplate(mockData);
      
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html lang="en">');
      expect(result).toContain('<div class="container">');
      expect(result).toContain('<div class="header">');
      expect(result).toContain('<div class="content">');
      expect(result).toContain('<div class="footer">');
    });

    it('should be responsive', () => {
      const result = userNotificationTemplate(mockData);
      expect(result).toContain('@media (max-width: 600px)');
    });

    it('should include support message', () => {
      const result = userNotificationTemplate(mockData);
      expect(result).toContain('If you have any questions about this notification');
      expect(result).toContain('contact our support team');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty message', () => {
      const emptyMessageData = { ...mockData, message: '' };
      const result = userNotificationTemplate(emptyMessageData);
      
      expect(result).toContain('<p></p>');
    });

    it('should handle special characters in content', () => {
      const specialData = {
        name: 'José & María',
        title: 'Test <script>alert("xss")</script>',
        message: 'Message with "quotes" and & symbols',
        actionUrl: 'https://example.com/path?param=value&other=123'
      };
      
      const result = userNotificationTemplate(specialData);
      expect(result).toContain('José & María');
      expect(result).toContain('Test <script>alert("xss")</script>'); // Raw HTML preserved
      expect(result).toContain(specialData.actionUrl);
    });

    it('should handle null and undefined values', () => {
      const result = userNotificationTemplate({
        name: null,
        title: undefined,
        message: 'Test message'
      });
      
      expect(result).toContain('Hello,');
      expect(result).toContain('Account Notification');
      expect(result).toContain('Test message');
    });
  });
});