import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('localhost', window.location.hostname),
  timeout: 90000, // 90 seconds timeout to handle server cold start on free hosting
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach auth token from localStorage to every request
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

// Response interceptor: handle 401 (token missing / expired) globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stale auth data from storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Redirect to login only if not already there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
