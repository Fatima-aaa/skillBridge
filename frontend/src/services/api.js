import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Mentor Profiles
export const mentorProfileAPI = {
  getAll: () => api.get('/mentor-profiles'),
  getOne: (id) => api.get(`/mentor-profiles/${id}`),
  getMyProfile: () => api.get('/mentor-profiles/me'),
  create: (data) => api.post('/mentor-profiles', data),
  update: (data) => api.put('/mentor-profiles', data),
};

// Mentorship
export const mentorshipAPI = {
  sendRequest: (data) => api.post('/mentorships', data),
  getMyRequests: () => api.get('/mentorships/my-requests'),
  getIncomingRequests: () => api.get('/mentorships/requests'),
  updateStatus: (id, status) => api.put(`/mentorships/${id}`, { status }),
  getActiveMentorship: () => api.get('/mentorships/active'),
  getMentees: () => api.get('/mentorships/mentees'),
};

// Goals
export const goalAPI = {
  create: (data) => api.post('/goals', data),
  getMyGoals: () => api.get('/goals'),
  getMenteeGoals: (menteeId) => api.get(`/goals/mentee/${menteeId}`),
  getOne: (id) => api.get(`/goals/${id}`),
  updateStatus: (id, status) => api.put(`/goals/${id}`, { status }),
};

// Progress
export const progressAPI = {
  create: (goalId, content) => api.post(`/progress/${goalId}`, { content }),
  getByGoal: (goalId) => api.get(`/progress/${goalId}`),
};

export default api;
