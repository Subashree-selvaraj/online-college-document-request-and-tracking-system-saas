const mongoose = require('mongoose');

const documentTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  requiredFields: {
    type: [String],
    default: []
  },
  processingTime: {
    type: String,
    default: '3-5 working days'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const DocumentType = mongoose.model('DocumentType', documentTypeSchema);

module.exports = DocumentType;