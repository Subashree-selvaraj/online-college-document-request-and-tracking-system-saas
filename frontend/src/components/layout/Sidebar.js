import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  // If user is not logged in, don't render sidebar
  if (!user) return null;

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  // Determine user role from user object or URL path
  const userRole = user?.role || (
    location.pathname.includes('/student/') ? 'student' :
    location.pathname.includes('/admin/') ? 'admin' :
    location.pathname.includes('/principal/') ? 'principal' :
    location.pathname.includes('/hod/') ? 'hod' :
    null
  );
  const isUserStudent = userRole === 'student' || location.pathname.startsWith('/student');
  const isUserAdmin = userRole === 'admin' || location.pathname.startsWith('/admin');
  const isUserPrincipal = userRole === 'principal' || location.pathname.startsWith('/principal');
  const isUserHod = userRole === 'hod' || location.pathname.startsWith('/hod');

  return (
    <div className="sidepanel glass">
      <div className="d-flex flex-column">
        <div className="sidebar-header mb-3">
          <div className="small text-uppercase" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em' }}>
            Navigation
          </div>
        </div>

        <ul className="nav nav-pills flex-column mb-auto">
          {isUserStudent && (
            <>
              <li className="nav-item">
                <Link
                  to="/student/dashboard"
                  className={`nav-link ${isActive('/student/dashboard')}`}
                >
                  <i className="bi bi-speedometer2 me-2"></i>
                  Dashboard
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  to="/student/new-request"
                  className={`nav-link ${isActive('/student/new-request')}`}
                >
                  <i className="bi bi-file-earmark-plus me-2"></i>
                  New Request
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  to="/student/dashboard"
                  className={`nav-link ${isActive('/student/dashboard')}`}
                >
                  <i className="bi bi-list-check me-2"></i>
                  My Requests
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  to="/student/profile"
                  className={`nav-link ${isActive('/student/profile')}`}
                >
                  <i className="bi bi-person me-2"></i>
                  Profile
                </Link>
              </li>
            </>
          )}

          {isUserAdmin && (
            <>
              <li className="nav-item">
                <Link
                  to="/admin/dashboard"
                  className={`nav-link ${isActive('/admin/dashboard')}`}
                >
                  <i className="bi bi-speedometer2 me-2"></i>
                  Dashboard
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  to="/admin/requests"
                  className={`nav-link ${isActive('/admin/requests')}`}
                >
                  <i className="bi bi-file-earmark-text me-2"></i>
                  Manage Requests
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  to="/admin/users"
                  className={`nav-link ${isActive('/admin/users')}`}
                >
                  <i className="bi bi-people me-2"></i>
                  Manage Users
                </Link>
              </li>
            </>
          )}

          {isUserPrincipal && (
            <>
              <li className="nav-item">
                <Link
                  to="/principal/dashboard"
                  className={`nav-link ${isActive('/principal/dashboard')}`}
                >
                  <i className="bi bi-shield-check me-2"></i>
                  Principal Dashboard
                </Link>
              </li>
            </>
          )}
          
          {isUserHod && (
            <>
              <li className="nav-item">
                <Link
                  to="/hod/dashboard"
                  className={`nav-link ${isActive('/hod/dashboard')}`}
                >
                  <i className="bi bi-mortarboard me-2"></i>
                  HOD Dashboard
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;