import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState({
    applicant_photo: false,
    study_certificate: false
  });

  useEffect(() => {
    const loadProfileData = async () => {
  setLoading(true);
  setError(null);
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token found');
      setLoading(false);
      return;
    }
    
    console.log('Making profile request with token:', token ? 'Present' : 'Missing');
    
    // Try both endpoints - first the one without user_id
    const response = await fetch(`http://localhost:5000/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Important for cookies/sessions
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      // If 404, try the endpoint with user_id
      if (response.status === 404 && user && user.user_id) {
        console.log('Trying endpoint with user ID...');
        const responseWithId = await fetch(`http://localhost:5000/auth/profile/${user.user_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (responseWithId.ok) {
          const data = await responseWithId.json();
          if (data.success) {
            setProfileData(data.user);
            return;
          }
        }
      }
      
      const errorText = await response.text();
      console.error('Profile error response:', errorText);
      let errorMessage = 'Failed to load profile data';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        errorMessage = errorText || `HTTP ${response.status}`;
      }
      
      setError(errorMessage);
      return;
    }
    
    const data = await response.json();
    console.log('Profile data received:', data);
    
    if (data.success) {
      setProfileData(data.user);
    } else {
      setError(data.message || 'Failed to load profile data');
    }
  } catch (error) {
    console.error('Network error details:', error);
    setError(`Network error: ${error.message}. Please check if the server is running.`);
  } finally {
    setLoading(false);
  }
};

    if (user) {
      loadProfileData();
    } else {
      setLoading(false);
      setError('User information not available');
    }
  }, [user]);

  // Rest of your component remains the same...
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      return dateString;
    }
  };

  const handleImageError = (imageType) => {
    setImageErrors(prev => ({
      ...prev,
      [imageType]: true
    }));
  };

  // Skeleton Loading Component
  const ProfileSkeleton = () => (
    <div className="profile-container">
      <div className="profile-header">
        <div className="skeleton-text" style={{width: '200px', height: '32px'}}></div>
      </div>
      
      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar skeleton"></div>
          
          <div className="profile-details">
            <div className="skeleton-text" style={{width: '180px', height: '28px', margin: '0 auto 10px'}}></div>
            <div className="skeleton-text" style={{width: '220px', height: '18px', margin: '0 auto 30px'}}></div>
            
            {[1, 2, 3, 4].map(section => (
              <div key={section} className="profile-section">
                <div className="skeleton-text" style={{width: '160px', height: '20px', marginBottom: '15px'}}></div>
                <div className="detail-grid">
                  {[1, 2, 3].map(item => (
                    <div key={item} className="detail-item">
                      <div className="skeleton-text" style={{width: '120px', height: '14px', marginBottom: '5px'}}></div>
                      <div className="skeleton-text" style={{width: '180px', height: '16px'}}></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="profile-error-state">
          <div className="error-icon">⚠️</div>
          <h3>Unable to load profile</h3>
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="profile-container">
        <div className="profile-error-state">
          <div className="error-icon">❌</div>
          <h3>No profile data available</h3>
          <p>Please check if you're logged in correctly</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>User Profile</h1>
      </div>
      
      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar">
            {profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U'}
          </div>
          
          <div className="profile-details">
            <h2>{profileData.name || 'User'}</h2>
            <p className="profile-email">{profileData.email || 'No email provided'}</p>
            
            {/* Personal Information */}
            <div className="profile-section">
              <h3>Personal Information</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">User ID:</span>
                  <span className="detail-value">{profileData._id || profileData.user_id || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Gender:</span>
                  <span className="detail-value">{profileData.gender || 'Not specified'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Date of Birth:</span>
                  <span className="detail-value">{formatDate(profileData.dob)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Aadhar Number:</span>
                  <span className="detail-value">{profileData.aadhar_number || 'Not provided'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Mobile Number:</span>
                  <span className="detail-value">{profileData.mobile_no || 'Not provided'}</span>
                </div>
              </div>
            </div>
            
            {/* Address Information */}
            <div className="profile-section">
              <h3>Address Information</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">District:</span>
                  <span className="detail-value">{profileData.district || 'Not specified'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Mandal:</span>
                  <span className="detail-value">{profileData.mandal || 'Not specified'}</span>
                </div>
                <div className="detail-item full-width">
                  <span className="detail-label">Address:</span>
                  <span className="detail-value">{profileData.address || 'Not specified'}</span>
                </div>
              </div>
            </div>
            
            {/* Education Information */}
            <div className="profile-section">
              <h3>Education Information</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Institution Name:</span>
                  <span className="detail-value">{profileData.institution_name || 'Not specified'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Course Name:</span>
                  <span className="detail-value">{profileData.course_name || 'Not specified'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Current Year:</span>
                  <span className="detail-value">{profileData.present_course_year || 'Not specified'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Admission Number:</span>
                  <span className="detail-value">{profileData.admission_number || 'Not specified'}</span>
                </div>
                <div className="detail-item full-width">
                  <span className="detail-label">Institution Address:</span>
                  <span className="detail-value">{profileData.inst_address || 'Not specified'}</span>
                </div>
              </div>
            </div>
            
            {/* Bus Pass Information */}
            <div className="profile-section">
              <h3>Bus Pass Information</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Pass Type:</span>
                  <span className="detail-value">{profileData.pass_type || 'Not specified'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Service Type:</span>
                  <span className="detail-value">{profileData.service_type || 'Not specified'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Renewal Frequency:</span>
                  <span className="detail-value">{profileData.renewal_frequency || 'Not specified'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Account Created:</span>
                  <span className="detail-value">{formatDate(profileData.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Applicant Photo */}
            <div className="profile-section">
              <h3>Profile Photos</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Applicant Photo:</span>
                  {profileData.applicant_photo_filename && !imageErrors.applicant_photo ? (
                    <img 
                      src={`http://localhost:5000/uploads/applicantPhotos/${profileData.applicant_photo_filename}`} 
                      alt="Applicant" 
                      className="profile-image"
                      onError={() => handleImageError('applicant_photo')}
                    />
                  ) : (
                    <span className="detail-value">Not uploaded or failed to load</span>
                  )}
                </div>
              </div>
            </div>

            {/* Study Certificate */}
            <div className="profile-section">
              <h3>Study Certificate</h3>
              <div className="detail-grid">
                <div className="detail-item full-width">
                  <span className="detail-label">Study Certificate:</span>
                  {profileData.study_certificate_url ? (
                    <a 
                      href={profileData.study_certificate_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="detail-value document-link"
                    >
                      <i className="fas fa-file-pdf"></i> View Certificate
                    </a>
                  ) : (
                    <span className="detail-value">No study certificate uploaded</span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;