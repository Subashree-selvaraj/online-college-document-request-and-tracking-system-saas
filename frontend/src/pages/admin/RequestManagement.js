import React, { useState, useEffect, useCallback } from 'react';
import { Table, Badge, Button, Form, Modal, Row, Col, Alert } from 'react-bootstrap';
import { requestsAPI } from '../../api';
import { userAPI } from '../../api';
import emailService from '../../utils/emailService';
import api from '../../api';

const RequestManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve', 'reject', 'upload', or 'view'
  const [remarks, setRemarks] = useState('');
  const [documentLink, setDocumentLink] = useState('');
  const [file, setFile] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch real data from the API (backend already filters by admin's handled types)
      const response = await requestsAPI.getAllRequests();
      let fetchedRequests = response.data;
      
      // Process requests to ensure we have student information
      const processedRequests = [];
      
      for (const req of fetchedRequests) {
        // If the student data is nested in a student property (from API)
        if (req.student) {
          processedRequests.push({
            ...req,
            studentId: {
              _id: req.student._id,
              name: req.student.name,
              email: req.student.email,
              department: req.student.department || 'Not specified',
              semester: req.student.semester || 0,
              duesCleared: req.student.duesCleared || false
            }
          });
        }
        // If the studentId is already an object with user details
        else if (req.studentId && typeof req.studentId === 'object') {
          // Already in the correct format
          processedRequests.push(req);
        }
        // If studentId is just an ID, fetch the student data
        else {
          try {
            // Try to fetch student data if we have an ID
            if (req.studentId) {
              const studentResponse = await userAPI.getStudentById(req.studentId);
              if (studentResponse && studentResponse.data) {
                processedRequests.push({
                  ...req,
                  studentId: {
                    _id: req.studentId,
                    name: studentResponse.data.name,
                    email: studentResponse.data.email,
                    department: studentResponse.data.department || 'Not specified',
                    semester: studentResponse.data.semester || 0,
                    duesCleared: studentResponse.data.duesCleared || false
                  }
                });
              }
            }
          } catch (studentErr) {
            console.error('Error fetching student data:', studentErr);
            
            // Fallback if fetch fails
            processedRequests.push({
              ...req,
              studentId: {
                _id: req.studentId,
                name: 'Student',
                email: 'Not available',
                department: 'Not specified',
                semester: 0,
                duesCleared: false
              }
            });
          }
        }
      }
      
      console.log('Fetched requests:', processedRequests);
      setRequests(processedRequests);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Failed to load requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

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

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
  };

  const filteredRequests = filterStatus === 'all'
    ? requests
    : requests.filter(request => request.status === filterStatus);

  const handleAction = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setRemarks('');
    setDocumentLink('');
    setFile(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setActionType(null);
    setRemarks('');
    setDocumentLink('');
    setFile(null);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmitAction = async () => {
    try {
      if (!selectedRequest || !actionType) return;

      setError(null);

      let updatedRequest = { ...selectedRequest };
      const studentEmail = selectedRequest.studentId.email;
      const studentName = selectedRequest.studentId.name;
      const documentType = selectedRequest.documentType;

      switch (actionType) {
        case 'approve':
          updatedRequest.status = 'Approved';
          updatedRequest.remarks = remarks;
          
          // Call the API to update request status
          {
            const response = await requestsAPI.updateRequestStatus(selectedRequest._id, {
            status: 'Approved',
            remarks: remarks
          });
            if (response && response.data) {
              updatedRequest = response.data;
            }
          }
          
          // Send email notification
          try {
            // Send status update email
            await emailService.sendStatusUpdateEmail(
              studentEmail,
              studentName,
              documentType,
              'Approved',
              remarks
            );
            
            // Also send a test-like email notification as requested
            const testEmailSubject = `Document Request Approved: ${documentType}`;
            const testEmailBody = `
              Dear ${studentName},
              
              Great news! Your request for ${documentType} has been APPROVED.
              
              ${remarks ? `Admin remarks: ${remarks}` : ''}
              
              You will be notified again when your document is ready for download.
              
              Thank you for using our Document Request System.
              
              Regards,
              College Document Request System
            `;
            
            // Send the additional notification email via backend API
            await api.post('/email/send', {
              to: studentEmail,
              subject: testEmailSubject,
              body: testEmailBody
            });
            
            console.log('Approval notification emails sent successfully');
          } catch (emailErr) {
            console.error('Error sending email notification:', emailErr);
            // Continue with the process even if email fails
          }
          break;
          
        case 'reject':
          updatedRequest.status = 'Rejected';
          updatedRequest.remarks = remarks;
          
          // Call the API to update request status
          {
            const response = await requestsAPI.updateRequestStatus(selectedRequest._id, {
            status: 'Rejected',
            remarks: remarks
          });
            if (response && response.data) {
              updatedRequest = response.data;
            }
          }
          
          // Send email notification
          try {
            await emailService.sendStatusUpdateEmail(
              studentEmail,
              studentName,
              documentType,
              'Rejected',
              remarks
            );
          } catch (emailErr) {
            console.error('Error sending email notification:', emailErr);
            // Continue with the process even if email fails
          }
          break;
          
        case 'upload':
          // Upload document or document link
          if (file) {
            const formData = new FormData();
            formData.append('document', file);
            formData.append('remarks', remarks);
            formData.append('status', 'Completed');

            const response = await requestsAPI.uploadDocument(selectedRequest._id, formData);
            if (response && response.data) {
              updatedRequest = response.data;
            }
          } else if (documentLink) {
            // If only a link is provided
            const response = await requestsAPI.updateDocumentLink(selectedRequest._id, {
              documentLink,
              remarks
            });
            if (response && response.data) {
              updatedRequest = response.data.request || response.data;
            }
          }
          
          // Send document ready email notification using backend API
          try {
            // Use the backend email API endpoint instead of the frontend service
            await api.post('/email/send', {
              to: studentEmail,
              subject: `Your ${documentType} is Ready for Download`,
              body: `
                Dear ${studentName},
                
                Your requested document (${documentType}) is now ready for download.
                
                You can access it by logging into your student dashboard.
                
                Regards,
                College Document Request System
              `
            });
            console.log('Email notification sent successfully');
          } catch (emailErr) {
            console.error('Error sending email notification:', emailErr);
            // Continue with the process even if email fails
          }
          break;
          
        default:
          break;
      }

      // Update the requests state with the updated request
      setRequests(prev => prev.map(req => 
        req._id === updatedRequest._id ? { ...req, ...updatedRequest } : req
      ));

      // Refresh from API to ensure we have the latest data
      await fetchRequests();

      // Close the modal
      handleModalClose();

      // In a real implementation, we would show a success message
      console.log(`Request ${actionType}d successfully`);
    } catch (err) {
      console.error(`Error ${actionType}ing request:`, err);
      setError(`Failed to ${actionType} request. Please try again.`);
    }
  };

  const renderActionButtons = (request) => {
    return (
      <>
        <Button
          variant="outline-light"
          size="sm"
          className="btn-soft me-2"
          onClick={() => handleAction(request, 'view')}
        >
          View
        </Button>
        {request.status === 'Pending' && (
          <>
            <Button
              variant="success"
              size="sm"
              className="me-2"
              onClick={() => handleAction(request, 'approve')}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleAction(request, 'reject')}
            >
              Reject
            </Button>
          </>
        )}
        {request.status === 'Approved' && request.approvalStage === 'ready_for_issue' && (
          <Button
            variant="primary"
            size="sm"
            className="btn-brand"
            onClick={() => handleAction(request, 'upload')}
          >
            Upload
          </Button>
        )}
        {request.status === 'Completed' && request.issuedDocLink && (
          <Button
            variant="outline-light"
            size="sm"
            className="btn-soft"
            onClick={(e) => {
              e.preventDefault();
              const downloadUrl = requestsAPI.downloadDocument(request._id);
              window.open(downloadUrl, '_blank', 'noopener,noreferrer');
            }}
          >
            View Doc
          </Button>
        )}
        {request.status === 'Rejected' && (
          <Button
            variant="outline-light"
            size="sm"
            className="btn-soft"
            onClick={() => handleAction(request, 'approve')}
          >
            Reconsider
          </Button>
        )}
      </>
    );
  };

  const renderModalContent = () => {
    if (!selectedRequest || !actionType) return null;

    switch (actionType) {
      case 'view':
        return (
          <>
            <Modal.Header closeButton>
              <Modal.Title>Request Details</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <h5 className="mb-3">Student Information</h5>
              <Row className="mb-3">
                <Col md={6}>
                  <p><strong>Name:</strong> {selectedRequest.studentId.name}</p>
                  <p><strong>Email:</strong> {selectedRequest.studentId.email}</p>
                </Col>
                <Col md={6}>
                  <p><strong>Department:</strong> {selectedRequest.studentId.department}</p>
                  <p><strong>Semester:</strong> {selectedRequest.studentId.semester}</p>
                  <p><strong>Dues Cleared:</strong> {selectedRequest.studentId.duesCleared ? 'Yes' : 'No'}</p>
                </Col>
              </Row>
              
              <h5 className="mb-3">Request Information</h5>
              <Row className="mb-3">
                <Col md={6}>
                  <p><strong>Document Type:</strong> {selectedRequest.documentType}</p>
                  <p><strong>Status:</strong> <Badge bg={getStatusBadgeVariant(selectedRequest.status)}>{selectedRequest.status}</Badge></p>
                  <p><strong>Date Requested:</strong> {new Date(selectedRequest.createdAt).toLocaleString()}</p>
                </Col>
                <Col md={6}>
                  <p><strong>Last Updated:</strong> {new Date(selectedRequest.updatedAt).toLocaleString()}</p>
                  {selectedRequest.issuedDocLink && (
                    <p>
                      <strong>Document Link:</strong>{' '}
                      <a 
                        href={requestsAPI.downloadDocument(selectedRequest._id)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        View Document
                      </a>
                    </p>
                  )}
                </Col>
              </Row>
              
              {selectedRequest.remarks && (
                <div className="mb-3">
                  <h6>Remarks:</h6>
                  <p className="p-2 bg-light border rounded">{selectedRequest.remarks}</p>
                </div>
              )}
              
              <h5 className="mb-3">Form Data</h5>
              <div className="p-3 bg-light border rounded">
                {selectedRequest.formData && Object.entries(selectedRequest.formData).map(([key, value]) => (
                  <div key={key} className="mb-2">
                    <strong>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:</strong>{' '}
                    {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                  </div>
                ))}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleModalClose}>
                Close
              </Button>
              {selectedRequest.status === 'Pending' && (
                <>
                  <Button variant="success" onClick={() => { handleModalClose(); handleAction(selectedRequest, 'approve'); }}>
                    Approve
                  </Button>
                  <Button variant="danger" onClick={() => { handleModalClose(); handleAction(selectedRequest, 'reject'); }}>
                    Reject
                  </Button>
                </>
              )}
              {selectedRequest.status === 'Approved' && (
                <Button variant="primary" onClick={() => { handleModalClose(); handleAction(selectedRequest, 'upload'); }}>
                  Upload Document
                </Button>
              )}
            </Modal.Footer>
          </>
        );
      case 'approve':
        return (
          <>
            <Modal.Header closeButton>
              <Modal.Title>Approve Request</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p><strong>Student:</strong> {selectedRequest.studentId.name}</p>
              <p><strong>Document:</strong> {selectedRequest.documentType}</p>
              <Form.Group className="mb-3">
                <Form.Label>Remarks (Optional)</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={3} 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any remarks or instructions for the student"
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleModalClose}>
                Cancel
              </Button>
              <Button variant="success" onClick={handleSubmitAction}>
                Approve Request
              </Button>
            </Modal.Footer>
          </>
        );
      case 'reject':
        return (
          <>
            <Modal.Header closeButton>
              <Modal.Title>Reject Request</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p><strong>Student:</strong> {selectedRequest.studentId.name}</p>
              <p><strong>Document:</strong> {selectedRequest.documentType}</p>
              <Form.Group className="mb-3">
                <Form.Label>Reason for Rejection</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={3} 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Explain why the request is being rejected"
                  required
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleModalClose}>
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={handleSubmitAction}
                disabled={!remarks.trim()}
              >
                Reject Request
              </Button>
            </Modal.Footer>
          </>
        );
      case 'upload':
        return (
          <>
            <Modal.Header closeButton>
              <Modal.Title>Upload Document</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p><strong>Student:</strong> {selectedRequest.studentId.name}</p>
              <p><strong>Document:</strong> {selectedRequest.documentType}</p>
              
              <Form.Group className="mb-3">
                <Form.Label>Upload Document File</Form.Label>
                <Form.Control 
                  type="file" 
                  onChange={handleFileChange}
                  accept=".pdf"
                />
                <Form.Text className="text-muted">
                  Accepted format: PDF (.pdf)
                </Form.Text>
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Or Provide Document Link</Form.Label>
                <Form.Control 
                  type="url" 
                  value={documentLink}
                  onChange={(e) => setDocumentLink(e.target.value)}
                  placeholder="https://example.com/document.pdf"
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Remarks (Optional)</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={3} 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any remarks or instructions for the student"
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleModalClose}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSubmitAction}
                disabled={!file && !documentLink.trim()}
              >
                Complete Request
              </Button>
            </Modal.Footer>
          </>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="text-center p-5">
          <div className="spinner-border text-light" role="status" />
          <p className="mt-2 text-muted">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page request-management">
      <div className="page-header">
        <div>
          <div className="page-title">Document Request Management</div>
          <div className="page-subtitle">
            View, approve, reject, or complete student requests.
          </div>
        </div>
        <Form.Select
          className="form-select"
          style={{ width: 'auto', minWidth: 160 }}
          value={filterStatus}
          onChange={handleFilterChange}
        >
          <option value="all">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Completed">Completed</option>
          <option value="Rejected">Rejected</option>
        </Form.Select>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="glass table-wrap fade-in-up">
        <div className="d-flex justify-content-between align-items-center p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{ fontWeight: 800 }}>All Requests</div>
          <span className="chip">Filter: {filterStatus === 'all' ? 'All' : filterStatus}</span>
        </div>
        <div className="p-3">
          {filteredRequests.length > 0 ? (
            <div className="table-responsive">
              <Table hover className="table-glass align-middle mb-0">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Document Type</th>
                    <th>Date Requested</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request._id}>
                      <td>
                        <div className="fw-medium">{request.studentId.name}</div>
                        <small className="text-muted">{request.studentId.email}</small>
                      </td>
                      <td>{request.documentType}</td>
                      <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                      <td>
                        <Badge bg={getStatusBadgeVariant(request.status)}>
                          {request.status}
                        </Badge>
                      </td>
                      <td>
                        {renderActionButtons(request)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1" />
              <p className="mt-2">No requests found for the selected filter.</p>
            </div>
          )}
        </div>
      </div>

      <Modal show={showModal} onHide={handleModalClose} centered className="modal-dark">
        {renderModalContent()}
      </Modal>
    </div>
  );
};

export default RequestManagement;