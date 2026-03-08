const mongoose = require('mongoose');
const Document = require('../models/Document');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Common document request types in colleges
const documents = [
  // Academic Certificates
  {
    name: 'Transcript',
    description: 'Official academic record showing courses taken, grades received, and credits earned.',
    category: 'Academic Certificates',
    requiresPrincipalApproval: true,
    requiredFields: [
      {
        name: 'reason',
        label: 'Purpose of Request',
        type: 'text',
        required: true
      },
      {
        name: 'numberOfCopies',
        label: 'Number of Copies',
        type: 'number',
        required: true
      },
      {
        name: 'hallTicketNumbers',
        label: 'Hall Ticket Number(s)',
        type: 'text',
        required: true
      },
      {
        name: 'batch',
        label: 'Batch (From–To)',
        type: 'text',
        required: true
      },
      {
        name: 'universityName',
        label: 'University Name',
        type: 'text',
        required: true
      },
      {
        name: 'destinationInstitute',
        label: 'Destination Institute/Organization',
        type: 'text',
        required: true
      },
      {
        name: 'requiredDate',
        label: 'Required By Date',
        type: 'date',
        required: true
      },
      {
        name: 'deliveryMode',
        label: 'Delivery Mode',
        type: 'select',
        options: ['Hard Copy', 'Soft Copy (PDF)'],
        required: true
      },
      {
        name: 'address',
        label: 'Postal Address (if Hard Copy)',
        type: 'textarea',
        required: false
      },
      {
        name: 'idProof',
        label: 'Upload ID Proof',
        type: 'file',
        required: false
      }
    ],
    eligibilityRules: ['duesCleared']
  },
  {
    name: 'Degree Certificate',
    description: 'Official document certifying the completion of a degree program.',
    category: 'Academic Certificates',
    requiresPrincipalApproval: true,
    requiredFields: [
      {
        name: 'reason',
        label: 'Purpose of Request',
        type: 'text',
        required: true
      },
      {
        name: 'numberOfCopies',
        label: 'Number of Copies',
        type: 'number',
        required: true
      },
      {
        name: 'degreeCompleted',
        label: 'Degree Completed (UG / PG)',
        type: 'select',
        options: ['Undergraduate', 'Postgraduate', 'Doctorate'],
        required: true
      },
      {
        name: 'yearOfCompletion',
        label: 'Year of Completion',
        type: 'number',
        required: true
      },
      {
        name: 'convocationApplied',
        label: 'Convocation Applied',
        type: 'select',
        options: ['Yes', 'No'],
        required: true
      },
      {
        name: 'destinationInstitute',
        label: 'Destination Institute/Organization',
        type: 'text',
        required: true
      },
      {
        name: 'requiredDate',
        label: 'Required By Date',
        type: 'date',
        required: true
      },
      {
        name: 'deliveryMode',
        label: 'Delivery Mode',
        type: 'select',
        options: ['Hard Copy', 'Soft Copy (PDF)'],
        required: true
      },
      {
        name: 'address',
        label: 'Postal Address (if Hard Copy)',
        type: 'textarea',
        required: false
      },
      {
        name: 'idProof',
        label: 'Upload ID Proof',
        type: 'file',
        required: false
      }
    ],
    eligibilityRules: ['duesCleared', 'semester >= 8']
  },
  {
    name: 'Consolidated Marksheet',
    description: 'Complete record of all semester marks consolidated into a single document.',
    category: 'Academic Certificates',
    requiresPrincipalApproval: true,
    requiredFields: [
      {
        name: 'reason',
        label: 'Purpose of Request',
        type: 'text',
        required: true
      },
      {
        name: 'numberOfCopies',
        label: 'Number of Copies',
        type: 'number',
        required: true
      },
      {
        name: 'hallTicketNumbers',
        label: 'Hall Ticket Number(s)',
        type: 'text',
        required: true
      },
      {
        name: 'batch',
        label: 'Batch (From–To)',
        type: 'text',
        required: true
      },
      {
        name: 'destinationInstitute',
        label: 'Destination Institute/Organization',
        type: 'text',
        required: true
      },
      {
        name: 'requiredDate',
        label: 'Required By Date',
        type: 'date',
        required: true
      },
      {
        name: 'deliveryMode',
        label: 'Delivery Mode',
        type: 'select',
        options: ['Hard Copy', 'Soft Copy (PDF)'],
        required: true
      },
      {
        name: 'address',
        label: 'Postal Address (if Hard Copy)',
        type: 'textarea',
        required: false
      }
    ],
    eligibilityRules: ['duesCleared']
  },
  {
    name: 'Course Completion Certificate',
    description: 'Certificate confirming the completion of a specific course or program.',
    category: 'Academic Certificates',
    requiresPrincipalApproval: true,
    requiredFields: [
      {
        name: 'reason',
        label: 'Purpose of Request',
        type: 'text',
        required: true
      },
      {
        name: 'numberOfCopies',
        label: 'Number of Copies',
        type: 'number',
        required: true
      },
      {
        name: 'courseName',
        label: 'Course Name',
        type: 'text',
        required: true
      },
      {
        name: 'yearOfCompletion',
        label: 'Year of Completion',
        type: 'number',
        required: true
      },
      {
        name: 'destinationInstitute',
        label: 'Destination Institute/Organization',
        type: 'text',
        required: true
      },
      {
        name: 'requiredDate',
        label: 'Required By Date',
        type: 'date',
        required: true
      },
      {
        name: 'deliveryMode',
        label: 'Delivery Mode',
        type: 'select',
        options: ['Hard Copy', 'Soft Copy (PDF)'],
        required: true
      },
      {
        name: 'address',
        label: 'Postal Address (if Hard Copy)',
        type: 'textarea',
        required: false
      }
    ],
    eligibilityRules: ['duesCleared', 'semester >= 8']
  },
  {
    name: 'Enrollment Verification Letter',
    description: 'Document confirming current enrollment status at the institution.',
    category: 'Academic Certificates',
    requiresPrincipalApproval: true,
    requiredFields: [
      {
        name: 'reason',
        label: 'Purpose of Request',
        type: 'text',
        required: true
      },
      {
        name: 'numberOfCopies',
        label: 'Number of Copies',
        type: 'number',
        required: true
      },
      {
        name: 'verifyingInstitution',
        label: 'Name of Verifying Institution/Company',
        type: 'text',
        required: true
      },
      {
        name: 'verifierEmail',
        label: 'Email of Verifier (if applicable)',
        type: 'text',
        required: false
      },
      {
        name: 'studentConsent',
        label: 'I consent to share my enrollment information with the verifier',
        type: 'checkbox',
        required: true
      },
      {
        name: 'destinationInstitute',
        label: 'Destination Institute/Organization',
        type: 'text',
        required: true
      },
      {
        name: 'requiredDate',
        label: 'Required By Date',
        type: 'date',
        required: true
      },
      {
        name: 'deliveryMode',
        label: 'Delivery Mode',
        type: 'select',
        options: ['Hard Copy', 'Soft Copy (PDF)'],
        required: true
      },
      {
        name: 'address',
        label: 'Postal Address (if Hard Copy)',
        type: 'textarea',
        required: false
      }
    ],
    eligibilityRules: ['duesCleared']
  },
  {
    name: 'Letter of Recommendation (LOR)',
    description: 'Letter from faculty or staff recommending a student for employment, scholarships, or further education.',
    category: 'Recommendation / Other Requests',
    requiresPrincipalApproval: true,
    requiredFields: [
      {
        name: 'reason',
        label: 'Purpose of Request',
        type: 'text',
        required: true
      },
      {
        name: 'facultyName',
        label: 'Faculty Name',
        type: 'select',
        options: ['Dr. Smith', 'Dr. Johnson', 'Prof. Williams', 'Prof. Brown'],
        required: true
      },
      {
        name: 'purpose',
        label: 'Purpose',
        type: 'select',
        options: ['Higher Studies', 'Job'],
        required: true
      },
      {
        name: 'programApplied',
        label: 'Program Applied For',
        type: 'text',
        required: true
      },
      {
        name: 'deadlineDate',
        label: 'Deadline Date (if any)',
        type: 'date',
        required: false
      },
      {
        name: 'destinationInstitute',
        label: 'Destination Institute/Organization',
        type: 'text',
        required: true
      },
      {
        name: 'requiredDate',
        label: 'Required By Date',
        type: 'date',
        required: true
      },
      {
        name: 'deliveryMode',
        label: 'Delivery Mode',
        type: 'select',
        options: ['Hard Copy', 'Soft Copy (PDF)', 'Direct Email to Institution'],
        required: true
      },
      {
        name: 'address',
        label: 'Postal Address (if Hard Copy)',
        type: 'textarea',
        required: false
      }
    ],
    eligibilityRules: ['duesCleared', 'semester >= 4']
  },
  {
    name: 'Transfer Certificate (TC)',
    description: 'Document issued when a student transfers from one institution to another.',
    category: 'Transfer / Study Related',
    requiresPrincipalApproval: true,
    requiredFields: [
      {
        name: 'reason',
        label: 'Reason for Leaving',
        type: 'text',
        required: true
      },
      {
        name: 'lastSemester',
        label: 'Last Semester Attended',
        type: 'number',
        required: true
      },
      {
        name: 'dateOfLeaving',
        label: 'Date of Leaving',
        type: 'date',
        required: true
      },
      {
        name: 'destinationInstitute',
        label: 'New Institution (if known)',
        type: 'text',
        required: false
      },
      {
        name: 'requiredDate',
        label: 'Required By Date',
        type: 'date',
        required: true
      },
      {
        name: 'deliveryMode',
        label: 'Delivery Mode',
        type: 'select',
        options: ['Hard Copy', 'Soft Copy (PDF)'],
        required: true
      },
      {
        name: 'address',
        label: 'Postal Address (if Hard Copy)',
        type: 'textarea',
        required: false
      }
    ],
    eligibilityRules: ['duesCleared']
  },
  {
    name: 'Bonafide Certificate',
    description: 'Certificate confirming that a student is genuinely enrolled at the institution.',
    category: 'Transfer / Study Related',
    requiresPrincipalApproval: true,
    requiredFields: [
      {
        name: 'reason',
        label: 'Purpose',
        type: 'select',
        options: ['Scholarship', 'Address Proof', 'Bank Account', 'Other'],
        required: true
      },
      {
        name: 'academicYear',
        label: 'Academic Year / Semester',
        type: 'text',
        required: true
      },
      {
        name: 'otherPurpose',
        label: 'Other Purpose (if selected)',
        type: 'text',
        required: false
      },
      {
        name: 'numberOfCopies',
        label: 'Number of Copies',
        type: 'number',
        required: true
      },
      {
        name: 'requiredDate',
        label: 'Required By Date',
        type: 'date',
        required: true
      },
      {
        name: 'deliveryMode',
        label: 'Delivery Mode',
        type: 'select',
        options: ['Hard Copy', 'Soft Copy (PDF)'],
        required: true
      },
      {
        name: 'address',
        label: 'Postal Address (if Hard Copy)',
        type: 'textarea',
        required: false
      }
    ],
    eligibilityRules: ['duesCleared']
  },
  {
    name: 'Migration Certificate',
    description: 'Certificate issued when a student migrates from one university to another.',
    category: 'Transfer / Study Related',
    requiresPrincipalApproval: true,
    requiredFields: [
      {
        name: 'universityMigratedTo',
        label: 'University Migrated To',
        type: 'text',
        required: true
      },
      {
        name: 'reason',
        label: 'Reason for Migration',
        type: 'text',
        required: true
      },
      {
        name: 'yearOfPassing',
        label: 'Year of Passing',
        type: 'number',
        required: true
      },
      {
        name: 'numberOfCopies',
        label: 'Number of Copies',
        type: 'number',
        required: true
      },
      {
        name: 'requiredDate',
        label: 'Required By Date',
        type: 'date',
        required: true
      },
      {
        name: 'deliveryMode',
        label: 'Delivery Mode',
        type: 'select',
        options: ['Hard Copy', 'Soft Copy (PDF)'],
        required: true
      },
      {
        name: 'address',
        label: 'Postal Address (if Hard Copy)',
        type: 'textarea',
        required: false
      }
    ],
    eligibilityRules: ['duesCleared', 'degreeCompleted']
  },
  {
    name: 'Migration Certificate',
    description: 'Document required when a student migrates from one university to another.',
    requiredFields: [
      {
        name: 'reason',
        label: 'Purpose of Request',
        type: 'text',
        required: true
      },
      {
        name: 'destinationInstitute',
        label: 'Destination University',
        type: 'text',
        required: true
      },
      {
        name: 'requiredDate',
        label: 'Required By Date',
        type: 'date',
        required: true
      }
    ]
  },
  {
    name: 'Character Certificate',
    description: 'Certificate attesting to the character and conduct of a student during their time at the institution.',
    category: 'Transfer / Study Related',
    requiresPrincipalApproval: true,
    requiredFields: [
      {
        name: 'periodOfStudy',
        label: 'Period of Study (From - To)',
        type: 'text',
        required: true
      },
      {
        name: 'purpose',
        label: 'Purpose',
        type: 'select',
        options: ['Higher Studies', 'Employment', 'Other'],
        required: true
      },
      {
        name: 'conductDescription',
        label: 'Conduct Description',
        type: 'select',
        options: ['Good', 'Very Good', 'Excellent'],
        required: true
      },
      {
        name: 'numberOfCopies',
        label: 'Number of Copies',
        type: 'number',
        required: true
      },
      {
        name: 'requiredDate',
        label: 'Required By Date',
        type: 'date',
        required: true
      },
      {
        name: 'deliveryMode',
        label: 'Delivery Mode',
        type: 'select',
        options: ['Hard Copy', 'Soft Copy (PDF)'],
        required: true
      },
      {
        name: 'address',
        label: 'Postal Address (if Hard Copy)',
        type: 'textarea',
        required: false
      }
    ],
    eligibilityRules: ['duesCleared']
  },
  {
    name: 'Study Certificate',
    description: 'Certificate confirming that a student is studying or has studied at the institution.',
    category: 'Transfer / Study Related',
    requiresPrincipalApproval: true,
    requiredFields: [
      {
        name: 'reason',
        label: 'Purpose',
        type: 'select',
        options: ['Scholarship', 'Address Proof', 'Bank Account', 'Other'],
        required: true
      },
      {
        name: 'academicYear',
        label: 'Academic Year / Semester',
        type: 'text',
        required: true
      },
      {
        name: 'otherPurpose',
        label: 'Other Purpose (if selected)',
        type: 'text',
        required: false
      },
      {
        name: 'numberOfCopies',
        label: 'Number of Copies',
        type: 'number',
        required: true
      },
      {
        name: 'requiredDate',
        label: 'Required By Date',
        type: 'date',
        required: true
      },
      {
        name: 'deliveryMode',
        label: 'Delivery Mode',
        type: 'select',
        options: ['Hard Copy', 'Soft Copy (PDF)'],
        required: true
      },
      {
        name: 'address',
        label: 'Postal Address (if Hard Copy)',
        type: 'textarea',
        required: false
      }
    ],
    eligibilityRules: ['duesCleared']
  },
  {
    name: 'Internship / Industrial Training Certificate',
    description: 'Certificate confirming completion of internship or industrial training.',
    category: 'Recommendation / Other Requests',
    requiresPrincipalApproval: true,
    requiredFields: [
      {
        name: 'organizationName',
        label: 'Organization Name',
        type: 'text',
        required: true
      },
      {
        name: 'trainingDuration',
        label: 'Duration of Training',
        type: 'text',
        required: true
      },
      {
        name: 'departmentApproval',
        label: 'Department Approval Required?',
        type: 'checkbox',
        required: false
      },
      {
        name: 'requiredDate',
        label: 'Required By Date',
        type: 'date',
        required: true
      },
      {
        name: 'deliveryMode',
        label: 'Delivery Mode',
        type: 'select',
        options: ['Hard Copy', 'Soft Copy (PDF)'],
        required: true
      },
      {
        name: 'address',
        label: 'Postal Address (if Hard Copy)',
        type: 'textarea',
        required: false
      }
    ],
    eligibilityRules: ['duesCleared']
  },
  {
    name: 'No Objection Certificate (NOC)',
    description: 'Certificate stating that the institution has no objection to the student participating in an activity or program.',
    category: 'Recommendation / Other Requests',
    requiresPrincipalApproval: true,
    requiredFields: [
      {
        name: 'organizationName',
        label: 'Organization Name',
        type: 'text',
        required: true
      },
      {
        name: 'purpose',
        label: 'Purpose',
        type: 'text',
        required: true
      },
      {
        name: 'departmentApproval',
        label: 'Department Approval Required?',
        type: 'checkbox',
        required: false
      },
      {
        name: 'requiredDate',
        label: 'Required By Date',
        type: 'date',
        required: true
      },
      {
        name: 'deliveryMode',
        label: 'Delivery Mode',
        type: 'select',
        options: ['Hard Copy', 'Soft Copy (PDF)'],
        required: true
      },
      {
        name: 'address',
        label: 'Postal Address (if Hard Copy)',
        type: 'textarea',
        required: false
      }
    ],
    eligibilityRules: ['duesCleared']
  },
  {
    name: 'Fee Receipt / Dues Clearance Certificate',
    description: 'Certificate confirming that a student has paid all fees and has no outstanding dues.',
    category: 'Recommendation / Other Requests',
    requiresPrincipalApproval: true,
    requiredFields: [
      {
        name: 'purpose',
        label: 'Purpose',
        type: 'text',
        required: true
      },
      {
        name: 'academicYear',
        label: 'Academic Year',
        type: 'text',
        required: true
      },
      {
        name: 'requiredDate',
        label: 'Required By Date',
        type: 'date',
        required: true
      },
      {
        name: 'deliveryMode',
        label: 'Delivery Mode',
        type: 'select',
        options: ['Hard Copy', 'Soft Copy (PDF)'],
        required: true
      },
      {
        name: 'address',
        label: 'Postal Address (if Hard Copy)',
        type: 'textarea',
        required: false
      }
    ],
    eligibilityRules: ['duesCleared']
  },
  {
    name: 'Medium of Instruction Certificate',
    description: 'Certificate confirming the language of instruction for a course or program.',
    category: 'Recommendation / Other Requests',
    requiresPrincipalApproval: true,
    requiredFields: [
      {
        name: 'courseName',
        label: 'Course Name',
        type: 'text',
        required: true
      },
      {
        name: 'duration',
        label: 'Duration',
        type: 'text',
        required: true
      },
      {
        name: 'language',
        label: 'Language of Instruction',
        type: 'select',
        options: ['English', 'Tamil'],
        required: true
      },
      {
        name: 'requiredDate',
        label: 'Required By Date',
        type: 'date',
        required: true
      },
      {
        name: 'deliveryMode',
        label: 'Delivery Mode',
        type: 'select',
        options: ['Hard Copy', 'Soft Copy (PDF)'],
        required: true
      },
      {
        name: 'address',
        label: 'Postal Address (if Hard Copy)',
        type: 'textarea',
        required: false
      }
    ],
    eligibilityRules: ['duesCleared']
  },
  {
    name: 'Attendance Certificate',
    description: 'Certificate confirming a student\'s attendance record.',
    category: 'Recommendation / Other Requests',
    requiresPrincipalApproval: true,
    requiredFields: [
      {
        name: 'purpose',
        label: 'Purpose',
        type: 'text',
        required: true
      },
      {
        name: 'periodOfAttendance',
        label: 'Period of Attendance',
        type: 'text',
        required: true
      },
      {
        name: 'requiredDate',
        label: 'Required By Date',
        type: 'date',
        required: true
      },
      {
        name: 'deliveryMode',
        label: 'Delivery Mode',
        type: 'select',
        options: ['Hard Copy', 'Soft Copy (PDF)'],
        required: true
      },
      {
        name: 'address',
        label: 'Postal Address (if Hard Copy)',
        type: 'textarea',
        required: false
      }
    ],
    eligibilityRules: ['duesCleared']
  }
];

// Seed the documents
const seedDB = async () => {
  try {
    // Clear existing documents
    await Document.deleteMany({});
    
    // Insert new documents
    await Document.insertMany(documents);
    
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
};

seedDB();