const passwordResetTemplate = (data) => {
  const { name, resetLink, tokenExpiry } = data;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset - Authentication System</title>
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
      border-bottom: 2px solid #007bff;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #007bff;
      margin-bottom: 10px;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background-color: #007bff;
      color: white !important;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #0056b3;
    }
    .warning {
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
      color: #856404;
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
      <h1>Password Reset Request</h1>
    </div>
    
    <div class="content">
      <p>Hi ${name || 'there'},</p>
      
      <p>We received a request to reset your password for your Authentication System account. If you made this request, click the button below to reset your password:</p>
      
      <div style="text-align: center;">
        <a href="${resetLink}" class="button">Reset My Password</a>
      </div>
      
      <p>This password reset link will expire in ${tokenExpiry || '1 hour'} for security reasons.</p>
      
      <div class="warning">
        <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged, and no further action is required.
      </div>
      
      <p>For security reasons, this link can only be used once. If you need another password reset link, you can request a new one on our website.</p>
      
      <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #007bff;">${resetLink}</p>
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

module.exports = passwordResetTemplate;