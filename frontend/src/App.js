import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

// Layout Component
import Layout from './components/layout/Layout';

// Auth Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// Protected route component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="text-center p-5">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && user.role !== requiredRole) {
    let fallbackPath = '/student/dashboard';
    if (user.role === 'admin') {
      fallbackPath = '/admin/dashboard';
    } else if (user.role === 'principal') {
      fallbackPath = '/principal/dashboard';
    } else if (user.role === 'hod') {
      fallbackPath = '/hod/dashboard';
    }
    return <Navigate to={fallbackPath} replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            
            {/* Student Routes */}
            <Route 
              path="/student/dashboard" 
              element={
                <ProtectedRoute requiredRole="student">
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {React.createElement(React.lazy(() => import('./pages/student/Dashboard')))}
                  </React.Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/new-request" 
              element={
                <ProtectedRoute requiredRole="student">
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {React.createElement(React.lazy(() => import('./pages/student/NewRequest')))}
                  </React.Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/requests/:requestId" 
              element={
                <ProtectedRoute requiredRole="student">
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {React.createElement(React.lazy(() => import('./pages/student/RequestDetails')))}
                  </React.Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/profile" 
              element={
                <ProtectedRoute requiredRole="student">
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {React.createElement(React.lazy(() => import('./pages/student/Profile')))}
                  </React.Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Routes */}
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {React.createElement(React.lazy(() => import('./pages/admin/Dashboard')))}
                  </React.Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/requests" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {React.createElement(React.lazy(() => import('./pages/admin/RequestManagement')))}
                  </React.Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {React.createElement(React.lazy(() => import('./pages/admin/UserManagement')))}
                  </React.Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/document-types" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {React.createElement(React.lazy(() => import('./pages/admin/DocumentTypeManagement')))}
                  </React.Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Principal Routes */}
            <Route 
              path="/principal/dashboard" 
              element={
                <ProtectedRoute requiredRole="principal">
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {React.createElement(React.lazy(() => import('./pages/principal/Dashboard')))}
                  </React.Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* HOD Routes */}
            <Route 
              path="/hod/dashboard" 
              element={
                <ProtectedRoute requiredRole="hod">
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {React.createElement(React.lazy(() => import('./pages/hod/Dashboard')))}
                  </React.Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* 404 Route */}
            <Route path="*" element={<div className="text-center p-5">Page Not Found</div>} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
