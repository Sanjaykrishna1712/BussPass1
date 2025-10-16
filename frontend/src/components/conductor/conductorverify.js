import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyFace } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { conductorApi } from '../../services/api';
import './ConductorVerify.css';

const ConductorVerify = ({ bus, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('idle');
  const [userData, setUserData] = useState(null);
  const [verificationHistory, setVerificationHistory] = useState([]);
  
  const { setAuthUser } = useAuth();
  const navigate = useNavigate();

  // Initialize camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        // Stop existing stream if any
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
        setStream(s);
      } catch (err) {
        setMessage('Could not access camera: ' + err.message);
      }
    };
    
    startCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Restart camera when verification status resets to idle
  useEffect(() => {
    if (verificationStatus === 'idle' && !stream) {
      restartCamera();
    }
  }, [verificationStatus]);

  const restartCamera = async () => {
    try {
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      setStream(s);
      setMessage('');
    } catch (err) {
      setMessage('Could not access camera: ' + err.message);
    }
  };

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

  useEffect(() => {
    if (bus && bus._id) {
      fetchVerificationHistory();
    }
  }, [bus]);

  const doFaceVerification = async () => {
    setLoading(true);
    setVerificationStatus("processing");
    setMessage('');
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (!video || !canvas) {
        throw new Error("Video or canvas not available");
      }
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        try {
          const formData = new FormData();
          formData.append('image', blob, 'verification.jpg');

          // Step 1: Verify the face
          const faceVerificationResult = await verifyFace(formData);
          
          if (!faceVerificationResult.success || !faceVerificationResult.user_id) {
            setVerificationStatus("invalid");
            setMessage(faceVerificationResult.message || "Face not recognized");
            await storeVerification(
              null, 
              null, 
              "invalid", 
              faceVerificationResult.message || "Face not recognized"
            );
            return;
          }

          // Step 2: If face exists, check pass validity
          try {
            const passResponse = await conductorApi.post('/api/conductor/verify-pass', {
              userId: faceVerificationResult.user_id,
              busId: bus._id
            });

            if (passResponse.data.success) {
              setVerificationStatus("success");
              setUserData(passResponse.data.user);
              await storeVerification(
                faceVerificationResult.user_id, 
                passResponse.data.user, 
                "success", 
                "Pass verified successfully"
              );
            } else {
              setVerificationStatus("invalid");
              setMessage(passResponse.data.message || "Pass not valid for this bus");
              await storeVerification(
                faceVerificationResult.user_id, 
                null, 
                "invalid", 
                passResponse.data.message || "Pass not valid for this bus"
              );
            }
          } catch (passError) {
            setVerificationStatus("error");
            setMessage(passError.response?.data?.message || 'Error checking pass validity');
            await storeVerification(
              faceVerificationResult.user_id, 
              null, 
              "error", 
              passError.response?.data?.message || 'Error checking pass validity'
            );
          }
        } catch (err) {
          setVerificationStatus("error");
          setMessage(err.response?.data?.message || 'Face verification failed');
          await storeVerification(
            null, 
            null, 
            "error", 
            err.response?.data?.message || 'Face verification failed'
          );
        } finally {
          setLoading(false);
        }
      }, 'image/jpeg', 0.95);
    } catch (err) {
      setVerificationStatus("error");
      setMessage('Error capturing face: ' + err.message);
      setLoading(false);
      await storeVerification(
        null, 
        null, 
        "error", 
        'Error capturing face: ' + err.message
      );
    }
  };

  const storeVerification = async (userId, userData = null, status, message = null) => {
    try {
      const verificationData = {
        busId: bus._id,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date(),
        userId: userId,
        userName: userData?.name || null,
        userPhoto: userData?.photo || null,
        passId: userData?.passId || null,
        passType: userData?.passType || null,
        fromLocation: userData?.From || null,
        toLocation: userData?.To || null,
        validity: userData?.validity || null,
        status: status,
        busNumber: bus.busNumber,
        message: message
      };
      
      await conductorApi.post("/api/conductor/store-verification", verificationData);
      
      // Refresh verification history
      fetchVerificationHistory();
    } catch (error) {
      console.error("Error storing verification:", error);
    }
  };

  const resetVerification = async () => {
    setVerificationStatus("idle");
    setUserData(null);
    setMessage("");
    
    // Restart camera for next verification
    await restartCamera();
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Check if pass is valid for current bus route
  const isPassValidForRoute = () => {
    if (!userData || !bus) return false;
    
    const passFrom = userData.From?.toLowerCase();
    const passTo = userData.To?.toLowerCase();
    const busFrom = bus.from?.toLowerCase();
    const busTo = bus.to?.toLowerCase();
    
    return passFrom === busFrom && passTo === busTo;
  };

  return (
    <div className="conductor-verify-container">
      <div className="conductor-verify-card">
        <h2>Passenger Verification</h2>
        
        <div className="bus-info">
          
          <p>Date: {new Date().toLocaleDateString()}</p>
        </div>

        {message && (
          <div className={`message ${verificationStatus === "error" ? "error" : ""}`}>
            {message}
          </div>
        )}

        {verificationStatus === "idle" && (
          <div className="scanner-section">
            <p className="instructions">Position your face in the frame and click verify</p>
            
            <div className="video-container">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="scanner-video"
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              {stream ? (
                <>
                  <div className="scanner-frame"></div>
                  <div className="face-overlay">
                    <div className="face-circle"></div>
                  </div>
                </>
              ) : (
                <div className="scanner-fallback">
                  <i className="fas fa-camera-slash"></i>
                  <p>Camera not available</p>
                  <button 
                    className="primary-btn" 
                    onClick={restartCamera}
                    style={{marginTop: '10px'}}
                  >
                    Retry Camera
                  </button>
                </div>
              )}
            </div>
            
            <div className="scanner-controls">
              <button 
                className="capture-button primary-btn" 
                onClick={doFaceVerification} 
                disabled={loading || !stream}
              >
                {loading ? 'Verifying…' : 'Verify Face'}
              </button>
              <button 
                className="secondary-btn" 
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {verificationStatus === "processing" && (
          <div className="verification-processing">
            <div className="spinner"></div>
            <p>Verifying passenger...</p>
          </div>
        )}
        
        {verificationStatus === "success" && userData && (
          <div className="verification-result success">
            <div className="result-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h3>Pass Verified Successfully!</h3>
            
            {/* Route Validation Badge */}
            <div className={`route-validation ${isPassValidForRoute() ? 'valid' : 'invalid'}`}>
              <i className={`fas ${isPassValidForRoute() ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
              <span>
                {isPassValidForRoute() 
                  ? 'Pass valid for this route' 
                  : 'Pass route does not match bus route'}
              </span>
            </div>
            
            <div className="passenger-details">
              <div className="user-photo">
                {userData.photo ? (
                  <>
                    <img 
                      src={`http://localhost:5000/uploads/applicantPhotos/${userData.photo}`} 
                      alt={userData.name}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="photo-placeholder" style={{display: 'none'}}>
                      <i className="fas fa-user"></i>
                    </div>
                  </>
                ) : (
                  <div className="photo-placeholder" style={{display: 'flex'}}>
                    <i className="fas fa-user"></i>
                  </div>
                )}
              </div>
              
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
                <label>Route:</label>
                <span className="route-info">
                  {userData.From} → {userData.To}
                </span>
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
            <p>{message || "Please try again."}</p>
            
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
                <div key={index} className={`history-item ${item.status}`}>
                  <div className="history-info">
                    <div className="history-name">
                      {item.userName || item.userId || "Unknown User"}
                    </div>
                    <div className="history-time">
                      {formatTime(item.timestamp)}
                    </div>
                    {item.From && item.To && (
                      <div className="history-route">
                        {item.From} → {item.To}
                      </div>
                    )}
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
  );
};

export default ConductorVerify;