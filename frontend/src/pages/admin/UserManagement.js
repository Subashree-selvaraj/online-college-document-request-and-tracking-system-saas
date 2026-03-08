import React, { useState, useEffect } from 'react';
import { Row, Col, Table, Form, Button, Badge, Modal, Spinner, Alert } from 'react-bootstrap';
import { userAPI } from '../../api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [duesCleared, setDuesCleared] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAllUsers();
      setUsers(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle opening the modal to update user eligibility
  const handleUpdateEligibility = (user) => {
    setSelectedUser(user);
    setDuesCleared(user.duesCleared);
    setShowModal(true);
  };

  // Handle closing the modal
  const handleModalClose = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  // Handle submitting the eligibility update
  const handleSubmitEligibility = async () => {
    try {
      await userAPI.updateUserEligibility(selectedUser._id, { duesCleared });
      
      // Update the user in the local state
      setUsers(users.map(user => 
        user._id === selectedUser._id ? { ...user, duesCleared } : user
      ));
      
      handleModalClose();
    } catch (err) {
      console.error('Error updating user eligibility:', err);
      setError('Failed to update user eligibility. Please try again.');
    }
  };

  // Filter users based on search term, role, and department
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    const matchesDepartment = 
      filterDepartment === 'all' || 
      (user.department && user.department === filterDepartment);
    
    return matchesSearch && matchesRole && matchesDepartment;
  });

  // Get unique departments for filter dropdown
  const departments = [...new Set(users
    .filter(user => user.department)
    .map(user => user.department))];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">User Management</div>
          <div className="page-subtitle">
            View and manage students and admins. Update dues status for students.
          </div>
        </div>
        <Button
          variant="outline-light"
          className="btn-soft"
          onClick={fetchUsers}
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner as="span" animation="border" size="sm" className="me-2" />
              Loading...
            </>
          ) : (
            'Refresh'
          )}
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="glass p-3 mb-4 fade-in-up">
        <Row className="g-2 mb-3">
          <Col md={3}>
            <Form.Control
              type="text"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Col>
          <Col md={3}>
            <Form.Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="admin">Admins</option>
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              disabled={departments.length === 0}
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </Form.Select>
          </Col>
        </Row>
      </div>

      <div className="glass table-wrap fade-in-up">
        <div className="p-3">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" className="text-light" />
              <p className="mt-2 text-muted">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-people fs-1" />
              <p className="mt-2">No users found matching the criteria.</p>
            </div>
          ) : (
            <Table responsive hover className="table-glass align-middle mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Dues Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user._id}>
                    <td className="fw-medium">{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <Badge bg={user.role === 'admin' ? 'danger' : 'primary'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td>{user.department || '—'}</td>
                    <td>{user.semester || '—'}</td>
                    <td>
                      {user.role === 'student' ? (
                        <Badge bg={user.duesCleared ? 'success' : 'warning'}>
                          {user.duesCleared ? 'Cleared' : 'Pending'}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {user.role === 'student' && (
                        <Button
                          variant="outline-light"
                          size="sm"
                          className="btn-soft"
                          onClick={() => handleUpdateEligibility(user)}
                        >
                          Update Eligibility
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>

      <Modal show={showModal} onHide={handleModalClose} centered className="modal-dark">
        <Modal.Header closeButton>
          <Modal.Title>Update Eligibility Status</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <>
              <p><strong>Student:</strong> {selectedUser.name}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>Department:</strong> {selectedUser.department}</p>
              <p><strong>Semester:</strong> {selectedUser.semester}</p>
              
              <Form.Group className="mb-3">
                <Form.Label>Dues Status</Form.Label>
                <Form.Select 
                  value={duesCleared.toString()}
                  onChange={(e) => setDuesCleared(e.target.value === 'true')}
                >
                  <option value="true">Cleared</option>
                  <option value="false">Pending</option>
                </Form.Select>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleModalClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmitEligibility}>
            Update Status
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UserManagement;