const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  requiredFields: {
    type: [{
      name: {
        type: String,
        required: true
      },
      label: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['text', 'number', 'date', 'select', 'textarea', 'checkbox', 'file'],
        required: true
      },
      options: {
        type: [String],
        default: []
      },
      required: {
        type: Boolean,
        default: true
      }
    }],
    default: []
  },
  eligibilityRules: {
    type: [String],
    default: []
  },
  category: {
    type: String,
    enum: ['Academic Certificates', 'Transfer / Study Related', 'Recommendation / Other Requests'],
    default: 'Academic Certificates'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Document', DocumentSchema);