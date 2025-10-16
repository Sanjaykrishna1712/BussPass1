// QRVerification.js
import React, { useState, useRef, useEffect } from "react";
import { conductorApi } from "../../services/api";
import jsQR from "jsqr";
import "./Verification.css";

const QRVerification = ({ bus, onClose }) => {
  const [verificationStatus, setVerificationStatus] = useState("idle");
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (showCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [showCamera]);

  useEffect(() => {
    // Load verification history for this bus and date
    fetchVerificationHistory();
  }, [bus]);

  const fetchVerificationHistory = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await conductorApi.get(
        `/api/conductor/verification-history?busId=${bus._id}&date=${today}`
      );
      
      if (response.data.success) {
        setVerificationHistory(response.data.history);
      }
    } catch (error) {
      console.error("Error fetching verification history:", error);
    }
  };

  const startCamera = async () => {
    try {
      setCameraError("");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          scanQRCode();
        };
      }
    } catch (err) {
      setCameraError('Cannot access camera: ' + err.message);
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const scanQRCode = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanQRCode);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (code) {
      console.log("QR Code detected:", code.data);
      handleQRScan(code.data);
      return;
    }
    
    animationFrameRef.current = requestAnimationFrame(scanQRCode);
  };

  const handleQRScan = async (qrData) => {
    try {
      setVerificationStatus("processing");
      setError("");
      setShowCamera(false);

      // Parse the QR data
      let userId;
      try {
        const parsedData = JSON.parse(qrData);
        userId = parsedData.userId || parsedData.id || qrData;
      } catch (e) {
        userId = qrData;
      }

      const response = await conductorApi.post("/api/conductor/verify-pass", {
        userId: userId,
        busNumber: bus.busNumber,
        busId: bus._id
      });
      
      if (response.data.success) {
        if (response.data.valid) {
          setVerificationStatus("success");
          setUserData(response.data.user);
          
          // Store successful verification in database
          await storeVerification(userId, response.data.user, "verified");
        } else {
          setVerificationStatus("invalid");
          setError(response.data.message);
          
          // Store failed verification attempt
          await storeVerification(userId, null, "failed", response.data.message);
        }
      } else {
        setVerificationStatus("error");
        setError(response.data.message || "Verification failed");
        
        // Store error verification attempt
        await storeVerification(userId, null, "error", response.data.message || "Verification failed");
      }
    } catch (error) {
      console.error("QR verification error:", error);
      setVerificationStatus("error");
      setError(error.response?.data?.message || "Verification failed. Please try again.");
      
      // Store error verification attempt
      await storeVerification(null, null, "error", error.response?.data?.message || "Verification failed");
    }
  };

  const storeVerification = async (userId, userData = null, status, message = null) => {
    try {
      const verificationData = {
        busId: bus._id,
        date: new Date().toISOString().split('T')[0], // Store date in YYYY-MM-DD format
        timestamp: new Date(),
        userId: userId,
        userName: userData?.name || null,
        userPhoto: userData?.photo || null,
        passId: userData?.passId || null,
        passType: userData?.passType || null,
        validity: userData?.validity || null,
        From: userData?.From || null,
        To: userData?.To || null,
        status: status,
        busNumber: bus.busNumber,
        message: message
      };
      
      const response = await conductorApi.post("/api/conductor/store-verification", verificationData);
      
      if (response.data.success) {
        // Refresh verification history
        fetchVerificationHistory();
      }
    } catch (error) {
      console.error("Error storing verification:", error);
    }
  };

  const resetVerification = () => {
    setVerificationStatus("idle");
    setUserData(null);
    setError("");
    setCameraError("");
    setShowCamera(true);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="verification-overlay">
      <div className="verification-modal">
        <div className="modal-header">
          <h2>QR Pass Verification</h2>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body">
          <div className="bus-info">
            
            <p>Date: {new Date().toLocaleDateString()}</p>
          </div>
          
          {showCamera && (
            <div className="qr-scanner">
              <div className="scanner-header">
                <h3>Scan QR Code</h3>
                <p>Position the QR code within the frame</p>
              </div>
              
              <div className="scanner-view">
                <video ref={videoRef} className="scanner-video" />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div className="scanner-frame"></div>
                <div className="scanner-corners">
                  <div className="scanner-corner scanner-corner-top-left"></div>
                  <div className="scanner-corner scanner-corner-top-right"></div>
                  <div className="scanner-corner scanner-corner-bottom-left"></div>
                  <div className="scanner-corner scanner-corner-bottom-right"></div>
                </div>
                <div className="scanning-line"></div>
                <div className="scanner-focus"></div>
                <div className="scanner-status">Scanning...</div>
                
                {cameraError && (
                  <div className="scanner-fallback">
                    <i className="fas fa-camera-slash"></i>
                    <p>Camera not available</p>
                    <p>{cameraError}</p>
                  </div>
                )}
              </div>
              
              <div className="scanner-controls">
                <button className="secondary-btn" onClick={() => setShowCamera(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {!showCamera && verificationStatus === "idle" && (
            <div className="verification-instructions">
              <div className="qr-scanner-placeholder" onClick={() => setShowCamera(true)}>
                <i className="fas fa-qrcode"></i>
                <p>Click to scan QR code</p>
              </div>
              <div className="action-buttons">
                <button 
                  className="primary-btn" 
                  onClick={() => setShowCamera(true)}
                >
                  Scan QR Code
                </button>
              </div>
            </div>
          )}
          
          {verificationStatus === "processing" && (
            <div className="verification-processing">
              <div className="spinner"></div>
              <p>Verifying pass...</p>
            </div>
          )}
          
          {verificationStatus === "success" && userData && (
            <div className="verification-result success">
              <div className="result-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <h3>Pass Verified Successfully!</h3>
              
              <div className="passenger-details">
                {userData.photo && (
                  <div className="user-photo">
                    <img 
                      src={`http://localhost:5000/uploads/applicantPhotos/${userData.photo}`} 
                      alt={userData.name}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="photo-placeholder">
                      <i className="fas fa-user"></i>
                    </div>
                  </div>
                )}
                
                <div className="detail-row">
                  <label>Name:</label>
                  <span>{userData.name}</span>
                </div>
                <div className="detail-row">
                  <label>Pass ID:</label>
                  <span>{userData.passId}</span>
                </div>
                <div className="detail-row">
                  <label>Pass Type:</label>
                  <span>{userData.passType}</span>
                </div>
                <div className="detail-row">
                  <label>From:</label>
                  <span>{userData.From || "N/A"}</span> 
                </div>
                <div className="detail-row">
                  <label>To:</label>
                  <span>{userData.To || "N/A"}</span> 
                </div>  
                <div className="detail-row">
                  <label>Validity:</label>
                  <span>{new Date(userData.validity).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="action-buttons">
                <button className="primary-btn" onClick={resetVerification}>
                  Verify Another Passenger
                </button>
                <button className="secondary-btn" onClick={onClose}>
                  Finish
                </button>
              </div>
            </div>
          )}
          
          {(verificationStatus === "invalid" || verificationStatus === "error") && (
            <div className="verification-result failed">
              <div className="result-icon">
                <i className="fas fa-times-circle"></i>
              </div>
              <h3>{verificationStatus === "invalid" ? "Pass Not Valid" : "Verification Error"}</h3>
              <p>{error || "Please try again."}</p>
              
              <div className="action-buttons">
                <button className="primary-btn" onClick={resetVerification}>
                  Try Again
                </button>
                <button className="secondary-btn" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Verification History Section */}
          <div className="verification-history">
            <h3>Today's Verifications</h3>
            {verificationHistory.length > 0 ? (
              <div className="history-list">
                {verificationHistory.map((item, index) => (
                  <div key={index} className="history-item">
                    <div className="history-info">
                      <div className="history-name">
                        {item.userName || item.userId || "Unknown User"}
                      </div>
                      <div className="history-time">
                        {formatTime(item.timestamp)}
                      </div>
                    </div>
                    <div className={`history-status ${item.status}`}>
                      {item.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-history">No verifications recorded today</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRVerification;