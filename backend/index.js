const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const winston = require('winston');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Request = require('./models/Request');
const Document = require('./models/Document');

// Initialize Express app
const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// Winston logger
const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Simple in-memory rate limiter for login
const loginAttempts = {};
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_MAX_ATTEMPTS = 10;

function loginRateLimiter(req, res, next) {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    if (!loginAttempts[ip]) {
      loginAttempts[ip] = { count: 0, first: now };
    }
    const entry = loginAttempts[ip];
    if (now - entry.first > LOGIN_WINDOW_MS) {
      entry.count = 0;
      entry.first = now;
    }
    if (entry.count >= LOGIN_MAX_ATTEMPTS) {
      return res.status(429).json({
        message: 'Too many login attempts. Please try again later.'
      });
    }
    entry.count += 1;
    next();
  } catch (err) {
    console.error('Rate limiter error:', err);
    next();
  }
}

// Security & core middleware
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
    exposedHeaders: ['x-auth-token'],
    credentials: true,
    optionsSuccessStatus: 204
  })
);

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(
  morgan(isProduction ? 'combined' : 'dev', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// MongoDB connection with retry
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/college-portal';

const connectWithRetry = () => {
  mongoose
    .connect(MONGO_URI)
    .then(() => logger.info('MongoDB Connected'))
    .catch((err) => {
      logger.error('MongoDB Connection Error', { error: err.message });
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

// Health endpoint
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbHealthy = dbState === 1;
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'ok' : 'degraded',
    dbState
  });
});

// Authentication routes
app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password, role } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

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
    logger.error('Login error', { error: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// Import routes
const documentsRoutes = require('./routes/documents');
const requestsRoutes = require('./routes/requests');
const documentTypesRoutes = require('./routes/documentTypes');
const emailNotificationsRoutes = require('./routes/emailNotifications');
const usersRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');

// Use routes
app.use('/api/documents', documentsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/documents/types', documentTypesRoutes);
app.use('/api/notifications/email', emailNotificationsRoutes);
app.use('/api/email', emailNotificationsRoutes); // Add route at expected path
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);

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
    logger.error('Get current user error', { error: err.message });
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
    logger.error('Update eligibility error', { error: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// Global error handler to avoid leaking stack traces in production
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message });
  const status = err.status || 500;
  const response = { message: 'Internal server error' };
  if (!isProduction) {
    response.error = err.message;
  }
  res.status(status).json(response);
});

// Start server with graceful shutdown
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));

const gracefulShutdown = () => {
  logger.info('Received shutdown signal, closing server...');
  server.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });

  setTimeout(() => {
    logger.warn('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
