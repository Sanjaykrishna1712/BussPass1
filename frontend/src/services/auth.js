import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests automatically
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

export const login = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    return response.data; // Return the complete response data
  } catch (error) {
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error('Login failed. Please try again.');
    }
  }
};

export const register = async (userData) => {
  const { data } = await axios.post(`${API_URL}/auth/register`, userData);
  return { user_id: data.user_id }; // only user_id is returned by backend
};

export const verifyToken = async (token) => {
  const { data } = await axios.get(`${API_URL}/auth/user`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { user_id: data.user_id, name: data.name, user_type: data.user_type };
};
export const getUserProfile = async (userId) => {
  const { data } = await api.get(`/auth/profile/${userId}`);
  return data.user;
};