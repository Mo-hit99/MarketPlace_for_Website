import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api/v1` || 'http://localhost:8000/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Only set Content-Type to application/json if it's not FormData or URLSearchParams
  if (!(config.data instanceof FormData) && !(config.data instanceof URLSearchParams)) {
    config.headers['Content-Type'] = 'application/json';
  }
  
  return config;
});

export default api;
