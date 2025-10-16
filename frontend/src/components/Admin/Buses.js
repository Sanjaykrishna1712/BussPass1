// components/Admin/Buses.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Management.css';

const Buses = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    busNumber: '',
    from: '',
    to: ''
  });

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/admin/buses');
      setBuses(response.data.buses);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch buses');
      setLoading(false);
      console.error('Error fetching buses:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddBus = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/admin/buses', formData);
      if (response.data.success) {
        alert('Bus added successfully');
        setShowAddForm(false);
        setFormData({
          busNumber: '',
          from: '',
          to: ''
        });
        fetchBuses();
      } else {
        alert(response.data.message || 'Failed to add bus');
      }
    } catch (err) {
      console.error('Error adding bus:', err);
      alert(err.response?.data?.message || 'Failed to add bus');
    }
  };

  const handleDeleteBus = async (busId) => {
    if (window.confirm('Are you sure you want to delete this bus?')) {
      try {
        const response = await axios.delete(`http://localhost:5000/api/admin/buses/${busId}`);
        if (response.data.success) {
          alert('Bus deleted successfully');
          fetchBuses();
        } else {
          alert(response.data.message || 'Failed to delete bus');
        }
      } catch (err) {
        console.error('Error deleting bus:', err);
        alert(err.response?.data?.message || 'Failed to delete bus');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading buses...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="management-container">
      <div className="management-header">
        <h2>Bus Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          <i className="fas fa-plus"></i>
          Add Bus
        </button>
      </div>

      {showAddForm && (
        <div className="add-form">
          <h3>Add New Bus</h3>
          <form onSubmit={handleAddBus}>
            <div className="form-row">
              <div className="form-group">
                <label>Bus Number</label>
                <input
                  type="text"
                  name="busNumber"
                  value={formData.busNumber}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>From</label>
                <input
                  type="text"
                  name="from"
                  value={formData.from}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>To</label>
                <input
                  type="text"
                  name="to"
                  value={formData.to}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                Add Bus
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
        {buses.length > 0 ? (
          buses.map(bus => (
            <div key={bus._id} className="item-card">
              <div className="item-info">
                <h3>Bus {bus.busNumber}</h3>
                <p><strong>Route:</strong> {bus.from} → {bus.to}</p>
              </div>
              <div className="item-actions">
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDeleteBus(bus._id)}
                >
                  <i className="fas fa-trash"></i>
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-items">
            <i className="fas fa-bus"></i>
            <h3>No buses found</h3>
            <p>Add your first bus to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Buses;