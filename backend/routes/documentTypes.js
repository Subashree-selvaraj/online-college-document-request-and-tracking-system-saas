const express = require('express');
const router = express.Router();
const DocumentType = require('../models/DocumentType');
const auth = require('../middleware/auth');

// Get all document types
router.get('/', async (req, res) => {
  try {
    const documentTypes = await DocumentType.find().sort({ name: 1 });
    res.json(documentTypes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get document type by ID
router.get('/:id', async (req, res) => {
  try {
    const documentType = await DocumentType.findById(req.params.id);
    if (!documentType) {
      return res.status(404).json({ message: 'Document type not found' });
    }
    res.json(documentType);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create document type (admin only)
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { name, description, requiredFields, processingTime } = req.body;

    // Check if document type already exists
    const existingType = await DocumentType.findOne({ name });
    if (existingType) {
      return res.status(400).json({ message: 'Document type already exists' });
    }

    const newDocumentType = new DocumentType({
      name,
      description,
      requiredFields,
      processingTime
    });

    const savedDocumentType = await newDocumentType.save();
    res.status(201).json(savedDocumentType);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update document type (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { name, description, requiredFields, processingTime } = req.body;

    // Check if document type exists
    let documentType = await DocumentType.findById(req.params.id);
    if (!documentType) {
      return res.status(404).json({ message: 'Document type not found' });
    }

    // Check if name is being changed and if new name already exists
    if (name !== documentType.name) {
      const existingType = await DocumentType.findOne({ name });
      if (existingType) {
        return res.status(400).json({ message: 'Document type name already exists' });
      }
    }

    // Update document type
    documentType = await DocumentType.findByIdAndUpdate(
      req.params.id,
      { name, description, requiredFields, processingTime },
      { new: true }
    );

    res.json(documentType);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete document type (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    // Check if document type exists
    const documentType = await DocumentType.findById(req.params.id);
    if (!documentType) {
      return res.status(404).json({ message: 'Document type not found' });
    }

    await DocumentType.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document type deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;