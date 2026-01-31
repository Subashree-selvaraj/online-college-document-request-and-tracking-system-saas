const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Request = require('./models/Request');
const Document = require('./models/Document');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/college-portal')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Find user by email (case insensitive)
    const user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if role matches
    if (role && user.role !== role) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        semester: user.semester,
        duesCleared: user.duesCleared
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Import routes
const documentsRoutes = require('./routes/documents');
const requestsRoutes = require('./routes/requests');
const documentTypesRoutes = require('./routes/documentTypes');
const emailNotificationsRoutes = require('./routes/emailNotifications');
const usersRoutes = require('./routes/users');

// Use routes
app.use('/api/documents', documentsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/documents/types', documentTypesRoutes);
app.use('/api/notifications/email', emailNotificationsRoutes);
app.use('/api/email', emailNotificationsRoutes); // Add route at expected path
app.use('/api/users', usersRoutes);

// User routes
app.get('/api/users/me', async (req, res) => {
  try {
    // Get token from header
    const token = req.header('x-auth-token');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // Get user
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (admin only)
app.get('/api/users', async (req, res) => {
  try {
    // Get token from header
    const token = req.header('x-auth-token');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // Check if user is admin
    const user = await User.findById(decoded.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to access this resource' });
    }
    
    // Get all users
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user eligibility (admin only)
app.put('/api/users/:userId/eligibility', async (req, res) => {
  try {
    // Get token from header
    const token = req.header('x-auth-token');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // Check if user is admin
    const admin = await User.findById(decoded.id);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update user eligibility' });
    }
    
    const { duesCleared } = req.body;
    if (duesCleared === undefined) {
      return res.status(400).json({ message: 'Dues cleared status is required' });
    }
    
    // Find user and update eligibility
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role !== 'student') {
      return res.status(400).json({ message: 'Only student eligibility can be updated' });
    }
    
    user.duesCleared = duesCleared;
    await user.save();
    
    res.json({ message: 'User eligibility updated successfully', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));