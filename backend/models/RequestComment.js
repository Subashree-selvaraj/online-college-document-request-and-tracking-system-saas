const mongoose = require('mongoose');

const RequestCommentSchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String
  },
  message: {
    type: String,
    required: true
  },
  attachments: {
    type: [String],
    default: []
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('RequestComment', RequestCommentSchema);

