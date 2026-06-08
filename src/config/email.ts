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
export const sendPasswordResetEmail = async (email: string, resetToken: string, name: string) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: `"PropertyVal" <${process.env.SMTP_FROM || 'noreply@propertyval.com'}>`,
    to: email,
    subject: 'Password Reset Request - PropertyVal',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Password Reset</title>
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
          .warning {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin: 20px 0;
            font-size: 14px;
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
          <h2>PropertyVal</h2>
          <p>Property Valuation System</p>
        </div>
        <div class="content">
          <h3>Hello ${name},</h3>
          <p>We received a request to reset your password for your PropertyVal account.</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ This link will expire in 1 hour.</strong>
            <p style="margin: 8px 0 0 0; font-size: 12px;">If you didn't request this, please ignore this email and your password will remain unchanged.</p>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="background: #e5e7eb; padding: 10px; border-radius: 4px; font-size: 12px; word-break: break-all;">
            ${resetUrl}
          </p>
          
          <p>Best regards,<br>PropertyVal Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message, please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} PropertyVal. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  };
  
  await transporter.sendMail(mailOptions);
};

export async function sendStatusChangeEmail(
  userEmail: string,
  userName: string,
  isActive: boolean,
  adminName: string
) {
  const status = isActive ? 'activated' : 'deactivated';
  const subject = `Account ${status.charAt(0).toUpperCase() + status.slice(1)} - PropertyVal`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1B3A5C 0%, #2C5F8A 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">PropertyVal</h1>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Hello ${userName},</h2>
        
        <p style="color: #555; line-height: 1.6;">
          Your PropertyVal account has been <strong style="color: ${isActive ? '#10B981' : '#EF4444'}">${status}</strong> by administrator <strong>${adminName}</strong>.
        </p>
        
        ${isActive ? `
          <div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #166534;">
              ✓ You can now log in to your account and access all features.
            </p>
          </div>
        ` : `
          <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #991B1B;">
              ⚠️ You cannot access your account until an administrator reactivates it.
            </p>
            <p style="margin: 10px 0 0 0; color: #991B1B;">
              Please contact support if you believe this is a mistake.
            </p>
          </div>
        `}
        
        <div style="background: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0 0 5px 0; color: #374151;"><strong>Account Details:</strong></p>
          <p style="margin: 0; color: #6B7280;">Email: ${userEmail}</p>
          <p style="margin: 5px 0 0 0; color: #6B7280;">Status: ${isActive ? 'Active' : 'Inactive'}</p>
        </div>
        
        <p style="color: #555; margin-top: 20px;">
          If you have any questions, please contact our support team.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        
        <p style="color: #999; font-size: 12px; margin: 0;">
          This is an automated message from PropertyVal. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;
  
  const text = `
    PropertyVal Account ${status}
    
    Hello ${userName},
    
    Your PropertyVal account has been ${status} by administrator ${adminName}.
    
    ${isActive ? 
      'You can now log in to your account and access all features.' : 
      'You cannot access your account until an administrator reactivates it. Please contact support if you believe this is a mistake.'
    }
    
    Account Details:
    Email: ${userEmail}
    Status: ${isActive ? 'Active' : 'Inactive'}
    
    If you have any questions, please contact our support team.
    
    This is an automated message from PropertyVal. Please do not reply to this email.
  `;
  
  await transporter.sendMail({
    from: `"PropertyVal" <${process.env.SMTP_FROM_EMAIL}>`,
    to: userEmail,
    subject: subject,
    text: text,
    html: html,
  });
}

export const getAccountPermanentlyDeletedEmailTemplate = (userName: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Permanently Deleted</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .warning { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Account Permanently Deleted</h1>
        </div>
        <div class="content">
          <h2>Hello ${userName},</h2>
          <p>We are writing to inform you that your Property Valuation System account has been <strong>permanently deleted</strong> by an administrator.</p>
          
          <div class="warning">
            <p><strong>⚠️ Important:</strong> This action is irreversible. All your associated data has been permanently removed from our system.</p>
          </div>
          
          <p>If you believe this was done in error or have any questions, please contact our support team.</p>
          
          <p>Thank you for your time with Property Valuation System.</p>
          
          <p>Best regards,<br>
          <strong>Property Valuation System Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Property Valuation System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getAccessRequestEmailTemplate = (
  clientName: string,
  bankName: string,
  upiNumber: string,
  accessType: string,
  message?: string
): string => {
  const accessTypeDisplay = {
    'VIEW_ONLY': 'View Only - They can see the final valuation',
    'TRACK_PROGRESS': 'Track Progress - They can follow the valuation process in real-time',
    'FULL_ACCESS': 'Full Access - They can view all property details and valuation'
  }[accessType] || accessType;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #1B3A5C; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0;">Property Valuation System</h2>
      </div>
      <div style="border: 1px solid #e0e0e0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <h3 style="color: #1B3A5C;">Access Request for Your Property</h3>
        <p>Dear ${clientName},</p>
        <p><strong>${bankName}</strong> has requested access to view your property valuation for:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 0;"><strong>Property UPI:</strong> ${upiNumber}</p>
          <p style="margin: 10px 0 0;"><strong>Requested Access Level:</strong> ${accessTypeDisplay}</p>
          ${message ? `<p style="margin: 10px 0 0;"><strong>Message from ${bankName}:</strong> ${message}</p>` : ''}
        </div>
        <p>By granting access, the institution will be able to:</p>
        <ul>
          <li>Track the progress of your property valuation</li>
          <li>View the final valuation report when completed</li>
          <li>Download the valuation report for their records</li>
        </ul>
        <div style="margin: 25px 0; text-align: center;">
          <a href="${process.env.FRONTEND_URL}/client/access-requests" style="background-color: #1B3A5C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 0 10px;">View Requests</a>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">You can manage access requests from your property dashboard. If you did not expect this request, please ignore this email.</p>
      </div>
    </div>
  `;
};

// Email template for access approved notification to bank
export const getAccessApprovedEmailTemplate = (
  bankName: string,
  upiNumber: string,
  ownerName: string
): string => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #1B3A5C; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0;">Property Valuation System</h2>
      </div>
      <div style="border: 1px solid #e0e0e0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <h3 style="color: #1B3A5C;">Access Granted to Property</h3>
        <p>Dear ${bankName},</p>
        <p>Great news! The property owner has <strong style="color: green;">approved your access request</strong> for:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 0;"><strong>Property UPI:</strong> ${upiNumber}</p>
          <p style="margin: 10px 0 0;"><strong>Owner:</strong> ${ownerName}</p>
        </div>
        <p>You can now:</p>
        <ul>
          <li>Track the valuation progress in real-time</li>
          <li>View the final valuation report when available</li>
          <li>Download the report for your records</li>
        </ul>
        <div style="margin: 25px 0; text-align: center;">
          <a href="${process.env.FRONTEND_URL}/bank/properties" style="background-color: #1B3A5C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Property</a>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">You can now track this property's valuation from your bank dashboard.</p>
      </div>
    </div>
  `;
};

// Email sending functions
export const sendAccessRequestEmail = async (
  to: string,
  clientName: string,
  bankName: string,
  upiNumber: string,
  accessType: string,
  message?: string
): Promise<void> => {
  const html = getAccessRequestEmailTemplate(clientName, bankName, upiNumber, accessType, message);
  await sendEmail({
    to,
    subject: `Access Request for Property ${upiNumber} - Property Valuation System`,
    html
  });
};

export const sendAccessApprovedEmail = async (
  to: string,
  bankName: string,
  upiNumber: string,
  ownerName: string
): Promise<void> => {
  const html = getAccessApprovedEmailTemplate(bankName, upiNumber, ownerName);
  await sendEmail({
    to,
    subject: `Access Granted for Property ${upiNumber} - Property Valuation System`,
    html
  });
};