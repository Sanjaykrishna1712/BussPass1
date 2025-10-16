// components/Admin/Depots.js - Updated
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Management.css';

const Depots = () => {
  const [depots, setDepots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    destination: ''
  });

  useEffect(() => {
    fetchDepots();
  }, []);

  const fetchDepots = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/admin/depots');
      if (response.data.success) {
        setDepots(response.data.depots);
      } else {
        setError(response.data.message || 'Failed to fetch depots');
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch depots');
      setLoading(false);
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

  const handleAddDepot = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const response = await axios.post('http://localhost:5000/api/admin/depots', formData);
      if (response.data.success) {
        alert('Depot added successfully');
        setFormData({
          name: '',
          location: '',
          destination: ''
        });
        setShowAddForm(false);
        fetchDepots();
      } else {
        alert(response.data.message || 'Failed to add depot');
      }
    } catch (err) {
      console.error('Error adding depot:', err);
      alert(err.response?.data?.message || 'Failed to add depot');
    }
  };

  const handleDeleteDepot = async (depotId) => {
    if (window.confirm('Are you sure you want to delete this depot? This will also remove all associated buses and conductors.')) {
      try {
        const response = await axios.delete(`http://localhost:5000/api/admin/depots/${depotId}`);
        if (response.data.success) {
          alert('Depot deleted successfully');
          fetchDepots();
        } else {
          alert(response.data.message || 'Failed to delete depot');
        }
      } catch (err) {
        console.error('Error deleting depot:', err);
        alert(err.response?.data?.message || 'Failed to delete depot');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading depots...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="management-container">
      <div className="management-header">
        <h2>Depot Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          <i className="fas fa-plus"></i>
          Add Depot
        </button>
      </div>

      {showAddForm && (
        <div className="add-form">
          <h3>Add New Depot</h3>
          <form onSubmit={handleAddDepot}>
            <div className="form-row">
              <div className="form-group">
                <label>Depot Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Srikakulam"
                  required
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Main Bus Stand"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Destination Depot</label>
                <input
                  type="text"
                  name="destination"
                  value={formData.destination}
                  onChange={handleInputChange}
                  placeholder="e.g., Vizag"
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                Add Depot
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
        {depots.length > 0 ? (
          depots.map(depot => (
            <div key={depot._id} className="item-card">
              <div className="item-info">
                <h3>{depot.name}</h3>
                <p><strong>Location:</strong> {depot.location || 'N/A'}</p>
                <p><strong>Destination:</strong> {depot.destination || 'N/A'}</p>
                <p><strong>Buses:</strong> {depot.bus_count || 0}</p>
                <p><strong>ID:</strong> {depot._id}</p>
              </div>
              <div className="item-actions">
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDeleteDepot(depot._id)}
                >
                  <i className="fas fa-trash"></i>
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-items">
            <i className="fas fa-warehouse"></i>
            <h3>No depots found</h3>
            <p>Add your first depot to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Depots;