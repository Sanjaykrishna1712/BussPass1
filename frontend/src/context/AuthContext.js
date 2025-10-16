import React, { createContext, useState, useEffect } from 'react';
import { verifyToken } from '../services/auth';
import axios from 'axios';
import { api } from "../services/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [completeUserData, setCompleteUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use environment variable for API base URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Helper function to construct image URLs
  const getImageUrl = (filename) => {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;
    
    if (filename.includes('applicant_photo')) {
      return `${API_BASE_URL}/uploads/applicantPhotos/${filename}`;
    }
    if (filename.includes('face_image')) {
      return `${API_BASE_URL}/faces/${filename}`;
    }
    
    return filename;
  };

  // Function to fetch complete user profile
  const fetchUserProfile = async (userId) => {
    try {
      console.log(`Fetching profile for user: ${userId}`);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.get(`${API_BASE_URL}/auth/profile/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Profile response:', response.data);
      
      if (response.data.success) {
        const userData = response.data.user;
        
        // Process image URLs
        if (userData.applicant_photo_url) {
          userData.applicant_photo_url = getImageUrl(userData.applicant_photo_url);
        }
        if (userData.face_url) {
          userData.face_url = getImageUrl(userData.face_url);
        }
        
        setCompleteUserData(userData);
        return userData;
      } else {
        throw new Error(response.data.message || 'Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setError(error.message);
      
      if (error.response && error.response.status === 404) {
        console.error('Profile endpoint not found. Please check backend routes.');
      }
      
      throw error;
    }
  };

  useEffect(() => {
    // contexts/AuthContext.js
const checkAuth = async () => {
  try {
    const token = localStorage.getItem('token');
    console.log('Auth check token:', token ? 'exists' : 'missing');
    
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }

    const response = await api.get('/auth/user');
    setUser(response.data.user);
  } catch (error) {
    console.log('Auth check failed:', error);
    
    // Handle 401 specifically - token is invalid/expired
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
      setUser(null);
    }
  } finally {
    setLoading(false);
  }
};
    checkAuth();
  }, []);

  const setAuthUser = async (session) => {
    try {
      console.log('Setting auth user:', session);
      // session: { token, user_id, name, user_type }
      if (session?.token) {
        localStorage.setItem('token', session.token);
      }
      
      setUser({
        user_id: session.user_id,
        name: session.name,
        user_type: session.user_type,
      });
      
      // Fetch complete user profile after login
      if (session.user_id) {
        await fetchUserProfile(session.user_id);
      }
    } catch (err) {
      console.error('Error in setAuthUser:', err);
      setError(err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCompleteUserData(null);
    setError(null);
  };

  const refreshUserProfile = () => {
    if (user?.user_id) {
      return fetchUserProfile(user.user_id);
    }
    return Promise.resolve(null);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      completeUserData, 
      setAuthUser, 
      logout, 
      loading,
      error,
      refreshUserProfile,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);