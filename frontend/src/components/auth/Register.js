import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import { Row, Col, Button, Alert } from 'react-bootstrap';

// Validation schema
const RegisterSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
  department: Yup.string()
    .required('Department is required'),
  semester: Yup.number()
    .required('Semester is required')
    .min(1, 'Semester must be at least 1')
    .max(8, 'Semester cannot be more than 8'),
});

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [registerError, setRegisterError] = useState('');

  const departments = [
    'Computer Science',
    'Information Technology',
    'Electronics',
    'Mechanical',
    'Civil',
    'Electrical',
    'Chemical',
  ];

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setRegisterError('');
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...userData } = values;
      
      // Add default role as student
      userData.role = 'student';
      userData.duesCleared = true; // Default value, can be changed by admin later
      
      await register(userData);
      navigate('/student/dashboard');
    } catch (error) {
      setRegisterError(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div
        className="auth-bg"
        style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/kg_bg.PNG)` }}
      />
      <div className="auth-orbs" aria-hidden="true">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
      </div>

      <div className="auth-card glass fade-in-up">
        <div className="left">
          <div className="page-title mb-1">Create your student account</div>
          <div className="mb-4" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Fill in your details to access the portal.
          </div>

          {registerError && <Alert variant="danger">{registerError}</Alert>}

          <Formik
            initialValues={{
              name: '',
              email: '',
              password: '',
              confirmPassword: '',
              department: '',
              semester: '',
            }}
            validationSchema={RegisterSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form>
                <Row>
                  <Col md={6}>
                    <div className="mb-3">
                      <label htmlFor="name" className="form-label">
                        Full Name
                      </label>
                      <Field
                        type="text"
                        name="name"
                        className="form-control"
                        placeholder="Your full name"
                        autoComplete="name"
                      />
                      <ErrorMessage
                        name="name"
                        component="div"
                        className="text-danger mt-1"
                      />
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label">
                        Email
                      </label>
                      <Field
                        type="email"
                        name="email"
                        className="form-control"
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                      <ErrorMessage
                        name="email"
                        component="div"
                        className="text-danger mt-1"
                      />
                    </div>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <div className="mb-3">
                      <label htmlFor="password" className="form-label">
                        Password
                      </label>
                      <Field
                        type="password"
                        name="password"
                        className="form-control"
                        placeholder="Create a password"
                        autoComplete="new-password"
                      />
                      <ErrorMessage
                        name="password"
                        component="div"
                        className="text-danger mt-1"
                      />
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="mb-3">
                      <label htmlFor="confirmPassword" className="form-label">
                        Confirm Password
                      </label>
                      <Field
                        type="password"
                        name="confirmPassword"
                        className="form-control"
                        placeholder="Re-enter password"
                        autoComplete="new-password"
                      />
                      <ErrorMessage
                        name="confirmPassword"
                        component="div"
                        className="text-danger mt-1"
                      />
                    </div>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <div className="mb-3">
                      <label htmlFor="department" className="form-label">
                        Department
                      </label>
                      <Field as="select" name="department" className="form-select">
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage
                        name="department"
                        component="div"
                        className="text-danger mt-1"
                      />
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="mb-3">
                      <label htmlFor="semester" className="form-label">
                        Semester
                      </label>
                      <Field
                        type="number"
                        name="semester"
                        className="form-control"
                        placeholder="1 - 8"
                        min="1"
                        max="8"
                      />
                      <ErrorMessage
                        name="semester"
                        component="div"
                        className="text-danger mt-1"
                      />
                    </div>
                  </Col>
                </Row>

                <Button
                  type="submit"
                  className="btn-brand w-100 mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating account...' : 'Create account'}
                </Button>
              </Form>
            )}
          </Formik>
        </div>

        <div className="right">
          <div className="page-title mb-2">Already have an account?</div>
          <div style={{ color: 'rgba(255,255,255,0.70)' }}>
            Go back to the login page to continue.
          </div>
          <div className="mt-3">
            <Link to="/login" className="btn btn-outline-light w-100">
              Back to Login
            </Link>
          </div>
          <div className="mt-4 glass-2 p-3">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Note</div>
            <div style={{ color: 'rgba(255,255,255,0.70)' }}>
              Registration is for students only. Admin access is managed separately.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;