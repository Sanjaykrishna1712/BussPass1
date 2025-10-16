// TravelHistory.js
import React from 'react';
import './TravelHistory.css';

const TravelHistory = () => {
  const mockTrips = [
    { id: 1, date: '2025-08-18', from: 'Stop A', to: 'Stop D', distance_km: 8.2, fare: 18 },
    { id: 2, date: '2025-08-17', from: 'Stop C', to: 'Stop E', distance_km: 5.4, fare: 14 },
    { id: 3, date: '2025-08-16', from: 'Stop B', to: 'Stop F', distance_km: 12.1, fare: 24 },
    { id: 4, date: '2025-08-15', from: 'Stop A', to: 'Stop C', distance_km: 4.1, fare: 10 },
  ];

  return (
    <div className="history-content">
      <div className="history-card">
        <h2>Travel History</h2>
        <div className="table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>From</th>
                <th>To</th>
                <th>Distance (km)</th>
                <th>Fare (₹)</th>
              </tr>
            </thead>
            <tbody>
              {mockTrips.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.from}</td>
                  <td>{t.to}</td>
                  <td>{t.distance_km}</td>
                  <td>{t.fare}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="history-actions">
          <button className="btn primary">Export CSV</button>
        </div>
      </div>
    </div>
  );
};

export default TravelHistory;