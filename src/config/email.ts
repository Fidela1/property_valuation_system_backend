import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Export sendEmail function
export const sendEmail = async (options: SendEmailOptions) => {
  try {
    const info = await transporter.sendMail({
      from: `"Property Valuation System" <${process.env.SMTP_FROM_EMAIL || 'noreply@propertyval.com'}>`,
      to: options.to,
      subject: options.subject,
      text: options.text || '',
      html: options.html,
    });
    
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Email template for invitation
export const getInvitationEmailTemplate = (name: string, role: string, invitationLink: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invitation to Property Valuation System</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #1B3A5C 0%, #2C5F8A 100%);
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 8px 8px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .role-badge {
      display: inline-block;
      background: #1B3A5C;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: bold;
      margin: 10px 0;
    }
    .button {
      display: inline-block;
      background: #1B3A5C;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer {
      margin-top: 20px;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Property Valuation System</h2>
  </div>
  <div class="content">
    <h3>Hello ${name},</h3>
    <p>You have been invited to join the <strong>Property Valuation System</strong> as a:</p>
    <div style="text-align: center;">
      <span class="role-badge">${role}</span>
    </div>
    <p>Click the button below to set up your account:</p>
    <div style="text-align: center;">
      <a href="${invitationLink}" class="button">Accept Invitation</a>
    </div>
    <p><strong>Note:</strong> This link will expire in 7 days.</p>
    <p>If you did not expect this invitation, please ignore this email.</p>
    <p>Best regards,<br>Property Valuation System Team</p>
  </div>
  <div class="footer">
    <p>This is an automated message, please do not reply to this email.</p>
    <p>&copy; ${new Date().getFullYear()} Property Valuation System. All rights reserved.</p>
  </div>
</body>
</html>
`;

// Email template for role update
export const getRoleUpdateEmailTemplate = (name: string, oldRole: string, newRole: string) => {
  const roleDisplay: Record<string, string> = {
    'CLIENT': 'Property Owner',
    'DATA_COLLECTOR': 'Data Collector',
    'SUPERVISOR': 'Supervisor',
    'ADMIN': 'Administrator'
  };
  
  const oldRoleDisplay = roleDisplay[oldRole] || oldRole;
  const newRoleDisplay = roleDisplay[newRole] || newRole;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Your Role Has Been Updated</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #1B3A5C 0%, #2C5F8A 100%);
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 8px 8px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .role-change {
      background: #e5e7eb;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    .old-role {
      text-decoration: line-through;
      color: #ef4444;
    }
    .new-role {
      color: #10b981;
      font-weight: bold;
      font-size: 18px;
    }
    .button {
      display: inline-block;
      background: #1B3A5C;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer {
      margin-top: 20px;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Property Valuation System</h2>
  </div>
  <div class="content">
    <h3>Hello ${name},</h3>
    <p>Your account role has been updated by an administrator.</p>
    
    <div class="role-change">
      <p><strong>Previous Role:</strong> <span class="old-role">${oldRoleDisplay}</span></p>
      <p><strong>New Role:</strong> <span class="new-role">${newRoleDisplay}</span></p>
    </div>
    
    <p>Your access and permissions have been updated accordingly.</p>
    
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Your Account</a>
    </div>
    
    <p>If you have any questions, please contact your administrator.</p>
    <p>Best regards,<br>Property Valuation System Team</p>
  </div>
  <div class="footer">
    <p>This is an automated message, please do not reply to this email.</p>
    <p>&copy; ${new Date().getFullYear()} Property Valuation System. All rights reserved.</p>
  </div>
</body>
</html>
`;
};

// Email template for account status change (activate/deactivate)
export const getAccountStatusEmailTemplate = (name: string, status: 'activated' | 'deactivated') => {
  const isActivated = status === 'activated';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Account ${isActivated ? 'Activated' : 'Deactivated'}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #1B3A5C 0%, #2C5F8A 100%);
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 8px 8px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .status-box {
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    .status-activated {
      background: #d1fae5;
      color: #065f46;
    }
    .status-deactivated {
      background: #fee2e2;
      color: #991b1b;
    }
    .button {
      display: inline-block;
      background: #1B3A5C;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer {
      margin-top: 20px;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Property Valuation System</h2>
  </div>
  <div class="content">
    <h3>Hello ${name},</h3>
    <p>Your account has been <strong>${status}</strong> by an administrator.</p>
    
    <div class="status-box ${isActivated ? 'status-activated' : 'status-deactivated'}">
      ${isActivated ? 
        '<p>✓ Your account is now active. You can log in and use the platform.</p>' : 
        '<p>⚠️ Your account has been deactivated. Please contact your administrator for more information.</p>'
      }
    </div>
    
    ${isActivated ? `
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Your Account</a>
      </div>
    ` : ''}
    
    <p>Best regards,<br>Property Valuation System Team</p>
  </div>
  <div class="footer">
    <p>This is an automated message, please do not reply to this email.</p>
    <p>&copy; ${new Date().getFullYear()} Property Valuation System. All rights reserved.</p>
  </div>
</body>
</html>
`;
};

// Email template for account deletion
export const getAccountDeletedEmailTemplate = (name: string) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Account Deleted</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #1B3A5C 0%, #2C5F8A 100%);
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 8px 8px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .warning-box {
      background: #fee2e2;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
      color: #991b1b;
    }
    .footer {
      margin-top: 20px;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Property Valuation System</h2>
  </div>
  <div class="content">
    <h3>Hello ${name},</h3>
    <p>Your account has been permanently deleted from the Property Valuation System by an administrator.</p>
    
    <div class="warning-box">
      <p>⚠️ You no longer have access to the platform.</p>
      <p>If you believe this was done in error, please contact support.</p>
    </div>
    
    <p>Thank you for being part of Property Valuation System.</p>
    <p>Best regards,<br>Property Valuation System Team</p>
  </div>
  <div class="footer">
    <p>This is an automated message, please do not reply to this email.</p>
    <p>&copy; ${new Date().getFullYear()} Property Valuation System. All rights reserved.</p>
  </div>
</body>
</html>
`;
};