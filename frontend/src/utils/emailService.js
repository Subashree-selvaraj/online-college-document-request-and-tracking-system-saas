import api from '../api';

const emailService = {
  sendStatusUpdateEmail: async (recipientEmail, studentName, documentType, status, remarks) => {
    const subject = `Document Request Status Update: ${status}`;
    const body = `
          Dear ${studentName},
          
          Your request for ${documentType} has been ${status.toLowerCase()}.
          
          ${remarks ? `Remarks: ${remarks}` : ''}
          
          Please log in to your account to view more details.
          
          Regards,
          College Document Request System
        `;
    try {
      await api.post('/email/send', { to: recipientEmail, subject, body });
      return { success: true, message: 'Email notification sent successfully' };
    } catch (error) {
      console.error('Error sending email notification:', error);
      return { success: false, message: 'Failed to send email notification', error: error.message };
    }
  },

  sendDocumentReadyEmail: async (recipientEmail, studentName, documentType, downloadLink) => {
    const subject = `Your ${documentType} is Ready for Download`;
    const body = `
          Dear ${studentName},
          
          Your requested document (${documentType}) is now ready for download.
          
          You can download it using the link below:
          ${downloadLink}
          
          Regards,
          College Document Request System
        `;
    try {
      await api.post('/email/send', { to: recipientEmail, subject, body });
      return { success: true, message: 'Document ready email sent successfully' };
    } catch (error) {
      console.error('Error sending document ready email:', error);
      return { success: false, message: 'Failed to send document ready email', error: error.message };
    }
  },

  sendNewRequestEmail: async (adminEmail, studentName, documentType) => {
    const subject = `New Document Request: ${documentType}`;
    const body = `
          Dear Admin,
          
          A new document request has been submitted.
          
          Student: ${studentName}
          Document Type: ${documentType}
          
          Please log in to the admin dashboard to review this request.
          
          Regards,
          College Document Request System
        `;
    try {
      await api.post('/email/send', { to: adminEmail, subject, body });
      return { success: true, message: 'Admin notification sent successfully' };
    } catch (error) {
      console.error('Error sending admin notification:', error);
      return { success: false, message: 'Failed to send admin notification', error: error.message };
    }
  },
};

export default emailService;
