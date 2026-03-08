const INSTANT_DOCUMENTS = [
  'Fee Receipt / Dues Clearance Certificate',
  'Attendance Certificate',
  'Study Certificate',
  'Enrollment Verification Letter'
];

const DEPARTMENT_DOCUMENTS = [
  'Bonafide Certificate',
  'Course Completion Certificate',
  'Letter of Recommendation (LOR)',
  'Internship / Industrial Training Certificate',
  'Medium of Instruction Certificate',
  'Character Certificate'
];

const OFFICIAL_DOCUMENTS = [
  'Transcript',
  'Degree Certificate',
  'Consolidated Marksheet',
  'Transfer Certificate (TC)',
  'Migration Certificate',
  'No Objection Certificate (NOC)'
];

const CATEGORIES = {
  INSTANT: 'instant',
  DEPARTMENT: 'department',
  OFFICIAL: 'official'
};

function getApprovalCategory(documentType) {
  if (INSTANT_DOCUMENTS.includes(documentType)) {
    return CATEGORIES.INSTANT;
  }
  if (DEPARTMENT_DOCUMENTS.includes(documentType)) {
    return CATEGORIES.DEPARTMENT;
  }
  if (OFFICIAL_DOCUMENTS.includes(documentType)) {
    return CATEGORIES.OFFICIAL;
  }
  // Default: treat unknown types as department-level
  return CATEGORIES.DEPARTMENT;
}

function getExpectedDays(category) {
  switch (category) {
    case CATEGORIES.INSTANT:
      return 1;
    case CATEGORIES.DEPARTMENT:
      return 3;
    case CATEGORIES.OFFICIAL:
      return 5;
    default:
      return 3;
  }
}

function calculateExpectedCompletionDate(category) {
  const days = getExpectedDays(category);
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function requiresHod(category) {
  return category === CATEGORIES.DEPARTMENT || category === CATEGORIES.OFFICIAL;
}

function requiresPrincipal(category) {
  return category === CATEGORIES.OFFICIAL;
}

module.exports = {
  INSTANT_DOCUMENTS,
  DEPARTMENT_DOCUMENTS,
  OFFICIAL_DOCUMENTS,
  CATEGORIES,
  getApprovalCategory,
  calculateExpectedCompletionDate,
  requiresHod,
  requiresPrincipal
};

