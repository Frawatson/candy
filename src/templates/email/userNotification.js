const userNotificationTemplate = (data) => {
  const { 
    name, 
    subject, 
    content, 
    type = 'info',
    actionButton = null,
    footerMessage = null
  } = data;
  
  const getTypeStyles = (notificationType) => {
    const styles = {
      info: { color: '#007bff', bgColor: '#e7f3ff', borderColor: '#b3d9ff' },
      success: { color: '#28a745', bgColor: '#d4edda', borderColor: '#c3e6cb' },
      warning: { color: '#ffc107', bgColor: '#fff3cd', borderColor: '#ffeaa7' },
      error: { color: '#dc3545', bgColor: '#f8d7da', borderColor: '#f5c6cb' }
    };
    return styles[notificationType] || styles.info;
  };
  
  const typeStyles = getTypeStyles(type);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject} - Authentication System</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid ${typeStyles.color};
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: ${typeStyles.color};
      margin-bottom: 10px;
    }
    .subject {
      font-size: 24px;
      color: #333;
      margin-bottom: 10px;
    }
    .content {
      margin-bottom: 30px;
    }
    .notification-content {
      background-color: ${typeStyles.bgColor};
      border: 1px solid ${typeStyles.borderColor};
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      background-color: ${typeStyles.color};
      color: white !important;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 20px 0;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      color: #666;
      font-size: 14px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Authentication System</div>
      <div class="subject">${subject}</div>
    </div>
    
    <div class="content">
      <p>Hi ${name || 'there'},</p>
      
      <div class="notification-content">
        ${content}
      </div>
      
      ${actionButton ? `
        <div style="text-align: center;">
          <a href="${actionButton.url}" class="button">${actionButton.text}</a>
        </div>
      ` : ''}
      
      ${footerMessage ? `<p>${footerMessage}</p>` : ''}
    </div>
    
    <div class="footer">
      <p>This is an automated message from Authentication System. Please do not reply to this email.</p>
      <p>If you have any questions, please contact our support team.</p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = userNotificationTemplate;