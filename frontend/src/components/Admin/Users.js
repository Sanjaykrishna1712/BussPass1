// Users.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/users');
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch users');
      setLoading(false);
      console.error('Error fetching users:', err);
    }
  };

  const fetchUserDetails = async (userId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/users/${userId}`);
      if (response.data.success) {
        setSelectedUser(response.data.user);
        setShowModal(true);
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
      alert('Failed to fetch user details');
    }
  };

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      try {
        setDeleteLoading(true);
        const response = await axios.delete(`http://localhost:5000/api/users/${user._id}`);
        
        if (response.data.success) {
          alert('User deleted successfully');
          // Refresh the user list
          fetchUsers();
        } else {
          alert(`Delete failed: ${response.data.message}`);
        }
      } catch (err) {
        console.error('Error deleting user:', err);
        if (err.response) {
          alert(`Failed to delete user: ${err.response.data.message || err.response.statusText}`);
        } else {
          alert('Failed to delete user: No response from server');
        }
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const filteredUsers = users.filter(user => 
    user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (user) => {
    if (user.declined === true) {
      return <span className="status-badge status-rejected">Rejected</span>;
    } else if (user.Pass_Status === true) {
      return <span className="status-badge status-approved">Approved</span>;
    } else if (user.Pass_Status === false) {
      return <span className="status-badge status-pending">Pending</span>;
    }
    return <span className="status-badge status-pending">Pending</span>;
  };

  const getRoleBadge = (user) => {
    return <span className={`role-badge role-${user.user_type ? user.user_type.toLowerCase() : 'user'}`}>
      {user.user_type || 'User'}
    </span>;
  };

  // Improved date formatting function
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      // Handle various date string formats
      let date;
      
      // If it's already a Date object
      if (dateString instanceof Date) {
        date = dateString;
      } 
      // If it's a string that can be parsed directly
      else if (typeof dateString === 'string') {
        // Try parsing as ISO string
        date = new Date(dateString);
        
        // If invalid, try parsing as timestamp
        if (isNaN(date.getTime())) {
          date = new Date(parseInt(dateString));
        }
      } 
      // If it's a number (timestamp)
      else if (typeof dateString === 'number') {
        date = new Date(dateString);
      }
      
      // Check if we have a valid date
      if (date && !isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } else {
        return 'Invalid Date';
      }
    } catch (error) {
      console.error('Date formatting error:', error, 'Input:', dateString);
      return 'Invalid Date';
    }
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="users-container">
      <div className="users-header">
        <h2>User Management</h2>
        <div className="users-header-actions">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={fetchUsers} disabled={loading}>
            <i className="fas fa-refresh"></i>
            Refresh
          </button>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Pass Status</th>
              <th>Registration Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user._id}>
                <td>
                  <div className="user-info">
                    <img 
                      src={user.applicant_photo_filename 
                        ? `http://localhost:5000/uploads/applicantPhotos/${user.applicant_photo_filename}`
                        : `https://ui-avatars.com/api/?name=${user.name || 'User'}&background=random`
                      } 
                      alt={user.name} 
                      className="user-avatar"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${user.name || 'User'}&background=random`;
                      }}
                    />
                    <div>
                      <div className="user-name">{user.name || 'No Name'}</div>
                      <div className="user-email">{user.email || 'No Email'}</div>
                    </div>
                  </div>
                </td>
                <td>
                  {getRoleBadge(user)}
                </td>
                <td>
                  {getStatusBadge(user)}
                </td>
                <td>{formatDate(user.created_at)}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-icon btn-view" 
                      title="View Details"
                      onClick={() => fetchUserDetails(user._id)}
                      disabled={deleteLoading}
                    >
                      <i className="fas fa-eye">View</i>
                    </button>
                    <button 
                      className="btn-icon btn-delete" 
                      title="Delete"
                      onClick={() => handleDeleteUser(user)}
                      disabled={deleteLoading}
                    >
                      <i className="fas fa-trash">Delete</i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && !loading && (
        <div className="no-users">
          <i className="fas fa-users"></i>
          <h3>No users found</h3>
          <p>{searchTerm ? 'Try a different search term' : 'No users registered yet'}</p>
        </div>
      )}

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Details</h3>
              <button className="modal-close" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="user-details">
                <div className="user-detail-header">
                  <img 
                    src={selectedUser.applicant_photo_filename 
                      ? `http://localhost:5000/uploads/applicantPhotos/${selectedUser.applicant_photo_filename}`
                      : `https://ui-avatars.com/api/?name=${selectedUser.name || 'User'}&background=random`
                    } 
                    alt={selectedUser.name} 
                    className="user-detail-avatar"
                  />
                  <div>
                    <h4>{selectedUser.name || 'No Name'}</h4>
                    <p>{selectedUser.email || 'No Email'}</p>
                    {getRoleBadge(selectedUser)}
                  </div>
                </div>

                <div className="user-detail-grid">
                  <div className="detail-item">
                    <label>User ID:</label>
                    <span>{selectedUser._id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Gender:</label>
                    <span>{selectedUser.gender || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Date of Birth:</label>
                    <span>{formatDate(selectedUser.dob)}</span>
                  </div>
                  <div className="detail-item">
                    <label>From:</label>
                    <span>{selectedUser.From || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>To:</label>
                    <span>{selectedUser.To || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Pass Type:</label>
                    <span>{selectedUser.pass_type || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Pass Status:</label>
                    <span>{getStatusBadge(selectedUser)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Pass Code:</label>
                    <span>{selectedUser.pass_code || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Registration Date:</label>
                    <span>{formatDate(selectedUser.created_at)}</span>
                  </div>
                  {selectedUser.pass_expiry && (
                    <div className="detail-item">
                      <label>Pass Expiry:</label>
                      <span>{formatDate(selectedUser.pass_expiry)}</span>
                    </div>
                  )}
                  {selectedUser.rejection_reason && (
                    <div className="detail-item full-width">
                      <label>Rejection Reason:</label>
                      <span className="rejection-reason">{selectedUser.rejection_reason}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;