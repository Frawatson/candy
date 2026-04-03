/**
 * Email Verification Template
 * @param {Object} data - Template data
 * @param {string} data.name - User's name
 * @param {string} data.verificationLink - Email verification link
 * @returns {string} HTML email template
 */
function emailVerificationTemplate(data) {
  const { name, verificationLink } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email Address</title>
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
        .welcome-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .content {
            padding: 0 20px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .message {
            font-size: 16px;
            margin-bottom: 30px;
            color: #64748B;
        }
        .cta-button {
            display: inline-block;
            background-color: #10B981;
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
            background-color: #059669;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .benefits {
            background-color: #F0FDF4;
            border: 1px solid #10B981;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .benefits h3 {
            color: #065F46;
            margin: 0 0 15px 0;
            font-size: 16px;
            font-weight: 600;
        }
        .benefits ul {
            color: #065F46;
            margin: 0;
            padding-left: 20px;
        }
        .benefits li {
            margin-bottom: 8px;
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
            <div class="welcome-icon">👋</div>
            <h1>Welcome!</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hi${name ? ` ${name}` : ''}!
            </div>
            
            <div class="message">
                Thank you for signing up! To get started, please verify your email address by clicking the button below.
            </div>
            
            <div class="button-container">
                <a href="${verificationLink}" class="cta-button">Verify My Email</a>
            </div>
            
            <div class="benefits">
                <h3>Why verify your email?</h3>
                <ul>
                    <li>Secure your account with two-factor authentication</li>
                    <li>Receive important account notifications</li>
                    <li>Get access to all premium features</li>
                    <li>Ensure account recovery options</li>
                </ul>
            </div>
            
            <div class="fallback-link">
                <p>If the button above doesn't work, copy and paste this link into your browser:</p>
                <code>${verificationLink}</code>
            </div>
            
            <div class="message">
                This verification link will expire in 24 hours for security reasons. If you didn't create an account, you can safely ignore this email.
            </div>
        </div>
        
        <div class="footer">
            <p>Welcome to our community! We're excited to have you on board.</p>
            <p>If you have any questions, feel free to contact our support team.</p>
            <p>This is an automated email. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

module.exports = emailVerificationTemplate;