import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Button } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { requestsAPI } from '../../api';

const Dashboard = () => {
  // const { user } = useAuth(); // user not used
  const [pendingRequests, setPendingRequests] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    rejected: 0,
  });
  const [documentDistribution, setDocumentDistribution] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define fetchDashboardData with useCallback to prevent infinite loops
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching admin dashboard data');
      
      // Fetch real data from the API
      const response = await requestsAPI.getAllRequests();
      let requests = response.data;
      
      // Process requests to ensure we have student information
      requests = requests.map(req => {
        const requiredDate = req.requiredDate || req.formData?.requiredDate || req.formData?.deadlineDate || null;

        // If the student data is nested in a student property (from API)
        if (req.student) {
          return {
            ...req,
            studentName: req.student.name,
            studentEmail: req.student.email,
            studentId: req.student._id,
            requiredDate
          };
        }
        // If the studentId is an object with user details
        else if (req.studentId && typeof req.studentId === 'object') {
          return {
            ...req,
            studentName: req.studentId.name,
            studentEmail: req.studentId.email,
            studentId: req.studentId._id,
            requiredDate
          };
        }
        // Return as is if we can't extract student info
        return {
          ...req,
          requiredDate
        };
      });
      
      console.log('Processed requests:', requests);
      
      // Calculate stats
      const calculatedStats = {
        total: requests.length,
        pending: requests.filter(req => req.status === 'Pending').length,
        approved: requests.filter(req => req.status === 'Approved').length,
        completed: requests.filter(req => req.status === 'Completed').length,
        rejected: requests.filter(req => req.status === 'Rejected').length,
      };
      
      // Calculate document distribution
      const distribution = {};
      requests.forEach(req => {
        if (!distribution[req.documentType]) {
          distribution[req.documentType] = 0;
        }
        distribution[req.documentType]++;
      });
      
      setPendingRequests(requests.filter(req => req.status === 'Pending'));
      setStats(calculatedStats);
      setDocumentDistribution(distribution);
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
      
      // Fallback to empty data if API fails
      setPendingRequests([]);
      setStats({
        total: 0,
        pending: 0,
        approved: 0,
        completed: 0,
        rejected: 0,
      });
      setDocumentDistribution({});
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
      // Set up polling for real-time updates (every 30 seconds)
      const pollingInterval = setInterval(() => {
        fetchDashboardData();
      }, 30000);
      
      // Clean up interval on component unmount
      return () => clearInterval(pollingInterval);
    }, [fetchDashboardData]);
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending': return 'bg-warning';
      case 'Approved': return 'bg-info';
      case 'Completed': return 'bg-success';
      case 'Rejected': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="page admin-dashboard">
      <div className="page-header">
        <div>
          <div className="page-title">Admin Portal</div>
          <div className="page-subtitle">
            Overview of requests, distribution, and quick actions.
          </div>
        </div>
        <Link to="/admin/requests" className="btn btn-brand">
          <i className="bi bi-file-earmark-text me-2" /> Manage Requests
        </Link>
      </div>

      {/* Stats */}
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
          <div className="kpi-label">Completed</div>
          <div className="kpi-value" style={{ color: '#22c55e' }}>{stats.completed}</div>
        </div>
        <div className="kpi-card glass">
          <div className="kpi-label">Rejected</div>
          <div className="kpi-value" style={{ color: '#ef4444' }}>{stats.rejected}</div>
        </div>
      </div>

      {/* Pending Requests */}
      <div className="glass table-wrap mb-4 fade-in-up">
        <div className="d-flex justify-content-between align-items-center p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{ fontWeight: 800 }}>Pending Requests</div>
          <Link to="/admin/requests" className="btn btn-sm btn-brand">View All</Link>
        </div>
        <div className="p-3">
          <div className="table-responsive">
            <table className="table table-hover align-middle table-glass mb-0">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Document Type</th>
                  <th>Date Requested</th>
                  <th>Required By</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.length > 0 ? (
                  pendingRequests.map((request) => (
                    <tr key={request._id}>
                      <td>
                        <div className="fw-medium">{request.studentName}</div>
                        <small className="text-muted">{request.studentEmail}</small>
                      </td>
                      <td>{request.documentType}</td>
                      <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                      <td>{request.requiredDate ? new Date(request.requiredDate).toLocaleDateString() : '—'}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td>
                        <Link to={`/admin/requests`} className="btn btn-sm btn-soft me-2">View</Link>
                        <Button variant="success" size="sm" className="me-2">Approve</Button>
                        <Button variant="danger" size="sm">Reject</Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">
                      No pending requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Distribution + Quick Actions */}
      <Row className="g-3">
        <Col md={6}>
          <div className="glass p-4 fade-in-up">
            <div className="mb-3" style={{ fontWeight: 850, fontSize: 16 }}>Document Type Distribution</div>
            <div className="table-responsive">
              <table className="table table-glass mb-0">
                <thead>
                  <tr>
                    <th>Document Type</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(documentDistribution).map(([type, count], index) => (
                    <tr key={index}>
                      <td>{type}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Col>
        <Col md={6}>
          <div className="glass p-4 fade-in-up">
            <div className="mb-3" style={{ fontWeight: 850, fontSize: 16 }}>Quick Actions</div>
            <div className="d-grid gap-2">
              <Link to="/admin/requests" className="btn btn-soft text-start">
                <i className="bi bi-file-earmark-text me-2" /> Manage All Requests
              </Link>
              <Link to="/admin/users" className="btn btn-soft text-start">
                <i className="bi bi-people me-2" /> Manage Users
              </Link>
              <Link to="/admin/document-types" className="btn btn-soft text-start">
                <i className="bi bi-folder2-open me-2" /> Manage Document Types
              </Link>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;