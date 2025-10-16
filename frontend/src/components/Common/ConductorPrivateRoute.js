// components/Common/ConductorPrivateRoute.js
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useConductorAuth } from '../../context/ConductorAuthContext';
import './ConductorPrivateRoute.css';

const ConductorPrivateRoute = ({ children }) => {
  const { conductor, loading } = useConductorAuth();
  const location = useLocation();

  useEffect(() => {
    console.log('PrivateRoute - Loading:', loading, 'Conductor:', conductor);
  }, [loading, conductor]);

  if (loading) {
    console.log('PrivateRoute - Showing loading state');
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  if (!conductor) {
    console.log('PrivateRoute - No conductor, redirecting to login');
    return <Navigate to="/conductor-login" state={{ from: location }} replace />;
  }

  console.log('PrivateRoute - Access granted, showing children');
  return children;
};

export default ConductorPrivateRoute;