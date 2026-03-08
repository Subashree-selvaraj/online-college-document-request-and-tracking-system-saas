const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const auth = require('../middleware/auth');

// @route   GET /api/documents
// @desc    Get all document types
// @access  Public
router.get('/', async (req, res) => {
  try {
    const documents = await Document.find({ isActive: true });
    res.json(documents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/documents/:id
// @desc    Get document type by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document type not found' });
    }
    
    res.json(document);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/documents
// @desc    Create a new document type
// @access  Admin only
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { name, description, requiredFields } = req.body;
    
    // Check if document type already exists
    let document = await Document.findOne({ name });
    
    if (document) {
      return res.status(400).json({ message: 'Document type already exists' });
    }
    
    // Create new document type
    document = new Document({
      name,
      description,
      requiredFields
    });
    
    await document.save();
    
    res.status(201).json(document);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/documents/:id
// @desc    Update a document type
// @access  Admin only
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { name, description, requiredFields, isActive } = req.body;
    
    // Find document type
    let document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document type not found' });
    }
    
    // Update document type
    document.name = name || document.name;
    document.description = description || document.description;
    document.requiredFields = requiredFields || document.requiredFields;
    document.isActive = isActive !== undefined ? isActive : document.isActive;
    
    await document.save();
    
    res.json(document);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete a document type
// @access  Admin only
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Find document type
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document type not found' });
    }
    
    await document.remove();
    
    res.json({ message: 'Document type removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;