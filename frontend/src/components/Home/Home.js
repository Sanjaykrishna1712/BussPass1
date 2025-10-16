import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function HomePage() {
  return (
    <div className="homepage">
      {/* Navigation */}
      <nav className="home-nav">
        <div className="nav-container">
          <div className="logo">
            <h2>TravelPass</h2>
          </div>
          <div className="nav-links">
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="nav-link">Register</Link>
            <Link to="/login/face" className="nav-link">Face Login</Link>
            <Link to="/admin-login" className="nav-link">Admin</Link>
            <Link to="/conductor-login" className="nav-link">Conductor</Link>
          </div>
        </div>
      </nav>

 
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title animate-fade-in">
            Welcome to <span className="highlight">TravelPass</span>
          </h1>
          <p className="hero-subtitle animate-fade-in-delay">
            Your seamless journey starts here. Experience the future of public transportation with our digital pass system.
          </p>
          <div className="hero-buttons animate-fade-in-delay-2">
            <Link to="/register" className="btn btn-primary">Get Started</Link>
            <Link to="/login" className="btn btn-secondary">Login</Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="animated-card">
            <div className="card-inner">
              <div className="card-face"></div>
              <div className="card-chip"></div>
              <div className="card-waves">
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2 className="section-title">Why Choose TravelPass?</h2>
        <div className="features-grid">
          <div className="feature-card animate-slide-up">
            <div className="feature-icon">🚌</div>
            <h3>Convenient Travel</h3>
            <p>Access all public transport with a single digital pass.</p>
          </div>
          <div className="feature-card animate-slide-up-delay-1">
            <div className="feature-icon">📱</div>
            <h3>Digital Management</h3>
            <p>Manage your pass, view history, and recharge from your phone.</p>
          </div>
          <div className="feature-card animate-slide-up-delay-2">
            <div className="feature-icon">🔐</div>
            <h3>Secure Authentication</h3>
            <p>Advanced face recognition technology for secure access.</p>
          </div>
        </div>
      </section>

      {/* Auth Options Section */}
      <section className="auth-options">
        <h2 className="section-title">Get On Board</h2>
        <div className="auth-cards">
          <div className="auth-card">
            <h3>New User</h3>
            <p>Create your account and register your face for seamless travel</p>
            <Link to="/register" className="btn btn-outline">Register Now</Link>
          </div>
          <div className="auth-card">
            <h3>Existing User</h3>
            <p>Login to manage your pass, view history and more</p>
            <Link to="/login" className="btn btn-outline">Login</Link>
          </div>
          <div className="auth-card">
            <h3>Face Recognition</h3>
            <p>Experience our cutting-edge facial recognition login</p>
            <Link to="/login/face" className="btn btn-outline">Try Face Login</Link>
          </div>
        </div>
        
        <div className="admin-section">
          <h3>Are you an admin or conductor?</h3>
          <div className="admin-buttons">
            <Link to="/admin-login" className="btn btn-admin">Admin Login</Link>
            <Link to="/conductor-login" className="btn btn-conductor">Conductor Login</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>&copy; {new Date().getFullYear()} TravelPass System. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default HomePage;