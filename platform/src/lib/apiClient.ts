import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, logout as auth0Logout } from './auth0';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting access token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await auth0Logout();
      } catch (logoutError) {
        console.error('Logout error:', logoutError);
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
