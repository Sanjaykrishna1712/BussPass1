// PassInfo.js
import React, { useState, useEffect } from 'react';
import './PassInfo.css';
import { api } from '../../services/api';
import { QRCodeSVG } from 'qrcode.react';

const PassInfo = () => {
  const [passInfo, setPassInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrValue, setQrValue] = useState('');

  useEffect(() => {
    fetchPassInfo();
  }, []);

  const fetchPassInfo = async () => {
    try {
      const response = await api.get('/api/user/pass-info');
      if (response.data.success) {
        setPassInfo(response.data.user);
        // Generate QR code value based on pass ID and user info
        if (response.data.user.pass_code) {
          setQrValue(JSON.stringify({
            passId: response.data.user.pass_code,
            userId: response.data.user._id,
            name: response.data.user.name,
            type: response.data.user.pass_type,
            validUntil: response.data.user.pass_expiry,
            photo: response.data.user.applicant_photo_filename
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching pass info:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Function to format ISO date string to readable format
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const downloadQRCode = () => {
    // Create a canvas element to render the QR code
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Get the SVG element
    const svgElement = document.getElementById('qr-code-svg');
    if (!svgElement) return;
    
    // Create an image from the SVG
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = function() {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Convert to data URL and download
      const pngUrl = canvas.toDataURL('image/png');
      let downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `bus-pass-${passInfo.pass_code}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

 if (loading) {
  return (
    <div className="dashboard-content">
      <div className="loading-spinner">
        <div className="spinner-container">
          <div className="spinner-circle"></div>
          <div className="spinner-orbiter">
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
          </div>
        </div>
        <p>Loading...</p>
      </div>
    </div>
  );
}

  if (!passInfo) {
    return (
      <div className="passinfo-content">
        <div className="no-pass">
          <i className="fas fa-ticket-alt"></i>
          <h3>No Active Pass</h3>
          <p>You don't have an active bus pass yet.</p>
          <button className="btn primary">Apply for Pass</button>
        </div>
      </div>
    );
  }

  const userAge = calculateAge(passInfo.dob);

  return (
    <div className="passinfo-content">
      <div className="pass-card">
        <div className="pass-header">
          <h2>Digital Bus Pass</h2>
          <span className={`status-badge ${passInfo.Pass_Status ? 'active' : 'expired'}`}>
            {passInfo.Pass_Status ? 'ACTIVE' : 'EXPIRED'}
          </span>
        </div>

        <div className="pass-content">
          <div className="pass-photo-section">
            {passInfo.applicant_photo_filename && (
              <img 
                src={`http://localhost:5000/uploads/applicantPhotos/${passInfo.applicant_photo_filename}`} 
                alt="Passenger" 
                className="pass-photo"
              />
            )}
            <div className="pass-holder-info">
              <h3>{passInfo.name}</h3>
              <p>{userAge} years • {passInfo.gender}</p>
              <p className="pass-type">{passInfo.pass_type}</p>
            </div>
          </div>

          <div className="pass-details-grid">
            <div className="pass-detail">
              <span className="label">Pass ID</span>
              <span className="value">{passInfo.pass_code || 'N/A'}</span>
            </div>
            <div className="pass-detail">
              <span className="label">From</span>
              <span className="value">{passInfo.From || 'N/A'}</span>
            </div>
            <div className="pass-detail">
              <span className="label">To</span>
              <span className="value">{passInfo.To || 'N/A'}</span>
            </div>
            <div className="pass-detail">
              <span className="label">Issued On</span>
              <span className="value">
                {formatDate(passInfo.created_at)}
              </span>
            </div>
            <div className="pass-detail">
              <span className="label">Valid Until</span>
              <span className="value">
                {formatDate(passInfo.pass_expiry)}
              </span>
            </div>
            <div className="pass-detail">
              <span className="label">Status</span>
              <span className={`value status ${passInfo.Pass_Status ? 'active' : 'expired'}`}>
                {passInfo.Pass_Status ? 'Active' : 'Expired'}
              </span>
            </div>
          </div>

          <div className="qr-section">
            <div className="qr-code">
              {qrValue ? (
                <>
                  <QRCodeSVG 
                    id="qr-code-svg"
                    value={qrValue} 
                    size={120}
                    level="H"
                    includeMargin={true}
                  />
                  <p>Scan this QR code</p>
                </>
              ) : (
                <div className="qr-placeholder">
                  <i className="fas fa-qrcode"></i>
                  <p>QR code not available</p>
                </div>
              )}
            </div>
            <div className="pass-notes">
              <p><strong>Terms & Conditions:</strong></p>
              <ul>
                <li>Valid for travel between {passInfo.From} and {passInfo.To}</li>
                <li>Non-transferable</li>
                <li>Must be presented upon request</li>
                {passInfo.pass_expiry && (
                  <li>Valid until: {formatDate(passInfo.pass_expiry)}</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="pass-actions">
          <button className="btn primary" onClick={downloadQRCode}>
            <i className="fas fa-download"></i>
            Download QR Code
          </button>
          <button className="btn outline">
            <i className="fas fa-sync-alt"></i>
            Renew Pass
          </button>
          <button className="btn secondary">
            <i className="fas fa-share-alt"></i>
            Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default PassInfo;