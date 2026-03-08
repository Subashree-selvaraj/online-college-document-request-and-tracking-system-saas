import axios from 'axios';

// Compute API base URL with robust fallbacks for production and local dev
let API_URL = process.env.REACT_APP_API_URL;
if (!API_URL && typeof window !== 'undefined') {
  const host = window.location.hostname;
  if (host === 'campusledger.onrender.com') {
    API_URL = 'https://online-college-docs-backend.onrender.com/api';
  } else if (host === 'localhost' || host === '127.0.0.1') {
    API_URL = 'http://localhost:5000/api';
  } else {
    // Safe default for non-local hosts
    API_URL = 'https://online-college-docs-backend.onrender.com/api';
  }
}
if (!API_URL) {
  API_URL = 'http://localhost:5000/api';
}

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
});

// Add request interceptor to include auth token in headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Set token in x-auth-token header as expected by backend
      config.headers['x-auth-token'] = token;
      
      // Also set Authorization header for compatibility
      if (!config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // If we're sending FormData, allow the browser to set the boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else if (
      config.data !== undefined &&
      !config.headers['Content-Type'] &&
      ['post', 'put', 'patch'].includes((config.method || '').toLowerCase())
    ) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API calls
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/users/me'),
};

// Document requests API calls
export const requestsAPI = {
  // Student endpoints
  createRequest: (requestData) => api.post('/requests', requestData),
  getStudentRequests: (studentId) => api.get(`/requests/student/${studentId}`),
  getRequestById: (requestId) => api.get(`/requests/${requestId}`),
  downloadDocument: (requestId) => {
    const token = localStorage.getItem('token');
    return `${API_URL}/requests/${requestId}/download?token=${token}`;
  },
  
  // Admin endpoints
  getAllRequests: () => api.get('/requests'),
  updateRequestStatus: (requestId, statusData) => api.put(`/requests/${requestId}/status`, statusData),
  uploadDocument: (requestId, documentData) => api.post(`/requests/${requestId}/upload`, documentData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  updateDocumentLink: (requestId, data) => api.put(`/requests/${requestId}/document-link`, data),
  // Principal endpoints
  principalApprove: (requestId, data) => api.put(`/requests/${requestId}/principal-approve`, data),
  principalReject: (requestId, data) => api.put(`/requests/${requestId}/principal-reject`, data),
  // HOD endpoints
  hodApprove: (requestId, data) => api.put(`/requests/${requestId}/hod-approve`, data),
  hodReject: (requestId, data) => api.put(`/requests/${requestId}/hod-reject`, data),
  // Timeline, comments, resubmit
  getTimeline: (requestId) => api.get(`/requests/${requestId}/timeline`),
  getComments: (requestId) => api.get(`/requests/${requestId}/comments`),
  addComment: (requestId, data) => api.post(`/requests/${requestId}/comments`, data),
  resubmit: (requestId, data) => api.post(`/requests/${requestId}/resubmit`, data),
};

// Documents API calls
export const documentsAPI = {
  getDocumentTypes: () => api.get('/documents'),
  getAllDocumentTypes: () => api.get('/documents/types'),
  getDocumentTypeById: (id) => api.get(`/documents/types/${id}`),
  createDocumentType: (data) => api.post('/documents/types', data),
  updateDocumentType: (id, data) => api.put(`/documents/types/${id}`, data),
  deleteDocumentType: (id) => api.delete(`/documents/types/${id}`)
};

// User management API calls (admin only)
export const userAPI = {
  getAllUsers: () => api.get('/users'),
  updateUserEligibility: (userId, eligibilityData) => api.put(`/users/${userId}/eligibility`, eligibilityData),
  getStudentById: (studentId) => api.get(`/users/${studentId}`),
};

// Notifications API
export const notificationsAPI = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
};

export default api;
