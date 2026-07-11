import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // Long timeout for synchronous Gemini requests
});

// Response interceptor to handle token refresh on 401 Unauthorized errors
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      const url = originalRequest.url || '';

      // Do not attempt refresh token rotation for basic authentication endpoints
      const isAuthEndpoint =
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/logout') ||
        url.includes('/auth/refresh-token');

      if (!isAuthEndpoint) {
        originalRequest._retry = true;

        try {
          // Call refresh token rotation endpoint
          await axiosClient.post('/auth/refresh-token');
          // Retry the original failed request
          return axiosClient(originalRequest);
        } catch (refreshError) {
          // Dispatch browser event to notify AuthContext to clear credentials
          const event = new CustomEvent('auth:session-expired');
          window.dispatchEvent(event);
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
