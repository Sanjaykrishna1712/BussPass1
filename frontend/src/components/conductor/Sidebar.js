import React, { useState } from "react";
import "./Sidebar.css";

const Sidebar = ({ buses, selectedBus, setSelectedBus, activeTab, setActiveTab }) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter buses based on search term
  const filteredBuses = buses.filter(bus => 
    bus.busNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bus.route.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
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
      
      <div className="bus-list-section">
        <div className="search-container">
          <div className="search-input-wrapper">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              placeholder="Search buses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={() => setSearchTerm("")}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>
        
        <h3>Verify Bus pass ({/*filteredBuses.length*/})</h3>
        
        {buses.length === 0 ? (
          <div className="no-buses">
            <i className="fas fa-bus"></i>
            <p>No buses available</p>
          </div>
        ) : filteredBuses.length === 0 ? (
          <div className="no-buses">
            <i className="fas fa-search"></i>
            <p>No buses found</p>
            <small>Try a different search term</small>
          </div>
        ) : (
          <div className="bus-list">
            {filteredBuses.map((bus) => (
              <div
                key={bus._id}
                className={`bus-item ${selectedBus?._id === bus._id ? "selected" : ""}`}
                onClick={() => setSelectedBus(bus)}
              >
                <div className="bus-icon">
                  <i className="fas fa-bus"></i>
                </div>
                <div className="bus-info">
                  <div className="bus-number">BUS{/*bus.busNumber*/}</div>
                  <div className="bus-route">{/*bus.route*/}</div>
                </div>
                {selectedBus?._id === bus._id && (
                  <div className="selected-indicator">
                    <i className="fas fa-check"></i>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="sidebar-footer">
        <div className="conductor-status">
          <div className="status-indicator"></div>
          <span>Online</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;