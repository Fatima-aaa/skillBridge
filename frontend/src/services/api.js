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

// Helper to build query params
const buildParams = (params = {}) => {
  const cleanParams = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleanParams[key] = value;
    }
  });
  return cleanParams;
};

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Mentor Profiles
export const mentorProfileAPI = {
  getAll: (params = {}) => api.get('/mentor-profiles', { params: buildParams(params) }),
  getOne: (id) => api.get(`/mentor-profiles/${id}`),
  getMyProfile: () => api.get('/mentor-profiles/me'),
  create: (data) => api.post('/mentor-profiles', data),
  update: (data) => api.put('/mentor-profiles', data),
};

// Mentorship
export const mentorshipAPI = {
  sendRequest: (data) => api.post('/mentorships', data),
  getMyRequests: (params = {}) => api.get('/mentorships/my-requests', { params: buildParams(params) }),
  getIncomingRequests: (params = {}) => api.get('/mentorships/requests', { params: buildParams(params) }),
  updateStatus: (id, status) => api.put(`/mentorships/${id}`, { status }),
  getActiveMentorship: () => api.get('/mentorships/active'),
  getMentees: () => api.get('/mentorships/mentees'),
  completeMentorship: (id) => api.put(`/mentorships/${id}/complete`),
  reactivateMentorship: (id, reason) => api.put(`/mentorships/${id}/reactivate`, { reason }),
  getCompletedMentorships: (params = {}) => api.get('/mentorships/completed', { params: buildParams(params) }),
};

// Goals
export const goalAPI = {
  // Mentor creates goal for mentee
  createForMentee: (data) => api.post('/goals', data),
  getMyGoals: (params = {}) => api.get('/goals', { params: buildParams(params) }),
  getMenteeGoals: (menteeId, params = {}) => api.get(`/goals/mentee/${menteeId}`, { params: buildParams(params) }),
  getOne: (id) => api.get(`/goals/${id}`),
  // Mentor updates goal status
  updateStatus: (id, status) => api.put(`/goals/${id}`, { status }),
};

// Progress
export const progressAPI = {
  create: (goalId, content) => api.post(`/progress/${goalId}`, { content }),
  getByGoal: (goalId, params = {}) => api.get(`/progress/${goalId}`, { params: buildParams(params) }),
};

// Weekly Check-ins
export const checkInAPI = {
  submit: (goalId, data) => api.post(`/check-ins/${goalId}`, data),
  getMyCheckInsForGoal: (goalId) => api.get(`/check-ins/goal/${goalId}`),
  getAllMyCheckIns: (params = {}) => api.get('/check-ins/my', { params: buildParams(params) }),
  getMenteeCheckInsForGoal: (menteeId, goalId) => api.get(`/check-ins/mentee/${menteeId}/goal/${goalId}`),
  getMenteeAllCheckIns: (menteeId, params = {}) => api.get(`/check-ins/mentee/${menteeId}`, { params: buildParams(params) }),
  getMenteeConsistencySummary: (menteeId, weeks = 12) => api.get(`/check-ins/mentee/${menteeId}/summary`, { params: { weeks } }),
  getGoalTimeline: (goalId, weeks = 12) => api.get(`/check-ins/timeline/${goalId}`, { params: { weeks } }),
};

// Reviews (Learner → Mentor ratings)
export const reviewAPI = {
  submitRating: (mentorshipId, rating) => api.post('/reviews', { mentorshipId, rating }),
  getMentorRatings: (mentorId) => api.get(`/reviews/mentor/${mentorId}`),
  getMySubmittedRatings: () => api.get('/reviews/my'),
  canReview: (mentorshipId) => api.get(`/reviews/can-review/${mentorshipId}`),
};

// Feedback (Mentor → Learner ratings)
export const feedbackAPI = {
  submitRating: (mentorshipId, rating) => api.post('/feedback', { mentorshipId, rating }),
  getLearnerRatings: (learnerId) => api.get(`/feedback/learner/${learnerId}`),
  getMySubmittedRatings: () => api.get('/feedback/my'),
  canSubmit: (mentorshipId) => api.get(`/feedback/can-submit/${mentorshipId}`),
};

export default api;
