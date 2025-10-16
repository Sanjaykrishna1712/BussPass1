import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerFace } from '../../services/api';
import './FaceRegistration.css';

const FaceRegistration = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const start = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        videoRef.current.srcObject = s;
        setStream(s);
      } catch (err) {
        setMessage('Could not access camera: ' + err.message);
      }
    };
    start();
    return () => stream?.getTracks()?.forEach((t) => t.stop());
  }, []); // eslint-disable-line

  const captureMultipleFaces = async () => {
    setLoading(true);
    setMessage('');

    const user_id = localStorage.getItem('pending_user_id');
    if (!user_id) {
      setMessage('No pending registration found. Please register first.');
      setLoading(false);
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const formData = new FormData();
    formData.append('user_id', user_id);

    for (let i = 0; i < 5; i++) {
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      formData.append('images', blob, `face_${i + 1}.jpg`);

      await new Promise((res) => setTimeout(res, 800)); // wait ~0.8s between shots
    }

    try {
      const response = await registerFace(formData);
      if (response.success) {
        setMessage('Face registration successful! Redirecting…');
        localStorage.removeItem('pending_user_id');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setMessage(response.message || 'Registration failed');
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="face-registration-container">
      <div className="face-registration-card">
        <h2>Register Your Face</h2>
        <p className="instructions">Stay still, look at the camera, we’ll capture 5 samples automatically.</p>
        <div className="video-container">
          <video ref={videoRef} autoPlay playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
        {message && <div className={`message ${message.includes('successful') ? 'success' : 'error'}`}>{message}</div>}
        <button onClick={captureMultipleFaces} disabled={loading || !stream} className="capture-button">
          {loading ? 'Capturing…' : 'Start Face Capture'}
        </button>
        <div className="alt-links" style={{ marginTop: 14 }}>
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default FaceRegistration;
