import React, { useEffect, useState, useCallback } from 'react';
import { Table, Badge, Button, Alert } from 'react-bootstrap';
import { requestsAPI } from '../../api';

const HodDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Backend already scopes HOD view to department + official documents
      const response = await requestsAPI.getAllRequests();
      setRequests(response.data || []);
    } catch (err) {
      console.error('Error fetching HOD requests:', err);
      setError('Failed to load requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (requestId) => {
    try {
      setError(null);
      await requestsAPI.hodApprove(requestId, {});
      await fetchRequests();
    } catch (err) {
      console.error('Error approving request as HOD:', err);
      setError(
        err.response?.data?.message || 'Failed to approve request. Please try again.'
      );
    }
  };

  const handleReject = async (requestId) => {
    const reason = window.prompt('Enter rejection reason (required):');
    if (!reason || !reason.trim()) {
      return;
    }

    try {
      setError(null);
      await requestsAPI.hodReject(requestId, { remarks: reason.trim() });
      await fetchRequests();
    } catch (err) {
      console.error('Error rejecting request as HOD:', err);
      setError(
        err.response?.data?.message || 'Failed to reject request. Please try again.'
      );
    }
  };

  const getHodStatusBadge = (request) => {
    const stage = request.approvalStage;
    if (stage === 'hod_verified' || stage === 'ready_for_issue') {
      return <Badge bg="success">Approved</Badge>;
    }
    if (request.status === 'Rejected' && request.rejectedByRole === 'hod') {
      return <Badge bg="danger">Rejected</Badge>;
    }
    return <Badge bg="warning">Pending HOD</Badge>;
  };

  if (loading) {
    return (
      <div className="page">
        <div className="text-center p-5">
          <div className="spinner-border text-light" role="status" />
          <p className="mt-2 text-muted">Loading HOD requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page admin-dashboard">
      <div className="page-header">
        <div>
          <div className="page-title">HOD Approval</div>
          <div className="page-subtitle">
            Review and approve department and official document requests.
          </div>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="glass table-wrap fade-in-up">
        <div
          className="d-flex justify-content-between align-items-center p-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}
        >
          <div style={{ fontWeight: 800 }}>Requests Requiring HOD</div>
        </div>
        <div className="p-3">
          {requests.length > 0 ? (
            <div className="table-responsive">
              <Table hover className="table-glass align-middle mb-0">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Document Type</th>
                    <th>Requested On</th>
                    <th>Status</th>
                    <th>HOD Decision</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request._id}>
                      <td>
                        <div className="fw-medium">
                          {request.student?.name || 'Student'}
                        </div>
                        <small className="text-muted">
                          {request.student?.email || ''}
                        </small>
                      </td>
                      <td>{request.documentType}</td>
                      <td>
                        {request.createdAt
                          ? new Date(request.createdAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td>
                        <Badge
                          bg={
                            request.status === 'Completed'
                              ? 'success'
                              : request.status === 'Approved'
                              ? 'info'
                              : request.status === 'Rejected'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {request.status}
                        </Badge>
                      </td>
                      <td>{getHodStatusBadge(request)}</td>
                      <td>
                        {request.status !== 'Rejected' &&
                          request.approvalStage !== 'ready_for_issue' && (
                            <>
                              <Button
                                variant="success"
                                size="sm"
                                className="me-2"
                                onClick={() => handleApprove(request._id)}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleReject(request._id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1" />
              <p className="mt-2">
                No document requests currently waiting for HOD approval.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HodDashboard;

