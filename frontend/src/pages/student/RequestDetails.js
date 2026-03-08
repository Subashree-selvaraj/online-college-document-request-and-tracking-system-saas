import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Badge, Button, Row, Col, Alert } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { requestsAPI } from '../../api';
import emailService from '../../utils/emailService';

const RequestDetails = () => {
  const { requestId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [timeline, setTimeline] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [resubmitLoading, setResubmitLoading] = useState(false);

  const INSTANT_DOCS = [
    'Fee Receipt / Dues Clearance Certificate',
    'Attendance Certificate',
    'Study Certificate',
    'Enrollment Verification Letter'
  ];
  const DEPT_DOCS = [
    'Bonafide Certificate',
    'Course Completion Certificate',
    'Letter of Recommendation (LOR)',
    'Internship / Industrial Training Certificate',
    'Medium of Instruction Certificate',
    'Character Certificate'
  ];
  const OFFICIAL_DOCS = [
    'Transcript',
    'Degree Certificate',
    'Consolidated Marksheet',
    'Transfer Certificate (TC)',
    'Migration Certificate',
    'No Objection Certificate (NOC)'
  ];

  const fetchRequestDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch request details from the API
      const response = await requestsAPI.getRequestById(requestId);
      console.log("Request details:", response.data);
      
      // Log document link for debugging
      if (response.data.issuedDocLink) {
        console.log("Document link found:", response.data.issuedDocLink);
      }
      
      setRequest(response.data);

      try {
        const [timelineRes, commentsRes] = await Promise.all([
          requestsAPI.getTimeline(requestId).catch(() => ({ data: [] })),
          requestsAPI.getComments(requestId).catch(() => ({ data: [] }))
        ]);
        setTimeline(timelineRes.data || []);
        setComments(commentsRes.data || []);
      } catch (extraErr) {
        console.warn('Error loading timeline/comments:', extraErr);
      }
    } catch (err) {
      console.error('Error fetching request details:', err);
      setError('Failed to load request details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (requestId) {
      fetchRequestDetails();
      
      // Set up polling for real-time updates (every 30 seconds)
      const pollingInterval = setInterval(() => {
        fetchRequestDetails();
      }, 30000);
      
      // Clean up interval on component unmount
      return () => clearInterval(pollingInterval);
    }
  }, [requestId, fetchRequestDetails]);

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

  const getStatusStep = (status) => {
    switch (status) {
      case 'Pending':
        return 1;
      case 'Approved':
        return 2;
      case 'Completed':
        return 3;
      case 'Rejected':
        return -1; // Special case for rejected
      default:
        return 0;
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'student_submitted':
        return 'Student submitted request';
      case 'admin_verified':
        return 'Admin verified details';
      case 'admin_rejected':
        return 'Admin rejected request';
      case 'hod_approved':
        return 'HOD approved';
      case 'hod_rejected':
        return 'HOD rejected';
      case 'principal_approved':
        return 'Principal approved';
      case 'principal_rejected':
        return 'Principal rejected';
      case 'admin_uploaded_document':
        return 'Admin uploaded final document';
      case 'student_resubmitted':
        return 'Student resubmitted request';
      case 'comment_added':
        return 'New comment added';
      default:
        return action;
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      setCommentSubmitting(true);
      const res = await requestsAPI.addComment(requestId, {
        message: newComment.trim()
      });
      setComments((prev) => [...prev, res.data]);
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment. Please try again.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    try {
      setResubmitLoading(true);
      await requestsAPI.resubmit(requestId, {});
      await fetchRequestDetails();
    } catch (err) {
      console.error('Error resubmitting request:', err);
      setError('Failed to resubmit request. Please try again.');
    } finally {
      setResubmitLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-5">Loading request details...</div>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!request) {
    return <Alert variant="warning">Request not found.</Alert>;
  }

  const getCategory = () => {
    if (INSTANT_DOCS.includes(request.documentType)) return 'instant';
    if (DEPT_DOCS.includes(request.documentType)) return 'department';
    if (OFFICIAL_DOCS.includes(request.documentType)) return 'official';
    return 'department';
  };

  const getNextStepMessage = () => {
    const stage = request.approvalStage || 'submitted';
    const category = getCategory();

    if (stage === 'submitted') {
      return 'Waiting for admin to verify your request.';
    }
    if (stage === 'admin_verified') {
      if (category === 'instant') {
        return 'Admin can now issue your document.';
      }
      return 'Waiting for HOD approval.';
    }
    if (stage === 'hod_verified') {
      if (category === 'official') {
        return 'Waiting for Principal approval.';
      }
      return 'Admin can now issue your document.';
    }
    if (stage === 'principal_verified' || stage === 'ready_for_issue') {
      return 'Admin is preparing and uploading your final document.';
    }
    if (stage === 'completed') {
      return 'Your document is ready for download.';
    }
    if (stage === 'rejected') {
      return 'Request was rejected. You can resubmit after making corrections.';
    }
    return '';
  };

  return (
    <div className="page request-details">
      <div className="page-header">
        <div>
          <div className="page-title">Request Details</div>
          <div className="page-subtitle">View status, remarks, and download when ready.</div>
        </div>
        <Button 
          variant="outline-light"
          className="btn-soft"
          onClick={() => navigate('/student/dashboard')}
        >
          Back to Dashboard
        </Button>
      </div>
      
      <div className="glass p-4 mb-4 fade-in-up">
          <Row>
            <Col md={6}>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>Document Type</div>
              <div style={{ fontSize: 18, fontWeight: 850 }}>{request.documentType}</div>
            </Col>
            <Col md={6} className="text-md-end">
              <Badge 
                bg={getStatusBadgeVariant(request.status)} 
                className="fs-6 p-2"
              >
                {request.status}
              </Badge>
            </Col>
          </Row>
          
          <hr />
          
          <Row className="mb-4">
            <Col md={6}>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>Request Date</div>
              <div>{new Date(request.createdAt).toLocaleDateString()}</div>
            </Col>
            <Col md={6}>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>Last Updated</div>
              <div>{new Date(request.updatedAt).toLocaleDateString()}</div>
            </Col>
          </Row>

          {/* What happens next */}
          {getNextStepMessage() && (
            <Alert variant="secondary" className="mb-3">
              <strong>Next step:</strong> {getNextStepMessage()}
            </Alert>
          )}
          
          {/* Progress Tracker */}
          {request.status !== 'Rejected' && (
            <div className="progress-tracker mb-4">
              <div className="progress" style={{ height: '4px' }}>
                <div 
                  className="progress-bar" 
                  role="progressbar" 
                  style={{ 
                    width: `${(getStatusStep(request.status) / 3) * 100}%` 
                  }}
                  aria-valuenow={getStatusStep(request.status)} 
                  aria-valuemin="0" 
                  aria-valuemax="3"
                ></div>
              </div>
              
              <div className="d-flex justify-content-between mt-2">
                <div className="text-center">
                  <div 
                    className={`rounded-circle d-flex align-items-center justify-content-center mb-1 ${getStatusStep(request.status) >= 1 ? 'bg-primary' : 'bg-light'}`} 
                    style={{ width: '30px', height: '30px', color: getStatusStep(request.status) >= 1 ? 'white' : 'black' }}
                  >
                    1
                  </div>
                  <small>Submitted</small>
                </div>
                <div className="text-center">
                  <div 
                    className={`rounded-circle d-flex align-items-center justify-content-center mb-1 ${getStatusStep(request.status) >= 2 ? 'bg-primary' : 'bg-light'}`} 
                    style={{ width: '30px', height: '30px', color: getStatusStep(request.status) >= 2 ? 'white' : 'black' }}
                  >
                    2
                  </div>
                  <small>Approved</small>
                </div>
                <div className="text-center">
                  <div 
                    className={`rounded-circle d-flex align-items-center justify-content-center mb-1 ${getStatusStep(request.status) >= 3 ? 'bg-primary' : 'bg-light'}`} 
                    style={{ width: '30px', height: '30px', color: getStatusStep(request.status) >= 3 ? 'white' : 'black' }}
                  >
                    3
                  </div>
                  <small>Completed</small>
                </div>
              </div>
            </div>
          )}
          
          {/* Rejection Notice */}
          {request.status === 'Rejected' && (
            <Alert variant="danger" className="mb-4">
              <Alert.Heading>Request Rejected</Alert.Heading>
              <p>
                Your request has been rejected by{' '}
                <strong>{request.rejectedByRole || 'staff'}</strong>.
              </p>
              {request.rejectionReason && (
                <p>
                  <strong>Reason:</strong> {request.rejectionReason}
                </p>
              )}
              {user?.role === 'student' && (
                <Button
                  variant="outline-light"
                  size="sm"
                  className="btn-soft mt-2"
                  onClick={handleResubmit}
                  disabled={resubmitLoading}
                >
                  {resubmitLoading ? 'Resubmitting...' : 'Resubmit with Corrections'}
                </Button>
              )}
            </Alert>
          )}
          
          {/* Request Details */}
          <div className="mb-3" style={{ fontWeight: 850, fontSize: 16 }}>Request Details</div>
          <Row className="mb-4">
            {Object.entries(request.formData).map(([key, value]) => (
              <Col md={6} key={key} className="mb-3">
                <div className="text-capitalize" style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>
                  {key.replace(/([A-Z])/g, ' $1')}
                </div>
                <div>{value}</div>
              </Col>
            ))}
          </Row>
          
          {/* Admin Remarks */}
          {request.remarks && (
            <div className="mb-4">
              <h5>Remarks</h5>
              <Alert variant="info">
                {request.remarks}
              </Alert>
            </div>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <div className="mb-4">
              <h5 className="mb-2">Timeline</h5>
              <div className="timeline glass-2 p-3">
                {timeline.map((log) => (
                  <div key={log._id} className="timeline-item">
                    <div className="timeline-title">
                      {getActionLabel(log.action)}
                    </div>
                    {log.remarks && (
                      <div className="timeline-remarks">{log.remarks}</div>
                    )}
                    <div className="timeline-meta">
                      {new Date(log.timestamp).toLocaleString()}
                      {log.role && ` • ${log.role}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="mb-4">
            <h5 className="mb-2">Discussion</h5>
            <div className="comment-thread glass-2 p-3">
              {comments.length === 0 ? (
                <div className="text-muted small">
                  No comments yet. Use the box below to ask a question or respond to staff.
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c._id} className="comment-bubble">
                    <div className="comment-header">
                      <span className="comment-role">
                        {c.role ? c.role.toUpperCase() : 'USER'}
                      </span>
                      <span className="comment-time">
                        {new Date(c.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="comment-message">{c.message}</div>
                  </div>
                ))
              )}
              {user && (
                <div className="mt-3">
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Add a comment or question..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-2"
                    onClick={handleAddComment}
                    disabled={commentSubmitting || !newComment.trim()}
                  >
                    {commentSubmitting ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Document Download */}
          {request.status === 'Completed' && (
            <div className="text-center mt-4 p-4 glass-2">
              <h4 className="mb-3" style={{ color: '#22c55e', fontWeight: 850 }}>
                <i className="bi bi-file-earmark-check me-2"></i>Your document is ready
              </h4>
              <p className="mb-3" style={{ color: 'rgba(255,255,255,0.72)' }}>
                The administrator uploaded your requested document. Download it below.
              </p>
              {request.issuedDocLink ? (
                <Button 
                  size="lg" 
                  className="btn-brand px-4 py-2"
                  onClick={(e) => {
                    e.preventDefault();
                    // Use the proxy endpoint which handles Cloudinary URLs correctly
                    const downloadUrl = requestsAPI.downloadDocument(requestId);
                    
                    // Create a temporary anchor element to trigger download
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = `${request.documentType.replace(/\s+/g, '_')}.pdf`;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <i className="bi bi-download me-2"></i>
                  Download Document
                </Button>
              ) : (
                <Alert variant="warning">
                  Your document has been processed, but the download link is not yet available. 
                  Please check back later or contact the administrator.
                </Alert>
              )}
            </div>
          )}
          
          {/* Email Notification Preferences */}
          <div className="mt-4">
            <h5 className="mb-3">Email Notifications</h5>
            <div className="d-flex align-items-center">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="notification-switch"
                  checked={notificationEnabled}
                  onChange={() => {
                    const newState = !notificationEnabled;
                    setNotificationEnabled(newState);
                    
                    // Update notification preferences
                    if (request) {
                      if (newState) {
                        emailService.enableNotifications(user.email, request._id);
                        setNotificationMessage('Email notifications enabled for this request.');
                      } else {
                        emailService.disableNotifications(user.email, request._id);
                        setNotificationMessage('Email notifications disabled for this request.');
                      }
                    }
                  }}
                />
                <label className="form-check-label" htmlFor="notification-switch">
                  Receive email updates about this request
                </label>
              </div>
            </div>
            {notificationMessage && (
              <Alert variant="info" className="mt-2">
                {notificationMessage}
              </Alert>
            )}
          </div>
      </div>
    </div>
  );
};

export default RequestDetails;