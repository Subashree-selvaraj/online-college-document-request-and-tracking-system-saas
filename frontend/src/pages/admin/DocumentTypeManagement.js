import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Modal, Alert } from 'react-bootstrap';
import { documentsAPI } from '../../api';

const DocumentTypeManagement = () => {
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentDocType, setCurrentDocType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    requiredFields: '',
    processingTime: ''
  });
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch all document types
  const fetchDocumentTypes = async () => {
    try {
      setLoading(true);
      const response = await documentsAPI.getAllDocumentTypes();
      setDocumentTypes(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching document types:', err);
      setError('Failed to load document types. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Reset form data
  const resetFormData = () => {
    setFormData({
      name: '',
      description: '',
      requiredFields: '',
      processingTime: ''
    });
  };

  // Open add modal
  const handleAddClick = () => {
    resetFormData();
    setShowAddModal(true);
  };

  // Open edit modal
  const handleEditClick = (docType) => {
    setCurrentDocType(docType);
    setFormData({
      name: docType.name,
      description: docType.description,
      requiredFields: docType.requiredFields.join(', '),
      processingTime: docType.processingTime
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const handleDeleteClick = (docType) => {
    setCurrentDocType(docType);
    setShowDeleteModal(true);
  };

  // Add new document type
  const handleAddSubmit = async () => {
    try {
      const requiredFieldsArray = formData.requiredFields
        .split(',')
        .map(field => field.trim())
        .filter(field => field !== '');

      const newDocType = {
        name: formData.name,
        description: formData.description,
        requiredFields: requiredFieldsArray,
        processingTime: formData.processingTime
      };

      await documentsAPI.createDocumentType(newDocType);
      setShowAddModal(false);
      setSuccessMessage('Document type added successfully!');
      fetchDocumentTypes();
      resetFormData();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error adding document type:', err);
      setError('Failed to add document type. Please try again.');
    }
  };

  // Update document type
  const handleEditSubmit = async () => {
    try {
      const requiredFieldsArray = formData.requiredFields
        .split(',')
        .map(field => field.trim())
        .filter(field => field !== '');

      const updatedDocType = {
        name: formData.name,
        description: formData.description,
        requiredFields: requiredFieldsArray,
        processingTime: formData.processingTime
      };

      await documentsAPI.updateDocumentType(currentDocType._id, updatedDocType);
      setShowEditModal(false);
      setSuccessMessage('Document type updated successfully!');
      fetchDocumentTypes();
      resetFormData();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error updating document type:', err);
      setError('Failed to update document type. Please try again.');
    }
  };

  // Delete document type
  const handleDeleteSubmit = async () => {
    try {
      await documentsAPI.deleteDocumentType(currentDocType._id);
      setShowDeleteModal(false);
      setSuccessMessage('Document type deleted successfully!');
      fetchDocumentTypes();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error deleting document type:', err);
      setError('Failed to delete document type. Please try again.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Document Type Management</div>
          <div className="page-subtitle">
            Manage document types available for student requests.
          </div>
        </div>
        <Button variant="primary" className="btn-brand" onClick={handleAddClick}>
          <i className="bi bi-plus-circle me-2" /> Add Document Type
        </Button>
      </div>

      {successMessage && (
        <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="glass table-wrap fade-in-up">
        <div className="p-3">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-light" role="status" />
              <p className="mt-2 text-muted">Loading document types...</p>
            </div>
          ) : documentTypes.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-file-earmark-x fs-1" />
              <p className="mt-2">No document types found. Add one to get started.</p>
              <Button variant="primary" className="btn-brand mt-2" onClick={handleAddClick}>
                Add Document Type
              </Button>
            </div>
          ) : (
            <Table responsive hover className="table-glass align-middle mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Required Fields</th>
                  <th>Processing Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documentTypes.map((docType) => (
                  <tr key={docType._id}>
                    <td className="fw-medium">{docType.name}</td>
                    <td>{docType.description}</td>
                    <td>
                      {docType.requiredFields.map((field, index) => (
                        <span key={index} className="badge chip me-1">
                          {field}
                        </span>
                      ))}
                    </td>
                    <td>{docType.processingTime}</td>
                    <td>
                      <Button
                        variant="outline-light"
                        size="sm"
                        className="btn-soft me-2"
                        onClick={() => handleEditClick(docType)}
                      >
                        <i className="bi bi-pencil" />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteClick(docType)}
                      >
                        <i className="bi bi-trash" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>

      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered className="modal-dark">
        <Modal.Header closeButton>
          <Modal.Title>Add New Document Type</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Transcript, Certificate, etc."
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of the document type"
                rows={3}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Required Fields</Form.Label>
              <Form.Control
                type="text"
                name="requiredFields"
                value={formData.requiredFields}
                onChange={handleInputChange}
                placeholder="Comma-separated list of required fields"
                required
              />
              <Form.Text className="text-muted">
                Enter field names separated by commas (e.g., studentId, semester, year)
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Processing Time</Form.Label>
              <Form.Control
                type="text"
                name="processingTime"
                value={formData.processingTime}
                onChange={handleInputChange}
                placeholder="e.g., 3-5 working days"
                required
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddSubmit}>
            Add Document Type
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered className="modal-dark">
        <Modal.Header closeButton>
          <Modal.Title>Edit Document Type</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Required Fields</Form.Label>
              <Form.Control
                type="text"
                name="requiredFields"
                value={formData.requiredFields}
                onChange={handleInputChange}
                required
              />
              <Form.Text className="text-muted">
                Enter field names separated by commas (e.g., studentId, semester, year)
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Processing Time</Form.Label>
              <Form.Control
                type="text"
                name="processingTime"
                value={formData.processingTime}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleEditSubmit}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered className="modal-dark">
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the document type "{currentDocType?.name}"?
          This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteSubmit}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DocumentTypeManagement;