import axios from 'axios';

const adminApi = axios.create({
  baseURL: '/api/admin',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('admin');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const adminAuthAPI = {
  login: (data) => adminApi.post('/auth/login', data),
  getMe: () => adminApi.get('/auth/me'),
};

// Users
export const adminUsersAPI = {
  getAll: (params) => adminApi.get('/users', { params }),
  getById: (userId) => adminApi.get(`/users/${userId}`),
  getActivity: (userId) => adminApi.get(`/users/${userId}/activity`),
  suspend: (userId, reason) => adminApi.put(`/users/${userId}/suspend`, { reason }),
  reinstate: (userId, reason) => adminApi.put(`/users/${userId}/reinstate`, { reason }),
};

// Mentorships
export const adminMentorshipsAPI = {
  getAll: (params) => adminApi.get('/mentorships', { params }),
  getDetails: (mentorshipId) => adminApi.get(`/mentorships/${mentorshipId}`),
  pause: (mentorshipId, reason) => adminApi.put(`/mentorships/${mentorshipId}/pause`, { reason }),
  complete: (mentorshipId, reason) => adminApi.put(`/mentorships/${mentorshipId}/complete`, { reason }),
};

// Platform
export const adminPlatformAPI = {
  getStats: () => adminApi.get('/platform/stats'),
};

// Audit Logs
export const adminAuditAPI = {
  getLogs: (params) => adminApi.get('/audit-logs', { params }),
  getRecent: (hours = 24) => adminApi.get('/audit-logs/recent', { params: { hours } }),
};

export default adminApi;
