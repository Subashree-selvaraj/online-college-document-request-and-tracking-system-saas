import React, { useState, useEffect } from 'react';
import { Alert, Button, Row, Col } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
// import { authAPI } from '../../api';

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        setError(null);

        // In a real implementation, we would fetch from the API
        // const response = await authAPI.getProfile();
        // setProfileData(response.data);

        // For now, use the user data from context
        setProfileData(user);
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError('Failed to load profile data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  if (loading) {
    return <div className="text-center p-5">Loading profile...</div>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!profileData) {
    return <Alert variant="warning">No profile data available.</Alert>;
  }

  return (
    <div className="page student-profile">
      <div className="page-header">
        <div>
          <div className="page-title">My Profile</div>
          <div className="page-subtitle">
            Your student information and account status.
          </div>
        </div>
      </div>

      <div className="glass p-4 mb-4 fade-in-up">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div style={{ fontWeight: 850, fontSize: 18 }}>Personal Information</div>
          <div className="chip">
            <i className="bi bi-person-badge" />
            <span style={{ textTransform: 'capitalize' }}>{profileData.role}</span>
          </div>
        </div>
        <Row>
          <Col md={6} className="mb-3">
            <div style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>
              Full Name
            </div>
            <div style={{ fontWeight: 750 }}>{profileData.name}</div>
          </Col>
          <Col md={6} className="mb-3">
            <div style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>
              Email Address
            </div>
            <div style={{ fontWeight: 750 }}>{profileData.email}</div>
          </Col>
          <Col md={6} className="mb-3">
            <div style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>
              Department
            </div>
            <div style={{ fontWeight: 750 }}>{profileData.department}</div>
          </Col>
          <Col md={6} className="mb-3">
            <div style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>
              Semester
            </div>
            <div style={{ fontWeight: 750 }}>{profileData.semester}</div>
          </Col>
          <Col md={6} className="mb-3">
            <div style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>
              Dues Status
            </div>
            <div>
              <span
                className={`badge ${
                  profileData.duesCleared ? 'bg-success' : 'bg-danger'
                }`}
              >
                {profileData.duesCleared ? 'Cleared' : 'Pending'}
              </span>
            </div>
          </Col>
          <Col md={6} className="mb-3">
            <div style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>
              Account Type
            </div>
            <div style={{ fontWeight: 750, textTransform: 'capitalize' }}>
              {profileData.role}
            </div>
          </Col>
        </Row>
      </div>

      <div className="glass p-4 fade-in-up">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div style={{ fontWeight: 850, fontSize: 18 }}>Account Settings</div>
        </div>
        <Row className="mb-3">
          <Col md={12}>
            <Button className="btn-soft me-2" variant="outline-light">
              <i className="bi bi-key me-2"></i>
              Change Password
            </Button>
            <Button className="btn-soft" variant="outline-light">
              <i className="bi bi-envelope me-2"></i>
              Update Email Preferences
            </Button>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Profile;

