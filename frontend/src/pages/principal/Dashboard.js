import React, { useEffect, useState, useCallback } from 'react';
import { Table, Badge, Button, Alert } from 'react-bootstrap';
import { requestsAPI } from '../../api';

const OFFICIAL_DOCS = [
  'Transcript',
  'Degree Certificate',
  'Consolidated Marksheet',
  'Transfer Certificate (TC)',
  'Migration Certificate',
  'No Objection Certificate (NOC)'
];

const PrincipalDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Backend already returns only official / principal-approval documents
      const response = await requestsAPI.getAllRequests();
      setRequests(response.data || []);
    } catch (err) {
      console.error('Error fetching principal requests:', err);
      setError('Failed to load requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleVerify = async (requestId) => {
    try {
      setError(null);
      await requestsAPI.principalApprove(requestId, {});
      await fetchRequests();
    } catch (err) {
      console.error('Error verifying request as principal:', err);
      setError('Failed to verify request. Please try again.');
    }
  };

  const getPrincipalStatusBadge = (request) => {
    const needsPrincipal = OFFICIAL_DOCS.includes(request.documentType);
    if (!needsPrincipal) {
      return null;
    }
    if (request.principalApproved) {
      return <Badge bg="success">Verified</Badge>;
    }
    return <Badge bg="warning">Pending Principal</Badge>;
  };

  if (loading) {
    return (
      <div className="page">
        <div className="text-center p-5">
          <div className="spinner-border text-light" role="status" />
          <p className="mt-2 text-muted">Loading principal requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page admin-dashboard">
      <div className="page-header">
        <div>
          <div className="page-title">Principal Verification</div>
          <div className="page-subtitle">
            Review and verify bonafide and other official document requests.
          </div>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="glass table-wrap fade-in-up">
        <div
          className="d-flex justify-content-between align-items-center p-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}
        >
          <div style={{ fontWeight: 800 }}>Official Document Requests</div>
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
                    <th>Principal Verification</th>
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
                        <Badge bg={
                          request.status === 'Completed'
                            ? 'success'
                            : request.status === 'Approved'
                            ? 'info'
                            : request.status === 'Rejected'
                            ? 'danger'
                            : 'warning'
                        }>
                          {request.status}
                        </Badge>
                      </td>
                      <td>{getPrincipalStatusBadge(request)}</td>
                      <td>
                        {!request.principalApproved && request.requiresPrincipalApproval && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleVerify(request._id)}
                          >
                            Verify & Approve
                          </Button>
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
                No official document requests pending principal verification.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrincipalDashboard;

