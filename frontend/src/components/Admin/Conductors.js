// components/Admin/Conductors.js - Updated
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Management.css';

const Conductors = () => {
  const [conductors, setConductors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    conductorId: '',
    password: '',
    depot: '',
    contact: '',
    address: ''
  });
  const [depots, setDepots] = useState([]);

  useEffect(() => {
    fetchConductors();
    fetchDepots();
  }, []);

  const fetchConductors = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/admin/conductors');
      if (response.data.success) {
        setConductors(response.data.conductors);
      } else {
        setError(response.data.message || 'Failed to fetch conductors');
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch conductors. Please check if the server is running.');
      setLoading(false);
      console.error('Error fetching conductors:', err);
    }
  };

  const fetchDepots = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/depots');
      if (response.data.success) {
        setDepots(response.data.depots);
      }
    } catch (err) {
      console.error('Error fetching depots:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddConductor = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/admin/conductors', formData);
      if (response.data.success) {
        alert('Conductor added successfully');
        setShowAddForm(false);
        setFormData({
          name: '',
          conductorId: '',
          password: '',
          depot: '',
          contact: '',
          address: ''
        });
        fetchConductors();
      } else {
        alert(response.data.message || 'Failed to add conductor');
      }
    } catch (err) {
      console.error('Error adding conductor:', err);
      alert(err.response?.data?.message || 'Failed to add conductor');
    }
  };

  const handleDeleteConductor = async (conductorId) => {
    if (window.confirm('Are you sure you want to delete this conductor?')) {
      try {
        const response = await axios.delete(`http://localhost:5000/api/admin/conductors/${conductorId}`);
        if (response.data.success) {
          alert('Conductor deleted successfully');
          fetchConductors();
        } else {
          alert(response.data.message || 'Failed to delete conductor');
        }
      } catch (err) {
        console.error('Error deleting conductor:', err);
        alert(err.response?.data?.message || 'Failed to delete conductor');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading conductors...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button className="btn btn-primary" onClick={fetchConductors}>
          <i className="fas fa-refresh"></i>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="management-container">
      <div className="management-header">
        <h2>Conductor Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          <i className="fas fa-plus"></i>
          Add Conductor
        </button>
      </div>

      {showAddForm && (
        <div className="add-form">
          <h3>Add New Conductor</h3>
          <form onSubmit={handleAddConductor}>
            <div className="form-row">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Conductor ID *</label>
                <input
                  type="text"
                  name="conductorId"
                  value={formData.conductorId}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Contact *</label>
                <input
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Depot *</label>
                <select
                  name="depot"
                  value={formData.depot}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Depot</option>
                  {depots.map(depot => (
                    <option key={depot._id} value={depot._id}>
                      {depot.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                Add Conductor
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="items-list">
        {conductors.length > 0 ? (
          conductors.map(conductor => (
            <div key={conductor._id} className="item-card">
              <div className="item-info">
                <h3>{conductor.name}</h3>
                <p><strong>ID:</strong> {conductor.conductorId}</p>
                <p><strong>Depot:</strong> {conductor.depotName || 'Not assigned'}</p>
                <p><strong>Contact:</strong> {conductor.contact || 'N/A'}</p>
                <p><strong>Address:</strong> {conductor.address || 'N/A'}</p>
              </div>
              <div className="item-actions">
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDeleteConductor(conductor._id)}
                >
                  <i className="fas fa-trash"></i>
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-items">
            <i className="fas fa-user-tie"></i>
            <h3>No conductors found</h3>
            <p>Add your first conductor to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Conductors;