const express = require('express');
const router = express.Router();
const emailService = require('../utils/emailService');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Send test email
router.post('/test', async (req, res) => {
  try {
    const email = req.body.email || 'subashree_23it52@kgkite.ac.in';
    
    // Send a test email
    const result = await emailService.sendStatusUpdateEmail(
      email,
      'Test User',
      'Test Document',
      'Approved',
      'This is a test email to verify the email notification system is working.'
    );
    
    if (result.success) {
      return res.status(200).json({ success: true, message: 'Test email sent successfully' });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to send test email', error: result.error });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Send custom email
router.post('/send', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    
    if (!to || !subject || !body) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email recipient, subject, and body are required' 
      });
    }
    
    // Create a transporter and send email
    const result = await emailService.sendCustomEmail(to, subject, body);
    
    if (result.success) {
      return res.status(200).json({ success: true, message: 'Email sent successfully' });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to send email', error: result.error });
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;