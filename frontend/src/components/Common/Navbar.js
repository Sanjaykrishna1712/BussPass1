import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const { user, completeUserData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isDashboardPage = location.pathname === '/' || 
                         location.pathname === '/pass' || 
                         location.pathname === '/history' ||
                         location.pathname === '/profile';

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  // Use complete user data if available, otherwise fall back to basic user data
  const displayUser = completeUserData || user;

  // Close mobile sidebar when navigating
  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Mobile menu button */}
      <button className="mobile-menu-toggle" onClick={toggleMobileSidebar}>
        <i className="fas fa-bars"></i>
      </button>
      
      <div className={`side-navbar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-active' : ''}`}>
        <div className="navbar-header">
          <div className="navbar-brand" onClick={() => navigate('/')}>
            <i className="fas fa-bus"></i>
            {!isCollapsed && <span>Smart Bus Pass</span>}
          </div>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </button>
        </div>
        
        <div className="navbar-links">
          {user &&  (
            <>
              <button className="nav-link" onClick={() => navigate('/Dashboard')}>
                <i className="fas fa-th-large"></i>
                { <span>Dashboard</span>}
              </button>
              <button className="nav-link" onClick={() => navigate('/pass')}>
                <i className="fas fa-ticket-alt"></i>
                { <span>My Pass</span>}
              </button>
              <button className="nav-link" onClick={() => navigate('/history')}>
                <i className="fas fa-history"></i>
                {<span>Travel History</span>}
              </button>
              <button className="nav-link" onClick={() => navigate('/profile')}>
                <i className="fas fa-user"></i>
                {<span>Profile</span>}
              </button>
            </>
          )}
        </div>
        
        {user && (
          <div className="user-menu">
            <div className="user-info" onClick={() => navigate('/profile')} style={{cursor: 'pointer'}}>
              <div className="user-avatar">
                {displayUser.name ? displayUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              {!isCollapsed && (
                <div className="user-details">
                  <span className="user-name">{displayUser.name}</span>
                  <span className="user-email">{displayUser.email || 'No email'}</span>
                </div>
              )}
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i>
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        )}
      </div>
      
      {/* Overlay for mobile when sidebar is open */}
      <div 
        className={`sidebar-overlay ${isMobileOpen ? 'active' : ''}`} 
        onClick={() => setIsMobileOpen(false)}
      />
    </>
  );
};

export default Navbar;