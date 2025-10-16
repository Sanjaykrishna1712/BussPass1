// Dashboard.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [passInfo, setPassInfo] = useState(null);
  const [tripInfo, setTripInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [passResponse, tripResponse] = await Promise.all([
        api.get('/api/user/pass-info'),
        api.get('/api/user/trip-history')
      ]);

      if (passResponse.data.success) {
        setPassInfo(passResponse.data.user);
      }

      if (tripResponse.data.success) {
        setTripInfo(tripResponse.data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return 0;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

if (loading) {
  return (
    <div className="dashboard-content">
      <div className="loading-spinner">
        <div className="spinner-container">
          <div className="spinner-circle"></div>
          <div className="spinner-orbiter">
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
          </div>
        </div>
        <p>Loading...</p>
      </div>
    </div>
  );
}

  const daysRemaining = passInfo ? getDaysRemaining(passInfo.pass_expiry) : 0;
  const userAge = calculateAge(passInfo?.dob);

  return (
    <div className="dashboard-content">
      <div className="welcome-card">
        <div className="welcome-header">
          <div>
            <h2>Welcome back, {user?.name}!</h2>
            <p className="user-type">{user?.user_type} • {userAge} years</p>
          </div>
          {passInfo?.applicant_photo_filename && (
            <img 
              src={`http://localhost:5000/uploads/applicantPhotos/${passInfo.applicant_photo_filename}`} 
              alt="Profile" 
              className="user-avatar"
            />
          )}
        </div>
        
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-ticket-alt"></i>
            </div>
            <h3>Pass Status</h3>
            <div className={`status-badge ${passInfo?.Pass_Status ? 'active' : 'inactive'}`}>
              {passInfo?.Pass_Status ? 'ACTIVE' : 'INACTIVE'}
            </div>
            {passInfo?.pass_expiry && (
              <p>Valid until: {new Date(passInfo.pass_expiry).toLocaleDateString()}</p>
            )}
            <button 
              className="view-pass" 
              onClick={() => navigate("/pass")}
              disabled={!passInfo?.Pass_Status}
            >
              View Pass
            </button>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-bus"></i>
            </div>
            <h3>Recent Trips</h3>
            <p className="trip-count">{tripInfo?.total_trips || 0} trips this week</p>
            <p className="days-remaining">
              {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Pass expired'}
            </p>
            <button className="view-history" onClick={() => navigate("/history")}>
              View History
            </button>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-route"></i>
            </div>
            <h3>Travel Route</h3>
            {passInfo?.From && passInfo?.To ? (
              <>
                <p className="route-info">
                  <span className="from-to">{passInfo.From}</span>
                  <i className="fas fa-arrow-right"></i>
                  <span className="from-to">{passInfo.To}</span>
                </p>
                <p className="pass-type">{passInfo.pass_type} Pass</p>
              </>
            ) : (
              <p>No route configured</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button 
            className="action-btn renew-btn"
            onClick={() => navigate("/pass")}
          >
            <i className="fas fa-sync-alt"></i>
            Renew Pass
          </button>
          <button className="action-btn report-btn">
            <i className="fas fa-exclamation-circle"></i>
            Report Issue
          </button>
          <button className="action-btn help-btn">
            <i className="fas fa-question-circle"></i>
            Get Help
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;