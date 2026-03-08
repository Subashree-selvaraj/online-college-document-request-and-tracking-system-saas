import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Button, Alert, Row, Col } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { requestsAPI, documentsAPI } from '../../api';
import emailService from '../../utils/emailService';

const NewRequest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documentTypes, setDocumentTypes] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eligibilityError, setEligibilityError] = useState(null);

  useEffect(() => {
    const fetchDocumentTypes = async () => {
      try {
        setLoading(true);
        const response = await documentsAPI.getDocumentTypes();
        setDocumentTypes(response.data);
      } catch (err) {
        console.error('Error fetching document types:', err);
        setError('Failed to load document types. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentTypes();
  }, []);

  const handleDocumentTypeChange = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      setSelectedDocument(null);
      return;
    }

    const selected = documentTypes.find((doc) => doc._id === selectedId);
    setSelectedDocument(selected);
    checkEligibility(selected);
  };

  const checkEligibility = (document) => {
    setEligibilityError(null);

    if (!document) return;

    if (!document.eligibilityRules || !Array.isArray(document.eligibilityRules)) {
      return;
    }

    for (const rule of document.eligibilityRules) {
      if (rule === 'duesCleared' && !user.duesCleared) {
        setEligibilityError(
          'You have pending dues. Please clear them before requesting this document.'
        );
        return;
      }

      if (rule.includes('semester') && rule.includes('>=')) {
        const requiredSemester = parseInt(rule.split('>=')[1].trim(), 10);
        if (user.semester < requiredSemester) {
          setEligibilityError(
            `You must be in semester ${requiredSemester} or above to request this document.`
          );
          return;
        }
      }
    }
  };

  const generateValidationSchema = () => {
    if (!selectedDocument) return {};

    const schemaFields = {};

    selectedDocument.requiredFields.forEach((field) => {
      const fieldName = field.name;
      const isRequired = field.required;

      if (isRequired) {
        switch (field.type) {
          case 'text':
          case 'textarea':
            schemaFields[fieldName] = Yup.string().required(`${field.label} is required`);
            break;
          case 'number':
            schemaFields[fieldName] = Yup.number()
              .required(`${field.label} is required`)
              .min(
                1,
                field.name === 'numberOfCopies'
                  ? 'At least 1 copy is required'
                  : `Minimum value is 1`
              );
            break;
          case 'date':
            schemaFields[fieldName] = Yup.date()
              .required(`${field.label} is required`)
              .min(new Date(), 'Date cannot be in the past');
            break;
          case 'select':
            schemaFields[fieldName] = Yup.string().required(`${field.label} is required`);
            break;
          case 'checkbox':
            schemaFields[fieldName] = Yup.boolean().oneOf(
              [true],
              `${field.label} is required`
            );
            break;
          case 'file':
            schemaFields[fieldName] = Yup.mixed().required(`${field.label} is required`);
            break;
          default:
            break;
        }
      } else {
        switch (field.type) {
          case 'text':
          case 'textarea':
            schemaFields[fieldName] = Yup.string();
            break;
          case 'number':
            schemaFields[fieldName] = Yup.number();
            break;
          case 'date':
            schemaFields[fieldName] = Yup.date();
            break;
          case 'select':
            schemaFields[fieldName] = Yup.string();
            break;
          case 'checkbox':
            schemaFields[fieldName] = Yup.boolean();
            break;
          case 'file':
            schemaFields[fieldName] = Yup.mixed();
            break;
          default:
            break;
        }
      }
    });

    return Yup.object().shape(schemaFields);
  };

  const generateInitialValues = () => {
    if (!selectedDocument) return {};

    const initialValues = {};

    selectedDocument.requiredFields.forEach((field) => {
      const fieldName = field.name;

      switch (field.type) {
        case 'text':
        case 'textarea':
        case 'select':
          initialValues[fieldName] = '';
          break;
        case 'number':
          initialValues[fieldName] = field.name === 'numberOfCopies' ? 1 : '';
          break;
        case 'date':
          initialValues[fieldName] = '';
          break;
        case 'checkbox':
          initialValues[fieldName] = false;
          break;
        case 'file':
          initialValues[fieldName] = null;
          break;
        default:
          initialValues[fieldName] = '';
          break;
      }
    });

    return initialValues;
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      if (eligibilityError) {
        return;
      }

      const requestData = {
        studentId: user._id || user.id,
        documentType: selectedDocument.name,
        formData: values,
        status: 'Pending',
        createdAt: new Date()
      };

      await requestsAPI.createRequest(requestData);

      await emailService.sendNewRequestEmail(
        'admin@college.edu',
        user.name,
        selectedDocument.name
      );

      await emailService.sendStatusUpdateEmail(
        user.email,
        user.name,
        selectedDocument.name,
        'Submitted',
        'Your request has been submitted successfully and is pending review.'
      );

      navigate('/student/dashboard', {
        state: { successMessage: 'Document request submitted successfully!' }
      });
    } catch (err) {
      console.error('Error submitting request:', err);
      setError('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center p-5">Loading...</div>;
  }

  return (
    <div className="page new-request">
      <div className="page-header">
        <div>
          <div className="page-title">Request a Document</div>
          <div className="page-subtitle">
            Choose a document type and submit the required details.
          </div>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="glass p-4 mb-4 fade-in-up">
        <h5 className="mb-3" style={{ fontWeight: 850 }}>
          Select Document Type
        </h5>

        <select
          className="form-select mb-4"
          onChange={handleDocumentTypeChange}
          defaultValue=""
        >
          <option value="">Select a document type</option>
          {Array.from(new Set(documentTypes.map((doc) => doc.category)))
            .sort()
            .map((category) => (
              <optgroup key={category} label={category || 'Other Documents'}>
                {documentTypes
                  .filter((doc) => doc.category === category)
                  .map((doc) => (
                    <option key={doc._id} value={doc._id}>
                      {doc.name}
                    </option>
                  ))}
              </optgroup>
            ))}
        </select>

        {eligibilityError && <Alert variant="warning">{eligibilityError}</Alert>}

        {selectedDocument && !eligibilityError && (
          <div className="mt-4">
            <h5 className="mb-3" style={{ fontWeight: 850 }}>
              Request Form
            </h5>

            <Formik
              initialValues={generateInitialValues()}
              validationSchema={generateValidationSchema()}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({ isSubmitting }) => (
                <Form>
                  <Row>
                    {selectedDocument.requiredFields.map((field) => {
                      const { name, label, type, required, options } = field;
                      const colSize = ['textarea', 'file'].includes(type) ? 12 : 6;

                      return (
                        <Col md={colSize} className="mb-3" key={name}>
                          <label htmlFor={name} className="form-label">
                            {label}{' '}
                            {required && <span className="text-danger">*</span>}
                          </label>

                          {type === 'text' && (
                            <Field
                              type="text"
                              name={name}
                              className="form-control"
                              placeholder={`Enter ${label.toLowerCase()}`}
                            />
                          )}

                          {type === 'textarea' && (
                            <Field
                              as="textarea"
                              name={name}
                              className="form-control"
                              placeholder={`Enter ${label.toLowerCase()}`}
                              rows="3"
                            />
                          )}

                          {type === 'number' && (
                            <Field
                              type="number"
                              name={name}
                              className="form-control"
                              min="1"
                              max={name === 'numberOfCopies' ? '10' : undefined}
                            />
                          )}

                          {type === 'date' && (
                            <Field
                              type="date"
                              name={name}
                              className="form-control"
                              min={new Date().toISOString().split('T')[0]}
                            />
                          )}

                          {type === 'select' && options && (
                            <Field as="select" name={name} className="form-select">
                              <option value="">Select {label}</option>
                              {options.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </Field>
                          )}

                          {type === 'checkbox' && (
                            <div className="form-check mt-2">
                              <Field
                                type="checkbox"
                                name={name}
                                className="form-check-input"
                                id={name}
                              />
                              <label className="form-check-label" htmlFor={name}>
                                {label}
                              </label>
                            </div>
                          )}

                          {type === 'file' && (
                            <Field name={name}>
                              {({ form, field }) => (
                                <div>
                                  <input
                                    type="file"
                                    className="form-control"
                                    onChange={(event) => {
                                      form.setFieldValue(
                                        field.name,
                                        event.currentTarget.files[0]
                                      );
                                    }}
                                  />
                                </div>
                              )}
                            </Field>
                          )}

                          <ErrorMessage
                            name={name}
                            component="div"
                            className="text-danger mt-1"
                          />
                        </Col>
                      );
                    })}
                  </Row>

                  <div className="mt-3">
                    <Button
                      type="submit"
                      className="btn-brand"
                      disabled={isSubmitting || !!eligibilityError}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </Button>
                    <Button
                      variant="outline-light"
                      className="btn-soft ms-2"
                      onClick={() => navigate('/student/dashboard')}
                    >
                      Cancel
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewRequest;

