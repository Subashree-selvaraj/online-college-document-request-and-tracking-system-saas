const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/college-portal')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

// Dummy users data
const dummyUsers = [
  {
    name: 'Admin Academic',
    email: 'adminacademic@college.edu',
    password: 'admin123',
    role: 'admin',
    handledDocumentTypes: [
      'Transcript',
      'Degree Certificate',
      'Consolidated Marksheet',
      'Course Completion Certificate',
      'Bonafide Certificate',
      'Letter of Recommendation (LOR)',
      'Study Certificate',
      'Enrollment Verification Letter',
      'Medium of Instruction Certificate',
      'Character Certificate',
      'Attendance Certificate'
    ]
  },
  {
    name: 'Admin Accounts',
    email: 'adminaccounts@college.edu',
    password: 'admin123',
    role: 'admin',
    handledDocumentTypes: [
      'Fee Receipt / Dues Clearance Certificate'
    ]
  },
  {
    name: 'Principal User',
    email: 'principal@college.edu',
    password: 'principal123',
    role: 'principal',
    title: 'Principal',
    signatureUrl: ''
  },
  {
    name: 'HOD CSE',
    email: 'hodcse@college.edu',
    password: 'hod123',
    role: 'hod',
    department: 'Computer Science',
    title: 'HOD - CSE',
    signatureUrl: ''
  },
  {
    name: 'HOD IT',
    email: 'hodit@college.edu',
    password: 'hod123',
    role: 'hod',
    department: 'Information Technology',
    title: 'HOD - IT',
    signatureUrl: ''
  },
  {
    name: 'Subashree S',
    email: 'subashree_23it52@kgkite.ac.in',
    password: 'student123pass',
    role: 'student',
    department: 'Computer Science',
    semester: 3,
    duesCleared: true
  },
  {
    name: 'Student Two',
    email: 'student2@college.edu',
    password: 'student123',
    role: 'student',
    department: 'Information Technology',
    semester: 5,
    duesCleared: true
  },
  {
    name: 'Student Three',
    email: 'student3@college.edu',
    password: 'student123',
    role: 'student',
    department: 'Electronics',
    semester: 7,
    duesCleared: false
  }
];

// Function to seed users
const seedUsers = async () => {
  try {
    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Create new users
    for (const userData of dummyUsers) {
      // Create a new user instance
      const user = new User(userData);
      
      // Save the user (password will be hashed by the pre-save hook)
      await user.save();
      console.log(`Created user: ${userData.name} (${userData.role})`);
    }

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seedUsers();