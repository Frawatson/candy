/**
 * Password Reset Email Template
 * @param {Object} data - Template data
 * @param {string} data.name - User's name
 * @param {string} data.resetLink - Password reset link
 * @param {string} data.expirationTime - Token expiration time
 * @returns {string} HTML email template
 */
function passwordResetTemplate(data) {
  const { name, resetLink, expirationTime = '1 hour' } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #0F172A;
            margin: 0;
            padding: 0;
            background-color: #F8FAFC;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #FFFFFF;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            margin-top: 40px;
            margin-bottom: 40px;
        }
        .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #E2E8F0;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #6366F1;
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 0 20px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
        }
        .message {
            font-size: 16px;
            margin-bottom: 30px;
            color: #64748B;
        }
        .cta-button {
            display: inline-block;
            background-color: #6366F1;
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
        }
        .cta-button:hover {
            background-color: #4F46E5;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .security-notice {
            background-color: #FEF3C7;
            border: 1px solid #F59E0B;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
        }
        .security-notice h3 {
            color: #92400E;
            margin: 0 0 8px 0;
            font-size: 14px;
            font-weight: 600;
        }
        .security-notice p {
            color: #92400E;
            margin: 0;
            font-size: 14px;
        }
        .fallback-link {
            background-color: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            font-size: 14px;
        }
        .fallback-link p {
            margin: 0 0 8px 0;
            color: #64748B;
        }
        .fallback-link code {
            background-color: #E2E8F0;
            padding: 2px 4px;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            word-break: break-all;
        }
        .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #E2E8F0;
            margin-top: 30px;
            color: #64748B;
            font-size: 14px;
        }
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                padding: 15px;
            }
            .content {
                padding: 0 10px;
            }
            .cta-button {
                display: block;
                width: 100%;
                box-sizing: border-box;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Reset Your Password</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello${name ? ` ${name}` : ''},
            </div>
            
            <div class="message">
                We received a request to reset your password. Click the button below to create a new password for your account.
            </div>
            
            <div class="button-container">
                <a href="${resetLink}" class="cta-button">Reset My Password</a>
            </div>
            
            <div class="security-notice">
                <h3>Security Notice</h3>
                <p>This link will expire in ${expirationTime}. If you didn't request this password reset, you can safely ignore this email.</p>
            </div>
            
            <div class="fallback-link">
                <p>If the button above doesn't work, copy and paste this link into your browser:</p>
                <code>${resetLink}</code>
            </div>
            
            <div class="message">
                For security reasons, this link can only be used once. If you need to reset your password again, please request a new reset link.
            </div>
        </div>
        
        <div class="footer">
            <p>If you have any questions, please contact our support team.</p>
            <p>This is an automated email. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

module.exports = passwordResetTemplate;