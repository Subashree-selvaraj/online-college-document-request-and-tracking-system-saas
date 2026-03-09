import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import { Button, Alert } from 'react-bootstrap';

// Validation schema
const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setLoginError('');
      // Add the selected role to the login credentials
      const loginData = { ...values, role: selectedRole };
      const user = await login(loginData);
      
      // Redirect based on user role
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'principal') {
        navigate('/principal/dashboard');
      } else if (user.role === 'hod') {
        navigate('/hod/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // For development purposes, create a mock login if the backend is not fully implemented
      if (process.env.NODE_ENV === 'development') {
        console.log('Using mock login for development');
        
        // Create a mock token with user data
        const mockUser = {
          _id: '123456',
          name: values.email.split('@')[0],
          email: values.email,
          role: selectedRole
        };
        
        // Create a mock token that expires in 1 day
        const mockToken = btoa(JSON.stringify({
          ...mockUser,
          exp: Math.floor(Date.now() / 1000) + 86400
        }));
        
        // Save the mock token
        localStorage.setItem('token', mockToken);
        
        // Redirect based on role
        if (selectedRole === 'admin') {
          navigate('/admin/dashboard');
        } else if (selectedRole === 'principal') {
          navigate('/principal/dashboard');
        } else if (selectedRole === 'hod') {
          navigate('/hod/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      } else {
        setLoginError(error.response?.data?.message || 'Login failed. Please try again.');
      }
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

      <div className="login-card fade-in-up">
        <div className="login-card-inner">
          <h1 className="login-logo">CampusLedger</h1>
          <p className="login-tagline">Sign in to your account</p>

          <div className="login-role" role="tablist" aria-label="Login as">
            <button
              type="button"
              className={`login-role-btn ${selectedRole === 'student' ? 'active' : ''}`}
              onClick={() => setSelectedRole('student')}
            >
              Student
            </button>
            <button
              type="button"
              className={`login-role-btn ${selectedRole === 'admin' ? 'active' : ''}`}
              onClick={() => setSelectedRole('admin')}
            >
              Admin
            </button>
            <button
              type="button"
              className={`login-role-btn ${selectedRole === 'principal' ? 'active' : ''}`}
              onClick={() => setSelectedRole('principal')}
            >
              Principal
            </button>
            <button
              type="button"
              className={`login-role-btn ${selectedRole === 'hod' ? 'active' : ''}`}
              onClick={() => setSelectedRole('hod')}
            >
              HOD
            </button>
          </div>

          {loginError && (
            <Alert variant="danger" className="login-alert">{loginError}</Alert>
          )}

          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={LoginSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="login-form">
                <div className="mb-3">
                  <label htmlFor="login-email" className="form-label">Email</label>
                  <Field
                    id="login-email"
                    type="email"
                    name="email"
                    className="form-control"
                    placeholder="Enter your email"
                    autoComplete="username"
                  />
                  <ErrorMessage name="email" component="div" className="text-danger small mt-1" />
                </div>
                <div className="mb-3">
                  <label htmlFor="login-password" className="form-label">Password</label>
                  <Field
                    id="login-password"
                    type="password"
                    name="password"
                    className="form-control"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <ErrorMessage name="password" component="div" className="text-danger small mt-1" />
                </div>
                <Button
                  type="submit"
                  className="btn btn-primary w-100 login-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                </Button>
              </Form>
            )}
          </Formik>

          <p className="login-help">Need access? Contact your campus admin.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;