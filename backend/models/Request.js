const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentType: {
    type: String,
    required: true
  },
  formData: {
    type: Object,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Completed', 'Rejected'],
    default: 'Pending'
  },
  remarks: {
    type: String,
    default: ''
  },
  issuedDocLink: {
    type: String,
    default: ''
  },
  assignedAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  requiresPrincipalApproval: {
    type: Boolean,
    default: false
  },
  principalApproved: {
    type: Boolean,
    default: false
  },
  principalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  principalApprovedAt: {
    type: Date
  },
  approvalStage: {
    type: String,
    enum: [
      'submitted',
      'admin_verified',
      'hod_verified',
      'principal_verified',
      'ready_for_issue',
      'completed',
      'rejected'
    ],
    default: 'submitted'
  },
  expectedCompletionDate: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  rejectedByRole: {
    type: String
  },
  rejectedAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['normal', 'urgent'],
    default: 'normal'
  },
  archived: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
RequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Request', RequestSchema);