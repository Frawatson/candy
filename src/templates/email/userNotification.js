/**
 * User Notification Email Template
 * @param {Object} data - Template data
 * @param {string} data.name - User's name
 * @param {string} data.title - Notification title
 * @param {string} data.message - Main notification message
 * @param {string} data.actionUrl - Optional action URL
 * @param {string} data.actionText - Optional action button text
 * @param {string} data.type - Notification type (info, success, warning, error)
 * @returns {string} HTML email template
 */
function userNotificationTemplate(data) {
  const { 
    name, 
    title = 'Account Notification', 
    message, 
    actionUrl, 
    actionText = 'View Details', 
    type = 'info' 
  } = data;

  // Define colors based on notification type
  const typeStyles = {
    info: {
      headerColor: '#6366F1',
      buttonColor: '#6366F1',
      buttonHover: '#4F46E5',
      alertBg: '#EEF2FF',
      alertBorder: '#6366F1',
      alertText: '#3730A3'
    },
    success: {
      headerColor: '#10B981',
      buttonColor: '#10B981',
      buttonHover: '#059669',
      alertBg: '#F0FDF4',
      alertBorder: '#10B981',
      alertText: '#065F46'
    },
    warning: {
      headerColor: '#F59E0B',
      buttonColor: '#F59E0B',
      buttonHover: '#D97706',
      alertBg: '#FEF3C7',
      alertBorder: '#F59E0B',
      alertText: '#92400E'
    },
    error: {
      headerColor: '#EF4444',
      buttonColor: '#EF4444',
      buttonHover: '#DC2626',
      alertBg: '#FEF2F2',
      alertBorder: '#EF4444',
      alertText: '#991B1B'
    }
  };

  const styles = typeStyles[type] || typeStyles.info;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
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
            color: ${styles.headerColor};
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
            background-color: ${styles.buttonColor};
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
            background-color: ${styles.buttonHover};
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .notification-box {
            background-color: ${styles.alertBg};
            border: 1px solid ${styles.alertBorder};
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .notification-box h3 {
            color: ${styles.alertText};
            margin: 0 0 10px 0;
            font-size: 16px;
            font-weight: 600;
        }
        .notification-box p {
            color: ${styles.alertText};
            margin: 0;
            font-size: 14px;
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
            <h1>${title}</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello${name ? ` ${name}` : ''},
            </div>
            
            <div class="notification-box">
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
            
            ${actionUrl ? `
            <div class="button-container">
                <a href="${actionUrl}" class="cta-button">${actionText}</a>
            </div>
            ` : ''}
            
            <div class="message">
                If you have any questions about this notification, please don't hesitate to contact our support team.
            </div>
        </div>
        
        <div class="footer">
            <p>You received this email because you have an account with us.</p>
            <p>This is an automated email. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

module.exports = userNotificationTemplate;