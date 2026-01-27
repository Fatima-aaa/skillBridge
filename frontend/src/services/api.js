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
  completeMentorship: (id) => api.put(`/mentorships/${id}/complete`),
  reactivateMentorship: (id, reason) => api.put(`/mentorships/${id}/reactivate`, { reason }),
  getCompletedMentorships: () => api.get('/mentorships/completed'),
};

// Goals
export const goalAPI = {
  // Mentor creates goal for mentee
  createForMentee: (data) => api.post('/goals', data),
  getMyGoals: () => api.get('/goals'),
  getMenteeGoals: (menteeId) => api.get(`/goals/mentee/${menteeId}`),
  getOne: (id) => api.get(`/goals/${id}`),
  // Mentor updates goal status
  updateStatus: (id, status) => api.put(`/goals/${id}`, { status }),
};

// Progress
export const progressAPI = {
  create: (goalId, content) => api.post(`/progress/${goalId}`, { content }),
  getByGoal: (goalId) => api.get(`/progress/${goalId}`),
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
