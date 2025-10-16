import React, { useState, useEffect } from "react";
import { useConductorAuth } from "../../context/ConductorAuthContext";
import { conductorApi } from "../../services/api";
import Sidebar from "./Sidebar";
import FaceVerification from "./conductorverify";
import QRVerification from "./QRVerification";
import "./ConductorDashboard.css";

const ConductorDashboard = () => {
  const { conductor, logout } = useConductorAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationMode, setVerificationMode] = useState(null);
  const [conductorProfile, setConductorProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState({
    ticketsToday: 0,
    passVerifications: 0,
    revenueToday: 0
  });
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // Default bus - you can set this to conductor's assigned bus
  const defaultBus = {
    _id: "default-bus-id",
    busNumber: conductor?.assignedBus || "BUS001",
    from: "City Center",
    to: "Suburban Terminal",
    route: "City Center - Suburban Terminal"
  };

  useEffect(() => {
    if (conductor) {
      fetchConductorProfile();
      fetchDashboardStats();
    }
  }, [conductor]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchVerificationHistory();
    }
  }, [activeTab]);

  const fetchConductorProfile = async () => {
    try {
      const response = await conductorApi.get("/auth/conductor/profile");
      if (response.data.success) {
        setConductorProfile(response.data.user || response.data.conductor);
      } else {
        setError("Failed to fetch conductor profile: " + response.data.message);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Error fetching conductor profile";
      setError(errorMsg);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await conductorApi.get(`/api/conductor/stats?date=${today}`);
      
      if (response.data.success) {
        setStats(response.data.stats);
      } else {
        // Fallback to mock data
        const mockStats = {
          ticketsToday: Math.floor(Math.random() * 100) + 50,
          passVerifications: Math.floor(Math.random() * 80) + 30,
          revenueToday: Math.floor(Math.random() * 5000) + 2000
        };
        setStats(mockStats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      const mockStats = {
        ticketsToday: Math.floor(Math.random() * 100) + 50,
        passVerifications: Math.floor(Math.random() * 80) + 30,
        revenueToday: Math.floor(Math.random() * 5000) + 2000
      };
      setStats(mockStats);
    }
  };

  const fetchVerificationHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError("");
      
      const response = await conductorApi.get("/api/conductor/verifications");
      
      if (response.data.success) {
        setVerificationHistory(response.data.verifications);
      } else {
        setHistoryError("Failed to load verification history: " + response.data.message);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Error loading verification history";
      setHistoryError(errorMsg);
    } finally {
      setHistoryLoading(false);
    }
  };

  const startVerification = (mode) => {
    setVerificationMode(mode);
  };

  const handleVerificationComplete = () => {
    setVerificationMode(null);
    fetchDashboardStats();
    if (activeTab === "history") {
      fetchVerificationHistory();
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    } catch (e) {
      return dateString;
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (!conductor) {
    return (
      <div className="conductor-dashboard">
        <div className="loading">Loading conductor info...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Updated Sidebar without bus selection */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Bus Pass System</h2>
        </div>
        
        <div className="sidebar-tabs">
          <button 
            className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <i className="fas fa-tachometer-alt"></i>
            <span>Dashboard</span>
          </button>
          
          <button 
            className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <i className="fas fa-history"></i>
            <span>History</span>
          </button>
        </div>
        
        <div className="bus-info-card">
          <div className="bus-icon-large">
            <i className="fas fa-bus"></i>
          </div>
          
        </div>
        
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
          <div className="conductor-status">
            <div className="status-indicator"></div>
            <span>Online</span>
          </div>
        </div>
      </div>
      
      <div className="main-content">
        <header className="dashboard-header">
          <h1>Conductor Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {conductorProfile?.name || conductor.name}</span>
            <div className="avatar">
              <i className="fas fa-user"></i>
            </div>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError('')} className="dismiss-btn">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {activeTab === "dashboard" && (
          <div className="dashboard-content">
            {/* Profile Section */}
            <div className="profile-section card">
              <h2>Conductor Profile</h2>
              {conductorProfile ? (
                <div className="profile-details">
                  <div className="profile-field">
                    <label>Name:</label>
                    <span>{conductorProfile.name}</span>
                  </div>
                  <div className="profile-field">
                    <label>Conductor ID:</label>
                    <span>{conductorProfile.conductorId}</span>
                  </div>
                  <div className="profile-field">
                    <label>Assigned Bus:</label>
                    <span>{defaultBus.busNumber}</span>
                  </div>
                  <div className="profile-field">
                    <label>Route:</label>
                    <span>{defaultBus.route}</span>
                  </div>
                </div>
              ) : (
                <div className="loading-profile">
                  <i className="fas fa-spinner fa-spin"></i>
                  <p>Loading profile...</p>
                </div>
              )}
            </div>

            {/* Stats Section */}
            <div className="stats-section">
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-ticket-alt"></i>
                </div>
                <div className="stat-info">
                  <h3>{stats.ticketsToday}</h3>
                  <p>Tickets Today</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-users"></i>
                </div>
                <div className="stat-info">
                  <h3>{stats.passVerifications}</h3>
                  <p>Pass Verifications</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-money-bill-wave"></i>
                </div>
                <div className="stat-info">
                  <h3>₹{stats.revenueToday}</h3>
                  <p>Revenue Today</p>
                </div>
              </div>
            </div>

            {/* Verification Options */}
            <div className="verification-section card">
              <div className="bus-info-header">
                <h2>Ready for Verification</h2>
               
              </div>

              <div className="verification-options">
                <h3>Select Verification Method</h3>
                <div className="verification-buttons">
                  <button
                    className="verification-btn face-verification"
                    onClick={() => startVerification("face")}
                  >
                    <div className="btn-icon">
                      <i className="fas fa-camera"></i>
                    </div>
                    <span>Face Verification</span>
                    <small>Verify pass holders</small>
                  </button>
                  
                  <button
                    className="verification-btn qr-verification"
                    onClick={() => startVerification("qr")}
                  >
                    <div className="btn-icon">
                      <i className="fas fa-qrcode"></i>
                    </div>
                    <span>QR Code Verification</span>
                    <small>Sell tickets to passengers</small>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="history-section">
            <div className="card">
              <h2>Verification History</h2>
              
              {historyError && (
                <div className="error-message">
                  <i className="fas fa-exclamation-circle"></i>
                  <p>{historyError}</p>
                </div>
              )}
              
              {historyLoading ? (
                <div className="loading-history">
                  <i className="fas fa-spinner fa-spin"></i>
                  <p>Loading verification history...</p>
                </div>
              ) : verificationHistory.length > 0 ? (
                <div className="verification-history-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Passenger Name</th>
                        <th>Pass Type</th>
                        <th>Bus Number</th>
                        <th>Verification Time</th>
                        <th>Status</th>
                        <th>Fare</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verificationHistory.map((verification) => (
                        <tr key={verification._id}>
                          <td>{verification.passengerName || verification.userName || 'N/A'}</td>
                          <td>
                            <span className={`pass-type ${verification.passType?.toLowerCase().replace(' ', '-')}`}>
                              {verification.passType || 'N/A'}
                            </span>
                          </td>
                          <td>{verification.busNumber || 'N/A'}</td>
                          <td>{formatDate(verification.verifiedAt || verification.timestamp)}</td>
                          <td>
                            <span className={`status-badge ${verification.status?.toLowerCase()}`}>
                              {verification.status || 'Unknown'}
                            </span>
                          </td>
                          <td>₹{verification.fare || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="history-placeholder">
                  <i className="fas fa-history"></i>
                  <p>No verification history found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verification Interfaces */}
        {verificationMode === "face" && (
          <FaceVerification 
            bus={defaultBus} 
            onClose={handleVerificationComplete}
          />
        )}
        
        {verificationMode === "qr" && (
          <QRVerification 
            bus={defaultBus} 
            onClose={handleVerificationComplete}
          />
        )}
      </div>
    </div>
  );
};

export default ConductorDashboard;