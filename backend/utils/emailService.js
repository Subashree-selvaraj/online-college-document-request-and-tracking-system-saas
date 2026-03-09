const nodemailer = require('nodemailer');
require('dotenv').config();

// SMTP configuration with environment-driven overrides
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE === 'true'
  : smtpPort === 465;

const smtpUser =
  process.env.SMTP_USER ||
  process.env.EMAIL_USER ||
  'college.document.system@gmail.com';
const smtpPass =
  process.env.SMTP_PASS ||
  process.env.EMAIL_PASS ||
  'wqusavdpzreoobbd';

// Create a transporter object (pooled for stability on free tiers)
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  pool: true,
  maxConnections: 2,
  auth: {
    user: smtpUser,
    pass: smtpPass
  },
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000
});

async function sendViaBrevo(to, subject, html) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;
  const payload = {
    sender: { name: 'CampusDoc', email: smtpUser },
    to: [{ email: to }],
    subject,
    htmlContent: html
  };
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Brevo error ${res.status}: ${text}`);
  }
  const data = await res.json().catch(() => ({}));
  return data.messageId || 'brevo';
}

async function sendViaSendgrid(to, subject, html) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return null;
  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: smtpUser, name: 'CampusDoc' },
    subject,
    content: [{ type: 'text/html', value: html }]
  };
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (res.status !== 202) {
    const text = await res.text().catch(() => '');
    throw new Error(`SendGrid error ${res.status}: ${text}`);
  }
  return 'sendgrid';
}

async function sendHtml(to, subject, html) {
  if (process.env.BREVO_API_KEY) {
    return await sendViaBrevo(to, subject, html);
  }
  if (process.env.SENDGRID_API_KEY) {
    return await sendViaSendgrid(to, subject, html);
  }
  const info = await transporter.sendMail({
    from: smtpUser,
    to,
    subject,
    html
  });
  return info && info.messageId ? info.messageId : 'smtp';
}

const emailService = {
  verifyTransporter: async () => {
    try {
      await transporter.verify();
      console.log('Email transporter verified');
      return true;
    } catch (e) {
      console.error('Email transporter verification failed:', e);
      return false;
    }
  },
  // Send email notification when a document request status changes
  sendStatusUpdateEmail: async (recipientEmail, studentName, documentType, status, remarks) => {
    try {
      const subject = `Document Request Status Update: ${status}`;
      const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #3f51b5;">Document Request Status Update</h2>
            <p>Dear ${studentName},</p>
            <p>Your request for <strong>${documentType}</strong> has been <strong>${status.toLowerCase()}</strong>.</p>
            ${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ''}
            <p>Please log in to your account to view more details.</p>
            <div style="margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/dashboard" 
                 style="background-color: #3f51b5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                View Request
              </a>
            </div>
            <p>Regards,<br>College Document Request System</p>
          </div>
        `;
      
      const messageId = await sendHtml(recipientEmail, subject, html);
      console.log('Email sent: ', messageId);
      
      return {
        success: true,
        message: 'Email notification sent successfully',
        messageId
      };
    } catch (error) {
      console.error('Error sending email notification:', error);
      return {
        success: false,
        message: 'Failed to send email notification',
        error: error.message
      };
    }
  },
  
  // Send email notification when a document is ready for download
  sendDocumentReadyEmail: async (recipientEmail, studentName, documentType, downloadLink) => {
    try {
      const subject = `Your ${documentType} is Ready for Download`;
      const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #4caf50;">Your Document is Ready!</h2>
            <p>Dear ${studentName},</p>
            <p>Your requested document <strong>(${documentType})</strong> is now ready for download.</p>
            <p>You can download it by logging into your account or using the link below:</p>
            <div style="margin: 30px 0;">
              <a href="${downloadLink}" 
                 style="background-color: #4caf50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                Download Document
              </a>
            </div>
            <p>Regards,<br>College Document Request System</p>
          </div>
        `;
      
      const messageId = await sendHtml(recipientEmail, subject, html);
      console.log('Email sent: ', messageId);
      
      return {
        success: true,
        message: 'Document ready email sent successfully',
        messageId
      };
    } catch (error) {
      console.error('Error sending document ready email:', error);
      return {
        success: false,
        message: 'Failed to send document ready email',
        error: error.message
      };
    }
  },
  
  // Send email notification for new document request
  sendNewRequestEmail: async (adminEmail, studentName, documentType) => {
    try {
      const subject = `New Document Request: ${documentType}`;
      const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #ff9800;">New Document Request</h2>
            <p>Dear Admin,</p>
            <p>A new document request has been submitted.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p><strong>Student:</strong> ${studentName}</p>
              <p><strong>Document Type:</strong> ${documentType}</p>
            </div>
            <p>Please log in to the admin dashboard to review this request.</p>
            <div style="margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/dashboard" 
                 style="background-color: #ff9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                Review Request
              </a>
            </div>
            <p>Regards,<br>College Document Request System</p>
          </div>
        `;
      
      const messageId = await sendHtml(adminEmail, subject, html);
      console.log('Email sent: ', messageId);
      
      return {
        success: true,
        message: 'Admin notification sent successfully',
        messageId
      };
    } catch (error) {
      console.error('Error sending admin notification:', error);
      return {
        success: false,
        message: 'Failed to send admin notification',
        error: error.message
      };
    }
  },

  // Send custom email with provided subject and body
  sendCustomEmail: async (recipientEmail, subject, body) => {
    try {
      const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            ${body.replace(/\n/g, '<br>')}
          </div>
        `;
      
      const messageId = await sendHtml(recipientEmail, subject, html);
      console.log('Custom email sent: ', messageId);
      
      return {
        success: true,
        message: 'Custom email sent successfully',
        messageId
      };
    } catch (error) {
      console.error('Error sending custom email:', error);
      return {
        success: false,
        message: 'Failed to send custom email',
        error: error.message
      };
    }
  }
};

module.exports = emailService;
