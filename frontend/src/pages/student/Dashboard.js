import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { requestsAPI } from '../../api';
import { Alert } from 'react-bootstrap';

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [recentRequests, setRecentRequests] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Check for success message in location state (from redirect)
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      // Clear the success message after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  // Define fetchDashboardData with useCallback to prevent infinite loops
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user exists and has an id property
      if (!user) {
        setError('User information not available. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Use user.id if _id is not available
      const userId = user._id || user.id;
      
      if (!userId) {
        console.error('User ID not available:', user);
        setError('User ID not available. Please log in again.');
        setLoading(false);
        return;
      }
      
      console.log('Fetching dashboard data for user ID:', userId);
      
      // Fetch student requests from the API
      const response = await requestsAPI.getStudentRequests(userId);
      const requests = response.data;
      
      // Calculate stats
      const calculatedStats = {
        total: requests.length,
        pending: requests.filter(req => req.status === 'Pending').length,
        approved: requests.filter(req => req.status === 'Approved').length,
        completed: requests.filter(req => req.status === 'Completed').length,
        rejected: requests.filter(req => req.status === 'Rejected').length,
      };
      
      setRecentRequests(requests);
      setStats(calculatedStats);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchDashboardData();
      
      // Set up polling for real-time updates (every 30 seconds)
      const pollingInterval = setInterval(() => {
        fetchDashboardData();
      }, 30000);
      
      // Clean up interval on component unmount
      return () => clearInterval(pollingInterval);
    }
  }, [user, fetchDashboardData]);

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Pending':
        return 'warning';
      case 'Approved':
        return 'info';
      case 'Completed':
        return 'success';
      case 'Rejected':
        return 'danger';
      default:
        return 'secondary';
    }
  };
  
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-warning';
      case 'Approved':
        return 'bg-info';
      case 'Completed':
        return 'bg-success';
      case 'Rejected':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  };

  const renderProgressTracker = (request) => {
    const stage = request.approvalStage || 'submitted';

    const steps = [
      { key: 'submitted', label: 'Submitted' },
      { key: 'admin_verified', label: 'Admin Verified' },
      { key: 'hod_verified', label: 'HOD Approval' },
      { key: 'principal_verified', label: 'Principal Approval' },
      { key: 'ready_for_issue', label: 'Ready to Issue' },
      { key: 'completed', label: 'Completed' }
    ];

    const stageOrder = [
      'submitted',
      'admin_verified',
      'hod_verified',
      'principal_verified',
      'ready_for_issue',
      'completed'
    ];

    const currentIndex = stageOrder.indexOf(stage);

    return (
      <div className="d-flex flex-column">
        <div className="progress-tracker mb-1">
          {steps.map((step, index) => {
            const isDone = currentIndex >= index && stage !== 'rejected';
            const isCurrent = currentIndex === index;
            return (
              <span
                key={step.key}
                className={`tracker-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
              >
                {step.label}
              </span>
            );
          })}
        </div>
        {stage === 'rejected' && (
          <small className="text-danger">
            Rejected by: {request.rejectedByRole || 'Unknown'}
            {request.rejectionReason ? ` — ${request.rejectionReason}` : ''}
          </small>
        )}
      </div>
    );
  };

  const getCurrentHandler = (request) => {
    const stage = request.approvalStage || 'submitted';
    const departmentLabel = user?.department || 'Department';

    if (stage === 'submitted' || stage === 'admin_verified') {
      return 'Admin';
    }
    if (stage === 'hod_verified') {
      return `HOD - ${departmentLabel}`;
    }
    if (stage === 'ready_for_issue' || stage === 'completed') {
      return 'Admin (Issuing)';
    }
    if (stage === 'principal_verified') {
      return 'Principal';
    }
    return 'Admin';
  };

  const formatExpectedDate = (request) => {
    if (!request.expectedCompletionDate) return '—';
    return new Date(request.expectedCompletionDate).toLocaleDateString();
  };

  if (loading) {
    return <div className="text-center p-5">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="page student-dashboard">
      <div className="page-header">
        <div>
          <div className="page-title">Student Portal</div>
          <div className="page-subtitle">
            Track your document requests, status, and downloads.
          </div>
        </div>
        <Link to="/student/new-request" className="btn btn-brand">
          <i className="bi bi-plus-circle me-2"></i> New Request
        </Link>
      </div>
      
      {successMessage && (
        <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}
      
      {loading ? (
        <div className="text-center p-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : (
        <div className="dashboard-content">
          {/* Welcome Section */}
          <div className="glass p-4 mb-4 fade-in-up">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <div style={{ fontSize: 22, fontWeight: 850, letterSpacing: '-0.02em' }}>
                  Welcome, {user?.name || 'Student'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.70)' }}>
                  Department: {user?.department || 'Computer Science'} • Semester: {user?.semester || '6'}
                </div>
              </div>
              <div className="chip">
                <i className="bi bi-shield-check" />
                Dues: <span style={{ color: '#22c55e', fontWeight: 750 }}>Cleared</span>
              </div>
            </div>
          </div>
          
          {/* Stats Section */}
          <div className="kpi-grid mb-4 fade-in-up">
            <div className="kpi-card glass">
              <div className="kpi-label">Total Requests</div>
              <div className="kpi-value">{stats.total}</div>
            </div>
            <div className="kpi-card glass">
              <div className="kpi-label">Pending</div>
              <div className="kpi-value" style={{ color: '#f59e0b' }}>{stats.pending}</div>
            </div>
            <div className="kpi-card glass">
              <div className="kpi-label">Approved</div>
              <div className="kpi-value" style={{ color: '#22d3ee' }}>{stats.approved}</div>
            </div>
            <div className="kpi-card glass">
              <div className="kpi-label">Completed</div>
              <div className="kpi-value" style={{ color: '#22c55e' }}>{stats.completed}</div>
            </div>
          </div>
          
          {/* Recent Requests Section */}
          <div className="glass table-wrap fade-in-up">
            <div className="d-flex justify-content-between align-items-center p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <div style={{ fontWeight: 800 }}>Recent Requests</div>
              <div className="chip">
                <i className="bi bi-clock-history" />
                Live updates every 30s
              </div>
            </div>
            <div className="p-3">
              {recentRequests.length === 0 ? (
                <div className="text-center p-5">
                  <div className="mb-4">
                    <i className="bi bi-file-earmark-text" style={{fontSize: '3rem'}}></i>
                  </div>
                  <h5>No requests found</h5>
                  <p className="text-muted">Create your first document request.</p>
                  <Link to="/student/new-request" className="btn btn-brand">
                    New Request
                  </Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle table-glass mb-0">
                    <thead>
                      <tr>
                        <th>Document Type</th>
                        <th>Workflow</th>
                        <th>Status</th>
                        <th>Expected By</th>
                        <th>Handled By</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRequests.map((request) => (
                        <tr key={request._id}>
                          <td className="fw-medium">
                            {request.documentType}
                            {request.priority === 'urgent' && (
                              <span className="badge bg-danger ms-2">Urgent</span>
                            )}
                          </td>
                          <td style={{ maxWidth: '260px' }}>
                            {renderProgressTracker(request)}
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(request.status)}`}>
                              {request.status}
                            </span>
                          </td>
                          <td>{formatExpectedDate(request)}</td>
                          <td>{getCurrentHandler(request)}</td>
                          <td>
                            <Link 
                              to={`/student/requests/${request._id}`} 
                              className="btn btn-sm btn-soft me-2"
                            >
                              <i className="bi bi-eye me-1"></i> View
                            </Link>
                            {request.status === 'Completed' && request.issuedDocLink && (
                              <a 
                                href={request.issuedDocLink} 
                                className="btn btn-sm btn-brand"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <i className="bi bi-download me-1"></i> Download
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;