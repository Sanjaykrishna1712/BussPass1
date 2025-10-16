// context/ConductorAuthContext.js - UPDATED
import React, { createContext, useContext, useState, useEffect } from 'react';
import { conductorApi, conductorToken } from '../services/api';

const ConductorAuthContext = createContext();

export const useConductorAuth = () => {
  const context = useContext(ConductorAuthContext);
  if (!context) {
    throw new Error('useConductorAuth must be used within a ConductorAuthProvider');
  }
  return context;
};

export const ConductorAuthProvider = ({ children }) => {
  const [conductor, setConductor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = conductorToken.get();
    console.log('Auth check - Token exists:', !!token);
    
    if (token) {
      verifyToken(token);
    } else {
      console.log('No token found, setting loading to false');
      setLoading(false);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      // Set the token in the API client headers
      conductorApi.defaults.headers.Authorization = `Bearer ${token}`;
      
      const response = await conductorApi.get('/api/auth/conductor/verify');
      if (response.data.success) {
        setConductor(response.data.conductor);
      } else {
        // Token is invalid
        logout();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      // Clear any existing token first
      conductorToken.remove();
      delete conductorApi.defaults.headers.Authorization;
      
      const response = await conductorApi.post('/api/auth/conductor/login', credentials);
      
      if (response.data.success) {
        const { token: newToken, conductor: conductorData } = response.data;
        
        // Store token
        conductorToken.set(newToken);
        setConductor(conductorData);
        
        // Set authorization header for future requests
        conductorApi.defaults.headers.Authorization = `Bearer ${newToken}`;
        
        return { success: true };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, message };
    }
  };

  const logout = () => {
    conductorToken.remove();
    setConductor(null);
    delete conductorApi.defaults.headers.Authorization;
  };

  const value = {
    conductor,
    login,
    logout,
    loading
  };

  return (
    <ConductorAuthContext.Provider value={value}>
      {children}
    </ConductorAuthContext.Provider>
  );
};