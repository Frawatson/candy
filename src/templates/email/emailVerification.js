const emailVerificationTemplate = (data) => {
  const { name, verificationLink, email } = data;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Authentication System</title>
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
      border-bottom: 2px solid #28a745;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #28a745;
      margin-bottom: 10px;
    }
    .welcome {
      font-size: 28px;
      color: #28a745;
      margin-bottom: 10px;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background-color: #28a745;
      color: white !important;
      padding: 15px 40px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 20px 0;
      font-size: 16px;
    }
    .button:hover {
      background-color: #218838;
    }
    .info-box {
      background-color: #e7f3ff;
      border: 1px solid #b3d9ff;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
      color: #0c5460;
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
      <div class="welcome">Welcome!</div>
      <p>Let's verify your email address</p>
    </div>
    
    <div class="content">
      <p>Hi ${name || 'there'},</p>
      
      <p>Thank you for signing up for Authentication System! We're excited to have you on board.</p>
      
      <p>To get started and secure your account, please verify your email address (${email}) by clicking the button below:</p>
      
      <div style="text-align: center;">
        <a href="${verificationLink}" class="button">Verify Email Address</a>
      </div>
      
      <div class="info-box">
        <strong>Why verify your email?</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Secure your account with email-based password recovery</li>
          <li>Receive important account notifications</li>
          <li>Enable all features of your Authentication System account</li>
        </ul>
      </div>
      
      <p>This verification link will expire in 24 hours for security reasons.</p>
      
      <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #28a745;">${verificationLink}</p>
      
      <p>If you didn't create an account with us, you can safely ignore this email.</p>
    </div>
    
    <div class="footer">
      <p>Welcome to Authentication System!</p>
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>If you have any questions, please contact our support team.</p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = emailVerificationTemplate;