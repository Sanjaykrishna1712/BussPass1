// Camera.js
import React, { useRef, useEffect, useState } from 'react';
import './Camera.css';

const Camera = ({ onCapture, onClose, mode = "photo" }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
    } catch (err) {
      setError('Cannot access camera: ' + err.message);
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      onCapture(blob);
    }, 'image/jpeg', 0.8);
  };

  return (
    <div className="camera-container">
      <div className="camera-header">
        <h3>{mode === "qr" ? "Scan QR Code" : "Take Photo"}</h3>
        <button className="close-btn" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      <div className="camera-view">
        <video ref={videoRef} autoPlay playsInline muted />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="camera-controls">
          <button className="capture-btn" onClick={capturePhoto}>
            <i className="fas fa-camera"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Camera;