import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Approval.css';

const Approval = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchCertificateRequests();
  }, []);

  const fetchCertificateRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/admin/all-applications');
      
      if (response.data && Array.isArray(response.data)) {
        setRequests(response.data);
      } else {
        console.error('Unexpected response format:', response.data);
        setError('Unexpected data format received from server');
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch applications');
      setLoading(false);
      console.error('Error fetching requests:', err);
    }
  };

  const handleApprove = async (userId, userEmail, userName) => {
    try {
      const response = await axios.post(`http://localhost:5000/api/admin/approve-application/${userId}`);
      if (response.data.success) {
        alert(`Application approved! Pass Code: ${response.data.pass_code}. Email notification sent to user.`);
        fetchCertificateRequests();
      } else {
        alert(`Approval failed: ${response.data.message}`);
      }
    } catch (err) {
      console.error('Error approving application:', err);
      if (err.response) {
        alert(`Failed to approve application: ${err.response.data.message || err.response.statusText}`);
      } else if (err.request) {
        alert('Failed to approve application: No response from server');
      } else {
        alert(`Failed to approve application: ${err.message}`);
      }
    }
  };

  const handleReject = async (userId, userEmail, userName) => {
    const reason = prompt('Please enter a reason for rejection:');
    if (reason === null) return;
    
    try {
      const response = await axios.post(
        `http://localhost:5000/api/admin/decline-application/${userId}`,
        { reason: reason },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      if (response.data.success) {
        alert('Application declined. Email notification sent to user.');
        fetchCertificateRequests();
      } else {
        alert(`Decline failed: ${response.data.message}`);
      }
    } catch (err) {
      console.error('Error declining application:', err);
      if (err.response) {
        alert(`Failed to decline application: ${err.response.data.message || err.response.statusText}`);
      } else if (err.request) {
        alert('Failed to decline application: No response from server');
      } else {
        alert(`Failed to decline application: ${err.message}`);
      }
    }
  };

  const viewDetails = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'All') return true;
    if (filter === 'pending') {
      return request.Pass_Status !== true && request.declined !== true;
    }
    if (filter === 'approved') {
      return request.Pass_Status === true;
    }
    if (filter === 'declined') {
      return request.declined === true;
    }
    return true;
  });

  const getStatusBadge = (request) => {
    if (request.Pass_Status === true) {
      return <span className="status status-approved">Approved</span>;
    } else if (request.declined === true) {
      return <span className="status status-declined">Declined</span>;
    } else {
      return <span className="status status-pending">Pending Review</span>;
    }
  };

  const countRequests = (type) => {
    switch (type) {
      case 'pending':
        return requests.filter(req => req.Pass_Status !== true && req.declined !== true).length;
      case 'approved':
        return requests.filter(req => req.Pass_Status === true).length;
      case 'declined':
        return requests.filter(req => req.declined === true).length;
      default:
        return requests.length;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading applications...</div>
      </div>
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="approval-container">
      <div className="approval-header">
        <div className="header-content">
          <h1>Bus Pass Applications</h1>
          <p>Manage and review all bus pass applications</p>
        </div>
        <button className="refresh-btn" onClick={fetchCertificateRequests}>
          <i className="fas fa-sync-alt"></i>
          Refresh
        </button>
      </div>

      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon total">
            <i className="fas fa-file-alt"></i>
          </div>
          <div className="stat-info">
            <span className="stat-number">{countRequests('All')}</span>
            <span className="stat-label">Total Applications</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pending">
            <i className="fas fa-clock"></i>
          </div>
          <div className="stat-info">
            <span className="stat-number">{countRequests('pending')}</span>
            <span className="stat-label">Pending Review</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon approved">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="stat-info">
            <span className="stat-number">{countRequests('approved')}</span>
            <span className="stat-label">Approved</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon declined">
            <i className="fas fa-times-circle"></i>
          </div>
          <div className="stat-info">
            <span className="stat-number">{countRequests('declined')}</span>
            <span className="stat-label">Declined</span>
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'All' ? 'active' : ''}`}
            onClick={() => setFilter('All')}
          >
            All Applications
          </button>
          <button 
            className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={`filter-tab ${filter === 'approved' ? 'active' : ''}`}
            onClick={() => setFilter('approved')}
          >
            Approved
          </button>
          <button 
            className={`filter-tab ${filter === 'declined' ? 'active' : ''}`}
            onClick={() => setFilter('declined')}
          >
            Declined
          </button>
        </div>
        <div className="results-count">
          {filteredRequests.length} {filteredRequests.length === 1 ? 'result' : 'results'}
        </div>
      </div>

      <div className="applications-container">
        {filteredRequests.length > 0 ? (
          filteredRequests.map(request => (
            <div key={request._id} className="application-card">
              <div className="card-header">
                <div className="applicant-info">
                  <img 
                    src={request.applicant_photo_filename 
                      ? `http://localhost:5000/uploads/applicantPhotos/${request.applicant_photo_filename}`
                      : `https://ui-avatars.com/api/?name=${request.name || 'User'}&background=0D8ABC&color=fff`
                    } 
                    alt={request.name} 
                    className="applicant-avatar"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${request.name || 'User'}&background=0D8ABC&color=fff`;
                    }}
                  />
                  <div className="applicant-details">
                    <h3>{request.name || 'No Name Provided'}</h3>
                    <p>{request.email || 'No Email Provided'}</p>
                    <span className="application-date">
                      Applied on {formatDate(request.created_at)}
                    </span>
                  </div>
                </div>
                <div className="status-section">
                  {getStatusBadge(request)}
                  {request.pass_code && (
                    <div className="pass-code">Pass Code: {request.pass_code}</div>
                  )}
                </div>
              </div>

              <div className="card-content">
                <div className="detail-row">
                  <div className="detail-item">
                    <span className="detail-label">From</span>
                    <span className="detail-value">{request.From || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">To</span>
                    <span className="detail-value">{request.To || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Pass Type</span>
                    <span className="detail-value">{request.pass_type || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="detail-row">
                  <div className="detail-item">
                    <span className="detail-label">Gender</span>
                    <span className="detail-value">{request.gender || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Date of Birth</span>
                    <span className="detail-value">{formatDate(request.dob)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Application ID</span>
                    <span className="detail-value id">{request._id ? request._id.slice(-6).toUpperCase() : 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="card-actions">
                <button 
                  className="btn btn-outline view-details-btn"
                  onClick={() => viewDetails(request)}
                >
                  <i className="fas fa-eye"></i>
                  View Details
                </button>
                
                {(!request.Pass_Status && !request.declined) && (
                  <div className="action-buttons">
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleReject(request._id, request.email, request.name)}
                    >
                      <i className="fas fa-times"></i>
                      Reject
                    </button>
                    <button 
                      className="btn btn-success"
                      onClick={() => handleApprove(request._id, request.email, request.name)}
                    >
                      <i className="fas fa-check"></i>
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fas fa-clipboard-list"></i>
            </div>
            <h3>No applications found</h3>
            <p>There are no {filter.toLowerCase()} applications at this time.</p>
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {showModal && selectedRequest && (
  <div className="modal-overlay" onClick={closeModal}>
    <div className="modal-container" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>Application Details</h2>
        <button className="modal-close" onClick={closeModal}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      <div className="modal-content">
        <div className="applicant-profile-section">
          <div className="profile-image-container">
            <img 
              src={selectedRequest.applicant_photo_filename 
                ? `http://localhost:5000/uploads/applicantPhotos/${selectedRequest.applicant_photo_filename}`
                : `https://ui-avatars.com/api/?name=${selectedRequest.name || 'User'}&background=0D8ABC&color=fff`
              } 
              alt={selectedRequest.name} 
              className="profile-image-large"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${selectedRequest.name || 'User'}&background=0D8ABC&color=fff`;
              }}
            />
            <div className="profile-status-badge">
              {getStatusBadge(selectedRequest)}
            </div>
          </div>
          
          <div className="profile-main-info">
            <h3>{selectedRequest.name || 'No Name Provided'}</h3>
            <p className="profile-email">{selectedRequest.email || 'No Email Provided'}</p>
            <div className="profile-meta">
              <span className="meta-item">
                <i className="fas fa-calendar-alt"></i>
                Applied on {formatDate(selectedRequest.created_at)}
              </span>
              {selectedRequest.pass_code && (
                <span className="meta-item">
                  <i className="fas fa-key"></i>
                  Pass Code: <strong>{selectedRequest.pass_code}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="details-tabs">
          <div className="tab active">Personal Information</div>
          <div className="tab">Pass Details</div>
          <div className="tab">Education Details</div>
          <div className="tab">Application Info</div>
        </div>
        
        <div className="details-content">
          {/* Personal Details Section */}
          <div className="details-section">
            <h4 className="section-title">
              <i className="fas fa-user"></i>
              Personal Details
            </h4>
            <div className="details-grid">
              <div className="detail-field">
                <label>Full Name</label>
                <span>{selectedRequest.name || 'N/A'}</span>
              </div>
              <div className="detail-field">
                <label>Email Address</label>
                <span>{selectedRequest.email || 'N/A'}</span>
              </div>
              <div className="detail-field">
                <label>Gender</label>
                <span>{selectedRequest.gender || 'N/A'}</span>
              </div>
              <div className="detail-field">
                <label>Date of Birth</label>
                <span>{formatDate(selectedRequest.dob)}</span>
              </div>
              <div className="detail-field">
                <label>Aadhar Number</label>
                <span>{selectedRequest.aadhar_number || 'N/A'}</span>
              </div>
              <div className="detail-field">
                <label>Mobile Number</label>
                <span>{selectedRequest.mobile_no || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          {/* Pass Information Section */}
          <div className="details-section">
            <h4 className="section-title">
              <i className="fas fa-bus"></i>
              Pass Information
            </h4>
            <div className="details-grid">
              <div className="detail-field">
                <label>From Location</label>
                <span>{selectedRequest.From || 'N/A'}</span>
              </div>
              <div className="detail-field">
                <label>To Location</label>
                <span>{selectedRequest.To || 'N/A'}</span>
              </div>
              <div className="detail-field">
                <label>Pass Type</label>
                <span className="pass-type-badge">{selectedRequest.pass_type || 'N/A'}</span>
              </div>
              {selectedRequest.pass_code && (
                <div className="detail-field">
                  <label>Pass Code</label>
                  <span className="pass-code-highlight">{selectedRequest.pass_code}</span>
                </div>
              )}
              {selectedRequest.pass_expiry && (
                <div className="detail-field">
                  <label>Pass Expiry</label>
                  <span>{formatDate(selectedRequest.pass_expiry)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Education Details Section - NEW */}
          <div className="details-section">
            <h4 className="section-title">
              <i className="fas fa-graduation-cap"></i>
              Education Details
            </h4>
            <div className="details-grid">
              <div className="detail-field">
                <label>Institution Name</label>
                <span>{selectedRequest.institution_name || 'N/A'}</span>
              </div>
              <div className="detail-field">
                <label>Course Name</label>
                <span>{selectedRequest.course_name || 'N/A'}</span>
              </div>
              <div className="detail-field">
                <label>Course Year</label>
                <span>{selectedRequest.present_course_year || 'N/A'}</span>
              </div>
              <div className="detail-field">
                <label>Admission Number</label>
                <span>{selectedRequest.admission_number || 'N/A'}</span>
              </div>
              <div className="detail-field">
                <label>Institution Address</label>
                <span>{selectedRequest.inst_address || 'N/A'}</span>
              </div>
            </div>
            
            {/* Study Certificate Display */}
            {selectedRequest.study_certificate_filename && (
              <div className="document-section">
                <label>Study Certificate</label>
                <div className="document-preview">
                  <img 
                    src={`http://localhost:5000/uploads/studyCertificates/${selectedRequest.study_certificate_filename}`}
                    alt="Study Certificate"
                    className="document-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="document-fallback" style={{display: 'none'}}>
                    <i className="fas fa-file-pdf"></i>
                    <span>Study Certificate</span>
                    <a 
                      href={`http://localhost:5000/uploads/studyCertificates/${selectedRequest.study_certificate_filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline"
                    >
                      <i className="fas fa-download"></i>
                      Download Certificate
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Application Details Section */}
          <div className="details-section">
            <h4 className="section-title">
              <i className="fas fa-info-circle"></i>
              Application Details
            </h4>
            <div className="details-grid">
              <div className="detail-field">
                <label>Application ID</label>
                <span className="application-id">{selectedRequest._id || 'N/A'}</span>
              </div>
              <div className="detail-field">
                <label>Application Date</label>
                <span>{formatDate(selectedRequest.created_at)}</span>
              </div>
              <div className="detail-field">
                <label>Status</label>
                <span>{getStatusBadge(selectedRequest)}</span>
              </div>
              <div className="detail-field">
                <label>Service Type</label>
                <span>{selectedRequest.service_type || 'N/A'}</span>
              </div>
              <div className="detail-field">
                <label>Renewal Frequency</label>
                <span>{selectedRequest.renewal_frequency || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          {selectedRequest.declined && selectedRequest.rejection_reason && (
            <div className="details-section rejection-section">
              <h4 className="section-title">
                <i className="fas fa-times-circle"></i>
                Rejection Details
              </h4>
              <div className="rejection-content">
                <label>Reason for Rejection</label>
                <div className="rejection-reason-text">
                  {selectedRequest.rejection_reason}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={closeModal}>
          <i className="fas fa-arrow-left"></i>
          Back to List
        </button>
        {(!selectedRequest.Pass_Status && !selectedRequest.declined) && (
          <div className="action-buttons-group">
            <button 
              className="btn btn-danger"
              onClick={() => {
                handleReject(selectedRequest._id, selectedRequest.email, selectedRequest.name);
                closeModal();
              }}
            >
              <i className="fas fa-times"></i>
              Reject Application
            </button>
            <button 
              className="btn btn-success"
              onClick={() => {
                handleApprove(selectedRequest._id, selectedRequest.email, selectedRequest.name);
                closeModal();
              }}
            >
              <i className="fas fa-check"></i>
              Approve Application
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default Approval;