const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const User = require('../models/User');
const Document = require('../models/Document');
const RequestLog = require('../models/RequestLog');
const Notification = require('../models/Notification');
const RequestComment = require('../models/RequestComment');
const {
  getApprovalCategory,
  calculateExpectedCompletionDate,
  requiresHod,
  requiresPrincipal,
  DEPARTMENT_DOCUMENTS,
  OFFICIAL_DOCUMENTS
} = require('../config/documentApprovalConfig');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary (use environment variables in production)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Resolve frontend base URL for links in emails
const FRONTEND_BASE =
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://campusledger.onrender.com'
    : 'http://localhost:3000');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads (PDF only)
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    // Create safe filename with timestamp
    const timestamp = Date.now();
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${safeFilename}`);
  }
});

// File filter for PDF only
const fileFilter = (req, file, cb) => {
  console.log('File filter check:', {
    originalName: file.originalname,
    mimetype: file.mimetype,
    fieldname: file.fieldname
  });
  
  // Accept only PDF files
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for PDF files
  }
});

async function createRequestLog(requestId, user, role, action, remarks) {
  try {
    await RequestLog.create({
      requestId,
      actionBy: user ? user.id : undefined,
      role: role || (user ? user.role : undefined),
      action,
      remarks
    });
  } catch (err) {
    console.error('Error creating request log:', err);
  }
}

async function createStudentNotification(request, title, message) {
  try {
    if (!request || !request.studentId) return;
    await Notification.create({
      userId: request.studentId,
      title,
      message,
      link: `/student/requests/${request._id}`
    });
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}

// @route   POST /api/requests
// @desc    Create a new document request
// @access  Student only
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can create requests' });
    }
    
    const { documentType, formData, priority } = req.body;

    const category = getApprovalCategory(documentType);
    const expectedCompletionDate = calculateExpectedCompletionDate(category);
    const requiresPrincipalApproval = requiresPrincipal(category);
    
    // Enforce urgent priority limit (max 1 urgent per 7 days)
    let finalPriority = priority === 'urgent' ? 'urgent' : 'normal';
    if (finalPriority === 'urgent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const urgentCount = await Request.countDocuments({
        studentId: req.user.id,
        priority: 'urgent',
        createdAt: { $gte: oneWeekAgo }
      });
      if (urgentCount >= 1) {
        return res.status(400).json({
          message: 'You can only create one urgent request per week.'
        });
      }
    }

    // Determine assigned admin based on handled document types
    let assignedAdmin = null;
    try {
      const admins = await User.find({ role: 'admin' });
      const eligibleAdmins = admins.filter(admin => 
        Array.isArray(admin.handledDocumentTypes) &&
        admin.handledDocumentTypes.includes(documentType)
      );
      
      const pool = eligibleAdmins.length > 0 ? eligibleAdmins : admins;
      
      if (pool.length > 0) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        assignedAdmin = pool[randomIndex]._id;
      }
    } catch (adminErr) {
      console.error('Error selecting assigned admin for request:', adminErr);
    }
    
    // Create new request
    const request = new Request({
      studentId: req.user.id,
      documentType,
      formData,
      requiresPrincipalApproval,
      assignedAdmin,
      approvalStage: 'submitted',
      expectedCompletionDate,
      priority: finalPriority
    });
    
    await request.save();

    await createRequestLog(request._id, req.user, 'student', 'student_submitted', null);
    
    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/requests
// @desc    Get all requests (admin/principal) or user's requests (student)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let requests;
    const role = req.user.role;
    
    if (role === 'admin') {
      // Admin can see only requests relevant to them (by handled types or assignment)
      const admin = await User.findById(req.user.id);
      let query = {};

      if (admin && Array.isArray(admin.handledDocumentTypes) && admin.handledDocumentTypes.length > 0) {
        query = {
          $or: [
            { assignedAdmin: admin._id },
            { documentType: { $in: admin.handledDocumentTypes } }
          ]
        };
      } else {
        // If no specific handled types configured, default to all requests
        query = {};
      }

      // Optional filtering by documentType via query string
      if (req.query.documentType) {
        query.documentType = req.query.documentType;
      }

      requests = await Request.find(query).sort({ createdAt: -1 });
      
      // Populate student details
      requests = await Promise.all(requests.map(async (request) => {
        const student = await User.findById(request.studentId).select('-password');
        return {
          ...request.toObject(),
          student
        };
      }));
    } else if (role === 'hod') {
      // HOD sees department + official documents
      const hodTypes = [...DEPARTMENT_DOCUMENTS, ...OFFICIAL_DOCUMENTS];
      requests = await Request.find({
        documentType: { $in: hodTypes }
      }).sort({ createdAt: -1 });

      requests = await Promise.all(requests.map(async (request) => {
        const student = await User.findById(request.studentId).select('-password');
        return {
          ...request.toObject(),
          student
        };
      }));
    } else if (role === 'principal') {
      // Principal work queue: only official docs that still need principal
      const officialNames = OFFICIAL_DOCUMENTS;

      const query = {
        documentType: { $in: officialNames },
        status: { $nin: ['Completed', 'Rejected'] }
      };

      requests = await Request.find(query).sort({ createdAt: -1 });

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

// @route   GET /api/requests/:id/download
// @desc    Download document for a request (proxy endpoint)
// @access  Admin or the student who owns the request
router.get('/:id/download', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Check if user is authorized (admin or the student who owns the request)
    if (req.user.role !== 'admin' && request.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (!request.issuedDocLink) {
      return res.status(404).json({ message: 'Document not available' });
    }
    
    // Use the Cloudinary URL directly - redirect to avoid 401 errors
    // Cloudinary handles PDF delivery better than proxying
    let downloadUrl = request.issuedDocLink;
    
    // For Cloudinary URLs, add fl_attachment parameter to force download
    if (downloadUrl.includes('cloudinary.com')) {
      const separator = downloadUrl.includes('?') ? '&' : '?';
      downloadUrl = `${downloadUrl}${separator}fl_attachment`;
    }
    
    // Redirect directly to Cloudinary - this avoids authentication issues
    // and lets Cloudinary's CDN handle the file delivery efficiently
    res.redirect(downloadUrl);
  } catch (err) {
    console.error('Error in download endpoint:', err);
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

    const category = getApprovalCategory(request.documentType);
    
    if (status === 'Approved') {
      request.status = 'Approved';
      request.remarks = remarks || request.remarks;

      if (category === 'instant') {
        request.approvalStage = 'ready_for_issue';
      } else {
        request.approvalStage = 'admin_verified';
      }

      // Clear any previous rejection flags
      request.rejectionReason = undefined;
      request.rejectedAt = undefined;
      request.rejectedByRole = undefined;

      await request.save();

      await createRequestLog(request._id, req.user, 'admin', 'admin_verified', remarks);
      await createStudentNotification(
        request,
        'Request verified by admin',
        `Your request for ${request.documentType} has been verified by admin.`
      );
    } else if (status === 'Rejected') {
      request.status = 'Rejected';
      request.remarks = remarks || request.remarks;
      request.approvalStage = 'rejected';
      request.rejectionReason = remarks || 'Rejected';
      request.rejectedByRole = 'admin';
      request.rejectedAt = new Date();

      await request.save();

      await createRequestLog(request._id, req.user, 'admin', 'admin_rejected', remarks);
      await createStudentNotification(
        request,
        'Request rejected by admin',
        `Your request for ${request.documentType} was rejected by admin. Reason: ${remarks || 'No reason provided.'}`
      );
    } else {
      // Fallback: preserve previous behaviour for other statuses
      request.status = status || request.status;
      request.remarks = remarks || request.remarks;
      await request.save();
    }
    
    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/requests/:id/upload
// @desc    Upload document for a request
// @access  Admin only
router.post('/:id/upload', auth, (req, res, next) => {
  // Handle multer errors
  upload.single('document')(req, res, (err) => {
    if (err) {
      console.log('Multer error:', err.message);
      if (err.message === 'Only PDF files are allowed!') {
        return res.status(400).json({
          success: false,
          message: 'Only PDF files are allowed for document upload.',
          error: 'INVALID_FILE_TYPE',
          userMessage: 'Please select a PDF file (.pdf) to upload.'
        });
      } else if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size is 10MB.',
          error: 'FILE_TOO_LARGE',
          userMessage: 'The PDF file is too large. Please choose a file smaller than 10MB.'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + err.message,
          error: 'UPLOAD_ERROR'
        });
      }
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('POST PDF Upload request received:', req.params.id);
    console.log('File received:', req.file ? {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');
    console.log('Request body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    
    // Check if this is a FormData request (proper file upload)
    const isFormData = req.headers['content-type']?.includes('multipart/form-data');
    console.log('Is FormData request:', isFormData);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Find request
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Enforce approval workflow: only allow upload when ready_for_issue
    if (request.approvalStage && request.approvalStage !== 'ready_for_issue') {
      return res.status(400).json({
        success: false,
        message: 'Document cannot be issued until required authorities approve.',
        error: 'APPROVALS_PENDING'
      });
    }
    
    // Check if request is in a state that allows document upload
    if (request.status === 'Completed') {
      console.log('Attempt to upload to already completed request');
      return res.status(400).json({ 
        success: false,
        message: 'This request is already completed',
        currentStatus: request.status,
        requestId: request._id
      });
    }
    
    // Handle document upload
    let documentUrl = null;
    let shouldUpdateStatus = false;
    
    if (req.file) {
        console.log('✅ PDF uploaded successfully:', {
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: `${(req.file.size / 1024).toFixed(2)} KB`,
          mimetype: req.file.mimetype
        });
        
        try {
          // Upload PDF to Cloudinary
          console.log('📤 Uploading PDF to Cloudinary...');
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'college-documents',
            resource_type: 'auto', // Cloudinary automatically detects PDFs
            upload_preset: 'public_uploads', // Use public preset for public delivery
            access_mode: 'public', // Ensure it's not private
            type: 'upload' // Avoid authenticated type
          });
          
          console.log('✅ Cloudinary upload successful:', {
            secure_url: result.secure_url,
            public_id: result.public_id
          });
          
          // Use the secure URL from Cloudinary
          documentUrl = result.secure_url;
          request.issuedDocLink = documentUrl;
          
          // Remove local file after uploading to Cloudinary
          fs.unlinkSync(req.file.path);
          console.log('🧹 Local PDF file cleaned up');
          
        } catch (cloudinaryError) {
          console.error('❌ Cloudinary upload error:', cloudinaryError);
          
          // Fallback to local storage if Cloudinary fails
          const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
          documentUrl = `${baseUrl}/uploads/${req.file.filename}`;
          console.log("⚠️ Fallback to local storage:", documentUrl);
          
          request.issuedDocLink = documentUrl;
        }
      } 
      // If there's a document URL in the request body, use that
      else if (req.body.issuedDocLink) {
        documentUrl = req.body.issuedDocLink;
        console.log("Document URL from request body:", documentUrl);
        
        // Update the document link
        request.issuedDocLink = documentUrl;
        console.log("Updated document link:", request.issuedDocLink);
        shouldUpdateStatus = true;
      } else if (req.body.issuedDocLink && req.body.issuedDocLink.trim()) {
        // Handle document URL from JSON request
        documentUrl = req.body.issuedDocLink.trim();
        console.log("Document URL from JSON request body:", documentUrl);
        request.issuedDocLink = documentUrl;
        shouldUpdateStatus = true;
      } else if (req.body.document && typeof req.body.document === 'string' && req.body.document.trim()) {
        // Handle document URL sent as 'document' field (alternative field name)
        documentUrl = req.body.document.trim();
        console.log("✅ Document URL from 'document' field:", documentUrl);
        request.issuedDocLink = documentUrl;
        shouldUpdateStatus = true;
      } else if (req.body.documentLink && req.body.documentLink.trim()) {
        // Handle document URL from frontend 'documentLink' field
        documentUrl = req.body.documentLink.trim();
        console.log("✅ Document URL from 'documentLink' field:", documentUrl);
        request.issuedDocLink = documentUrl;
        shouldUpdateStatus = true;
      } else if (req.body.document && req.body.document.name && req.body.document.data) {
        // Handle base64 encoded file data (frontend workaround)
        console.log("🔧 WORKAROUND: Handling base64 file data");
        try {
          const buffer = Buffer.from(req.body.document.data, 'base64');
          const filename = `${Date.now()}-${req.body.document.name}`;
          const filePath = path.join(uploadsDir, filename);
          
          // Save file locally
          fs.writeFileSync(filePath, buffer);
          
          // Upload to Cloudinary
          const result = await cloudinary.uploader.upload(filePath, {
            folder: 'college-documents',
            resource_type: 'auto', // Cloudinary automatically detects PDFs
            upload_preset: 'public_uploads', // Use public preset for public delivery
            access_mode: 'public', // Ensure it's not private
            type: 'upload' // Avoid authenticated type
          });
          
          documentUrl = result.secure_url;
          request.issuedDocLink = documentUrl;
          shouldUpdateStatus = true;
          
          // Clean up local file
          fs.unlinkSync(filePath);
          console.log("✅ Base64 file processed successfully");
          
        } catch (base64Error) {
          console.error("❌ Base64 file processing error:", base64Error);
          return res.status(400).json({
            success: false,
            message: 'Error processing uploaded file data'
          });
        }
      } else if (req.body.status) {
        // Allow explicit status updates without file upload
        console.log("Updating status without file upload");
        shouldUpdateStatus = true;
      } else {
        // Frontend is not sending file properly - but allow completion anyway for testing
        console.log("❌ FRONTEND BUG: File upload failed");
        console.log("📊 Analysis:", {
          hasFile: !!req.file,
          bodyKeys: Object.keys(req.body),
          contentType: req.headers['content-type'],
          isFormData: req.headers['content-type']?.includes('multipart/form-data'),
          documentValue: req.body.document,
          documentType: typeof req.body.document
        });
        
        // REQUIRE DOCUMENT URL: Don't complete without proper document link
        return res.status(400).json({ 
          success: false,
          message: 'Document URL is required to complete the request',
          error: 'MISSING_DOCUMENT_URL',
          userMessage: 'Please provide a document URL in the "Document Link" field to complete this request.',
          instructions: [
            '1. Enter a valid PDF URL in the "Document Link" field',
            '2. Example: https://example.com/document.pdf', 
            '3. Or upload a PDF file (if file upload is working)',
            '4. Then click "Complete Request"'
          ],
          frontendIssue: 'The file upload is not working. Use the Document Link field instead.'
        });
      }
      
      // Update status and remarks
      if (req.body.status) {
        request.status = req.body.status;
        console.log("Status updated from request body:", req.body.status);
      } else if (documentUrl) {
        // Set to Completed when a document is uploaded or provided
        request.status = 'Completed';
        console.log("Status set to Completed due to document upload/link");
      }
      
      if (req.body.remarks !== undefined) {
        request.remarks = req.body.remarks;
        console.log("Remarks updated:", req.body.remarks);
      }
      
      request.updatedAt = Date.now();
      
      console.log("Setting request status to Completed");
      
      await request.save();
      await createRequestLog(request._id, req.user, 'admin', 'admin_uploaded_document', req.body.remarks);
      
      // Send email notification
      try {
        const user = await User.findById(request.studentId);
        if (user) {
          const emailService = require('../utils/emailService');
          await emailService.sendDocumentReadyEmail(
            user.email,
            user.name,
            request.documentType,
            `${FRONTEND_BASE}/student/requests/${request._id}`
          );
        }
      } catch (emailErr) {
        console.error('Error sending email notification:', emailErr);
        // Continue with the process even if email fails
      }
      
      res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/requests/:id/upload
// @desc    Upload document or update with document link
// @access  Admin only
router.put('/:id/upload', auth, upload.single('document'), async (req, res) => {
  try {
    console.log('PUT Upload request received:', req.params.id);
    console.log('File:', req.file);
    console.log('Request body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Find request
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Enforce approval workflow: only allow upload when ready_for_issue
    if (request.approvalStage && request.approvalStage !== 'ready_for_issue') {
      return res.status(400).json({
        message: 'Document cannot be issued until required authorities approve.',
        error: 'APPROVALS_PENDING'
      });
    }
    
    // Handle document upload or link
    let documentUrl = null;
    let statusUpdated = false;
    
    if (req.file) {
      console.log('File uploaded successfully:', req.file.filename);
      
      try {
        // Upload file to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'college-documents',
          resource_type: 'auto', // Cloudinary automatically detects PDFs
          upload_preset: 'public_uploads', // Use public preset for public delivery
          access_mode: 'public', // Ensure it's not private
          type: 'upload' // Avoid authenticated type
        });
        
        console.log('Cloudinary upload result:', result);
        
        // Use the secure URL from Cloudinary
        documentUrl = result.secure_url;
        console.log("Document uploaded to Cloudinary:", documentUrl);
        
        // Remove local file after uploading to Cloudinary
        fs.unlinkSync(req.file.path);
      } catch (cloudinaryError) {
        console.error('Cloudinary upload error:', cloudinaryError);
        
        // Fallback to local storage if Cloudinary fails
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        documentUrl = `${baseUrl}/uploads/${req.file.filename}`;
        console.log("Fallback to local storage:", documentUrl);
      }
      
      request.issuedDocLink = documentUrl;
      request.status = 'Completed';
      request.approvalStage = 'completed';
      statusUpdated = true;
    } else if (req.body.issuedDocLink && req.body.issuedDocLink.trim()) {
      // Handle document link from request body
      documentUrl = req.body.issuedDocLink.trim();
      console.log("Document URL from request body:", documentUrl);
      request.issuedDocLink = documentUrl;
      request.status = 'Completed';
      request.approvalStage = 'completed';
      statusUpdated = true;
    } else if (req.body.status) {
      // Allow status updates without file/link
      console.log("Updating status to:", req.body.status);
      request.status = req.body.status;
      statusUpdated = true;
    } else {
      console.log("No file, document URL, or status update provided");
      return res.status(400).json({ 
        message: 'Please provide either a document file, document URL, or status update',
        received: {
          hasFile: !!req.file,
          hasDocumentLink: !!(req.body.issuedDocLink && req.body.issuedDocLink.trim()),
          hasStatus: !!req.body.status,
          bodyKeys: Object.keys(req.body)
        }
      });
    }
    
    // Update remarks if provided
    if (req.body.remarks) {
      request.remarks = req.body.remarks;
    }
    
    request.updatedAt = Date.now();
    
    await request.save();
    
    // Send email notification
    try {
      const user = await User.findById(request.studentId);
      if (user) {
        const emailService = require('../utils/emailService');
        await emailService.sendDocumentReadyEmail(
          user.email,
          user.name,
          request.documentType,
          `${FRONTEND_BASE}/student/requests/${request._id}`
        );
      }
    } catch (emailErr) {
      console.error('Error sending email notification:', emailErr);
      // Continue with the process even if email fails
    }
    
    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/requests/:id/upload
// @desc    Update request with document link or status (JSON only)
// @access  Admin only
router.patch('/:id/upload', auth, async (req, res) => {
  try {
    console.log('PATCH Upload request received:', req.params.id);
    console.log('Request body:', req.body);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Find request
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Enforce approval workflow: only allow upload when ready_for_issue
    if (request.approvalStage && request.approvalStage !== 'ready_for_issue') {
      return res.status(400).json({
        message: 'Document cannot be issued until required authorities approve.',
        error: 'APPROVALS_PENDING'
      });
    }
    
    let statusUpdated = false;
    
    // Handle document link
    if (req.body.issuedDocLink && req.body.issuedDocLink.trim()) {
      console.log("Document URL from request body:", req.body.issuedDocLink);
      request.issuedDocLink = req.body.issuedDocLink.trim();
      request.status = 'Completed';
      request.approvalStage = 'completed';
      statusUpdated = true;
    }
    
    // Handle status update
    if (req.body.status) {
      console.log("Updating status to:", req.body.status);
      request.status = req.body.status;
      statusUpdated = true;
    }
    
    // Update remarks if provided
    if (req.body.remarks !== undefined) {
      request.remarks = req.body.remarks;
      statusUpdated = true;
    }
    
    if (!statusUpdated) {
      return res.status(400).json({ 
        message: 'Please provide at least one field to update (issuedDocLink, status, or remarks)',
        received: Object.keys(req.body)
      });
    }
    
    request.updatedAt = Date.now();
    await request.save();
    
    // Send email notification if document is completed
    if (request.status === 'Completed' && request.issuedDocLink) {
      try {
        const user = await User.findById(request.studentId);
        if (user) {
          const emailService = require('../utils/emailService');
          await emailService.sendDocumentReadyEmail(
            user.email,
            user.name,
            request.documentType,
            `${FRONTEND_BASE}/student/requests/${request._id}`
          );
        }
      } catch (emailErr) {
        console.error('Error sending email notification:', emailErr);
        // Continue with the process even if email fails
      }
    }
    
    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/requests/:id/validate-upload
// @desc    Validate if upload data is sufficient (for frontend validation)
// @access  Admin only
router.post('/:id/validate-upload', auth, (req, res, next) => {
  // Check content type and apply multer accordingly for validation
  const contentType = req.headers['content-type'] || '';
  
  if (contentType.includes('multipart/form-data')) {
    upload.single('document')(req, res, next);
  } else {
    next();
  }
}, async (req, res) => {
  try {
    console.log('Validation request for:', req.params.id);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Find request
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Enforce approval workflow: only allow upload when ready_for_issue
    if (request.approvalStage && request.approvalStage !== 'ready_for_issue') {
      return res.status(400).json({
        success: false,
        message: 'Document cannot be issued until required authorities approve.',
        error: 'APPROVALS_PENDING'
      });
    }
    
    // Validate upload data
    const hasFile = !!req.file;
    const hasDocumentUrl = !!(req.body.issuedDocLink && req.body.issuedDocLink.trim());
    const hasDocumentField = !!(req.body.document && typeof req.body.document === 'string' && req.body.document.trim());
    
    const isValid = hasFile || hasDocumentUrl || hasDocumentField;
    
    res.json({
      valid: isValid,
      hasFile,
      hasDocumentUrl,
      hasDocumentField,
      canComplete: isValid && request.status !== 'Completed',
      currentStatus: request.status,
      message: isValid ? 'Upload data is valid' : 'Please provide either a file or document URL'
    });
    
  } catch (err) {
    console.error('Validation error:', err);
    res.status(500).json({ message: 'Server error during validation' });
  }
});

// @route   POST /api/requests/:id/debug-upload
// @desc    Debug endpoint to see what frontend is sending
// @access  Admin only  
router.post('/:id/debug-upload', auth, upload.single('document'), async (req, res) => {
  console.log('🔍 DEBUG Upload Endpoint Called');
  console.log('Request ID:', req.params.id);
  console.log('Headers:', req.headers);
  console.log('File:', req.file);
  console.log('Body:', req.body);
  console.log('Method:', req.method);
  
  res.json({
    message: 'Debug info logged to console',
    received: {
      hasFile: !!req.file,
      fileInfo: req.file,
      bodyKeys: Object.keys(req.body),
      bodyContent: req.body,
      contentType: req.headers['content-type'],
      method: req.method
    }
  });
});

// @route   PUT /api/requests/:id/document-link
// @desc    Update document link for completed request
// @access  Admin only
router.put('/:id/document-link', auth, async (req, res) => {
  try {
    console.log('Document link update request:', req.params.id);
    console.log('Request body:', req.body);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { documentLink, remarks } = req.body;
    
    if (!documentLink || !documentLink.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Document link is required'
      });
    }
    
    // Find request
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Enforce approval workflow: only allow upload when ready_for_issue
    if (request.approvalStage && request.approvalStage !== 'ready_for_issue') {
      return res.status(400).json({
        success: false,
        message: 'Document cannot be issued until required authorities approve.',
        error: 'APPROVALS_PENDING'
      });
    }
    
    // Update document link
    request.issuedDocLink = documentLink.trim();
    request.status = 'Completed';
    request.approvalStage = 'completed';
    if (remarks !== undefined) {
      request.remarks = remarks;
    }
    request.updatedAt = Date.now();
    
    await request.save();
    
    console.log('✅ Document link updated:', documentLink.trim());
    
    // Send email notification if student info is available
    try {
      const user = await User.findById(request.studentId);
      if (user) {
        const emailService = require('../utils/emailService');
        await emailService.sendDocumentReadyEmail(
          user.email,
          user.name,
          request.documentType,
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/requests/${request._id}`
        );
        console.log('📧 Email notification sent to student');
      }
    } catch (emailErr) {
      console.error('Error sending email notification:', emailErr);
    }
    
    res.json({
      success: true,
      message: 'Document link updated successfully',
      request: request
    });
    
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

// @route   PUT /api/requests/:id/hod-approve
// @desc    HOD approves department/official document
// @access  HOD only
router.put('/:id/hod-approve', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hod') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { remarks } = req.body;
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const category = getApprovalCategory(request.documentType);

    if (!requiresHod(category)) {
      return res.status(400).json({
        message: 'This request does not require HOD approval'
      });
    }

    // Require admin verification first
    if (request.approvalStage !== 'admin_verified') {
      return res.status(400).json({
        message: 'Admin verification is required before HOD approval'
      });
    }

    if (category === 'department') {
      request.approvalStage = 'ready_for_issue';
    } else {
      request.approvalStage = 'hod_verified';
    }

    if (remarks !== undefined) {
      request.remarks = remarks;
    }

    await request.save();

    await createRequestLog(request._id, req.user, 'hod', 'hod_approved', remarks);
    await createStudentNotification(
      request,
      'Request approved by HOD',
      `Your request for ${request.documentType} has been approved by HOD.`
    );

    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/requests/:id/hod-reject
// @desc    HOD rejects document request
// @access  HOD only
router.put('/:id/hod-reject', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hod') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { remarks } = req.body;
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const category = getApprovalCategory(request.documentType);

    if (!requiresHod(category)) {
      return res.status(400).json({
        message: 'This request does not require HOD approval'
      });
    }

    request.status = 'Rejected';
    request.approvalStage = 'rejected';
    request.rejectionReason = remarks || 'Rejected';
    request.rejectedByRole = 'hod';
    request.rejectedAt = new Date();

    if (remarks !== undefined) {
      request.remarks = remarks;
    }

    await request.save();

    await createRequestLog(request._id, req.user, 'hod', 'hod_rejected', remarks);
    await createStudentNotification(
      request,
      'Request rejected by HOD',
      `Your request for ${request.documentType} was rejected by HOD. Reason: ${remarks || 'No reason provided.'}`
    );

    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/requests/:id/principal-approve
// @desc    Principal verifies/approves an official document request
// @access  Principal only
router.put('/:id/principal-approve', auth, async (req, res) => {
  try {
    if (req.user.role !== 'principal') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { remarks } = req.body;

    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const category = getApprovalCategory(request.documentType);

    if (!requiresPrincipal(category)) {
      return res.status(400).json({
        message: 'This request does not require principal approval'
      });
    }

    // Require HOD verification first for official documents
    if (request.approvalStage !== 'hod_verified') {
      return res.status(400).json({
        message: 'HOD approval is required before principal approval'
      });
    }

    request.principalApproved = true;
    request.principalId = req.user.id;
    request.principalApprovedAt = Date.now();
    request.approvalStage = 'ready_for_issue';

    if (remarks !== undefined) {
      request.remarks = remarks;
    }

    await request.save();

    await createRequestLog(request._id, req.user, 'principal', 'principal_approved', remarks);
    await createStudentNotification(
      request,
      'Request approved by Principal',
      `Your request for ${request.documentType} has been approved by Principal.`
    );

    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/requests/:id/principal-reject
// @desc    Principal rejects official document request
// @access  Principal only
router.put('/:id/principal-reject', auth, async (req, res) => {
  try {
    if (req.user.role !== 'principal') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { remarks } = req.body;

    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const category = getApprovalCategory(request.documentType);

    if (!requiresPrincipal(category)) {
      return res.status(400).json({
        message: 'This request does not require principal approval'
      });
    }

    request.status = 'Rejected';
    request.approvalStage = 'rejected';
    request.rejectionReason = remarks || 'Rejected';
    request.rejectedByRole = 'principal';
    request.rejectedAt = new Date();

    if (remarks !== undefined) {
      request.remarks = remarks;
    }

    await request.save();

    await createRequestLog(request._id, req.user, 'principal', 'principal_rejected', remarks);
    await createStudentNotification(
      request,
      'Request rejected by Principal',
      `Your request for ${request.documentType} was rejected by Principal. Reason: ${remarks || 'No reason provided.'}`
    );

    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/requests/:id/timeline
// @desc    Get timeline logs for a request
// @access  Private
router.get('/:id/timeline', auth, async (req, res) => {
  try {
    const logs = await RequestLog.find({ requestId: req.params.id }).sort({ timestamp: 1 });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/requests/:id/resubmit
// @desc    Student resubmits a rejected request with corrections
// @access  Student only
router.post('/:id/resubmit', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can resubmit requests' });
    }

    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (request.approvalStage !== 'rejected') {
      return res.status(400).json({ message: 'Only rejected requests can be resubmitted' });
    }

    const { formData, remarks } = req.body || {};

    if (formData && typeof formData === 'object') {
      request.formData = {
        ...request.formData,
        ...formData
      };
    }

    const category = getApprovalCategory(request.documentType);
    request.approvalStage = 'submitted';
    request.status = 'Pending';
    request.rejectionReason = undefined;
    request.rejectedByRole = undefined;
    request.rejectedAt = undefined;
    request.expectedCompletionDate = calculateExpectedCompletionDate(category);

    await request.save();

    await createRequestLog(request._id, req.user, 'student', 'student_resubmitted', remarks);

    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/requests/:id/comments
// @desc    Get comments for a request
// @access  Private
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Students can only see their own, staff can see all
    if (req.user.role === 'student' && request.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const comments = await RequestComment.find({ requestId: req.params.id }).sort({ timestamp: 1 });
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/requests/:id/comments
// @desc    Add a comment to a request
// @access  Private
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { message, attachments } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Students can only comment on their own requests
    if (req.user.role === 'student' && request.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const comment = await RequestComment.create({
      requestId: req.params.id,
      userId: req.user.id,
      role: req.user.role,
      message: message.trim(),
      attachments: Array.isArray(attachments) ? attachments : []
    });

    await createRequestLog(request._id, req.user, req.user.role, 'comment_added', message);

    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
