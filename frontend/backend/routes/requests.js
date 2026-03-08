const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST /api/requests
// @desc    Create a new document request
// @access  Student only
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can create requests' });
    }
    
    const { documentType, formData } = req.body;
    
    // Create new request
    const request = new Request({
      studentId: req.user.id,
      documentType,
      formData
    });
    
    await request.save();
    
    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/requests
// @desc    Get all requests (admin) or user's requests (student)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let requests;
    
    if (req.user.role === 'admin') {
      // Admin can see all requests
      requests = await Request.find().sort({ createdAt: -1 });
      
      // Populate student details
      requests = await Promise.all(requests.map(async (request) => {
        const student = await User.findById(request.studentId).select('-password');
        return {
          ...request.toObject(),
          student
        };
      }));
    } else {
      // Students can only see their own requests
      requests = await Request.find({ studentId: req.user.id }).sort({ createdAt: -1 });
    }
    
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/requests/:id
// @desc    Get request by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Check if user is authorized to view this request
    if (req.user.role !== 'admin' && request.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // If admin is viewing, include student details
    if (req.user.role === 'admin') {
      const student = await User.findById(request.studentId).select('-password');
      return res.json({
        ...request.toObject(),
        student
      });
    }
    
    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/requests/:id/status
// @desc    Update request status
// @access  Admin only
router.put('/:id/status', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { status, remarks } = req.body;
    
    // Find request
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Update request
    request.status = status || request.status;
    request.remarks = remarks || request.remarks;
    
    await request.save();
    
    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/requests/:id/upload
// @desc    Upload document link
// @access  Admin only
router.put('/:id/upload', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { issuedDocLink } = req.body;
    
    // Find request
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Update request
    request.issuedDocLink = issuedDocLink;
    request.status = 'Completed';
    
    await request.save();
    
    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/requests/student/:studentId
// @desc    Get all requests for a specific student
// @access  Admin or the student themselves
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    // Check if user is admin or the student themselves
    if (req.user.role !== 'admin' && req.user.id !== req.params.studentId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const requests = await Request.find({ studentId: req.params.studentId }).sort({ createdAt: -1 });
    
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;