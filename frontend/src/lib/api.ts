import axios from 'axios';

let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
// Clean trailing slashes
apiUrl = apiUrl.replace(/\/+$/, '');
// Ensure it ends with /api in case the user provided just the backend root URL
if (!apiUrl.endsWith('/api')) {
  apiUrl += '/api';
}

const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true, // Crucial for sending HttpOnly cookies
});

// Interceptor to handle unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if not authenticated
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
