import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
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

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
};

// Quiz API
export const quizAPI = {
  createQuiz: (quizData) => api.post('/quiz/createQuiz', quizData),
  getQuizzes: () => api.get('/quiz/fetchQuizList'),
  getHostQuizzes: () => api.get('/quiz/host'),
  getQuiz: (id) => api.get(`/quiz/${id}`),
  updateQuiz: (id, quizData) => api.put(`/quiz/${id}`, quizData),
  deleteQuiz: (id) => api.delete(`/quiz/${id}`),
  addQuestion: (quizId, questionData) => api.post(`/quiz/${quizId}/questions`, questionData),
  updateQuestion: (quizId, questionId, questionData) => api.put(`/quiz/${quizId}/questions/${questionId}`, questionData),
  deleteQuestion: (quizId, questionId) => api.delete(`/quiz/${quizId}/questions/${questionId}`),
};

// Category API
export const categoryAPI = {
  getCategories: () => api.get('/categories'),
  getCategoryStats: () => api.get('/categories/stats'),
  getCategory: (id) => api.get(`/categories/${id}`),
  getQuizzesByCategory: (id) => api.get(`/categories/${id}/quizzes`),
  createCategory: (categoryData) => api.post('/categories', categoryData),
  updateCategory: (id, categoryData) => api.put(`/categories/${id}`, categoryData),
  deleteCategory: (id) => api.delete(`/categories/${id}`),
};

// Session API
export const sessionAPI = {
  createSession: (quizId) => api.post('/session/start', { quizId }),
  getSession: (id) => api.get(`/session/state/${id}`),
  joinSession: (code, username) => api.post('/session/addParticipant', { code, username }),
  endSession: (id) => api.post('/session/end', { sessionId: id }),
  submitAnswer: (sessionId, questionId, answerId) =>
    api.post(`/session/${sessionId}/answer`, { questionId, answerId }),
};

export default api; 