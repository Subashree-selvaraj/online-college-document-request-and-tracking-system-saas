const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'admin', 'principal', 'hod'],
    default: 'student'
  },
  department: {
    type: String,
    required: function() { return this.role === 'student'; }
  },
  semester: {
    type: Number,
    required: function() { return this.role === 'student'; }
  },
  duesCleared: {
    type: Boolean,
    default: false,
    required: function() { return this.role === 'student'; }
  },
  handledDocumentTypes: {
    type: [String],
    default: []
  },
  title: {
    type: String
  },
  signatureUrl: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);