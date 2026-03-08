// Email service utility for sending notifications

// Store notification preferences (in a real app, this would be in a database)
const notificationPreferences = new Map();

const emailService = {
  // Send email notification when a document request status changes
  sendStatusUpdateEmail: async (recipientEmail, studentName, documentType, status, remarks) => {
    try {
      // Check if user has disabled notifications
      if (notificationPreferences.has(recipientEmail) && 
          notificationPreferences.get(recipientEmail).disabled) {
        console.log(`Email notification skipped for ${recipientEmail} (notifications disabled)`);
        return {
          success: true,
          message: 'Email notification skipped (notifications disabled)'
        };
      }
      
      // In a real implementation, this would call an email API service
      // For now, we'll just log the email details
      console.log('Sending email notification:', {
        to: recipientEmail,
        subject: `Document Request Status Update: ${status}`,
        body: `
          Dear ${studentName},
          
          Your request for ${documentType} has been ${status.toLowerCase()}.
          
          ${remarks ? `Remarks: ${remarks}` : ''}
          
          Please log in to your account to view more details.
          
          Regards,
          College Document Request System
        `
      });
      
      // Mock successful email sending
      return {
        success: true,
        message: 'Email notification sent successfully'
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
      // Check if user has disabled notifications
      if (notificationPreferences.has(recipientEmail) && 
          notificationPreferences.get(recipientEmail).disabled) {
        console.log(`Email notification skipped for ${recipientEmail} (notifications disabled)`);
        return {
          success: true,
          message: 'Email notification skipped (notifications disabled)'
        };
      }
      
      // In a real implementation, this would call an email API service
      console.log('Sending document ready email:', {
        to: recipientEmail,
        subject: `Your ${documentType} is Ready for Download`,
        body: `
          Dear ${studentName},
          
          Your requested document (${documentType}) is now ready for download.
          
          You can download it by logging into your account or using the following link:
          ${downloadLink}
          
          Regards,
          College Document Request System
        `
      });
      
      // Mock successful email sending
      return {
        success: true,
        message: 'Document ready email sent successfully'
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
      // In a real implementation, this would call an email API service
      console.log('Sending new request notification to admin:', {
        to: adminEmail,
        subject: `New Document Request: ${documentType}`,
        body: `
          Dear Admin,
          
          A new document request has been submitted.
          
          Student: ${studentName}
          Document Type: ${documentType}
          
          Please log in to the admin dashboard to review this request.
          
          Regards,
          College Document Request System
        `
      });
      
      // Mock successful email sending
      return {
        success: true,
        message: 'Admin notification sent successfully'
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
  
  // Enable email notifications for a specific user
  enableNotifications: async (email, requestId) => {
    try {
      if (!notificationPreferences.has(email)) {
        notificationPreferences.set(email, { disabled: false, requests: new Set() });
      } else {
        const prefs = notificationPreferences.get(email);
        prefs.disabled = false;
        notificationPreferences.set(email, prefs);
      }
      
      console.log(`Email notifications enabled for ${email} for request ${requestId}`);
      return {
        success: true,
        message: 'Notifications enabled successfully'
      };
    } catch (error) {
      console.error('Error enabling notifications:', error);
      return {
        success: false,
        message: 'Failed to enable notifications',
        error: error.message
      };
    }
  },
  
  // Disable email notifications for a specific user
  disableNotifications: async (email, requestId) => {
    try {
      if (!notificationPreferences.has(email)) {
        notificationPreferences.set(email, { disabled: true, requests: new Set() });
      } else {
        const prefs = notificationPreferences.get(email);
        prefs.disabled = true;
        notificationPreferences.set(email, prefs);
      }
      
      console.log(`Email notifications disabled for ${email} for request ${requestId}`);
      return {
        success: true,
        message: 'Notifications disabled successfully'
      };
    } catch (error) {
      console.error('Error disabling notifications:', error);
      return {
        success: false,
        message: 'Failed to disable notifications',
        error: error.message
      };
    }
  }
};

export default emailService;