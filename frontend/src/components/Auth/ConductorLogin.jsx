// components/Conductor/ConductorLogin.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useConductorAuth } from '../../context/ConductorAuthContext';
import './ConductorLogin.css';

const ConductorLogin = () => {
  const [credentials, setCredentials] = useState({
    conductorId: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, conductor, loading: authLoading } = useConductorAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('Login page - Conductor state:', conductor, 'Auth loading:', authLoading);
    
    // If user is already logged in, redirect to dashboard
    if (conductor && !authLoading) {
      console.log('User already logged in, redirecting to dashboard');
      const from = location.state?.from?.pathname || '/conductor/ConductorDashboard';
      navigate(from, { replace: true });
    }
  }, [conductor, authLoading, navigate, location]);

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!credentials.conductorId || !credentials.password) {
      setError('Please enter both conductor ID and password');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      console.log('Submitting login form with:', credentials);
      const result = await login(credentials);
      console.log('Login result:', result);
      
      if (result.success) {
        const from = location.state?.from?.pathname || '/conductor/ConductorDashboard';
        console.log('Login successful, navigating to:', from);
        navigate(from, { replace: true });
      } else {
        setError(result.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading if auth is still checking
  if (authLoading) {
    return (
      <div className="conductor-login-container">
        <div className="conductor-login-card">
          <div className="loading-spinner"></div>
          <p>Checking authentication status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="conductor-login-container">
      <div className="conductor-login-card">
        <h2>Conductor Login</h2>
        <form onSubmit={handleSubmit} className="conductor-login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="conductorId">Conductor ID</label>
            <input 
              id="conductorId" 
              required 
              placeholder="Enter your conductor ID" 
              type="text" 
              value={credentials.conductorId}  // Fixed: use credentials.conductorId
              name="conductorId"
              autoComplete="username"
              onChange={handleChange}  // Fixed: use handleChange
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`login-button ${loading ? 'loading' : ''}`}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConductorLogin;