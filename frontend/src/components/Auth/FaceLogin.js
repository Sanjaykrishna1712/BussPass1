import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginWithFace } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './FaceRegistration.css'; // reuse styles for consistency

const FaceLogin = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState(null);
  const { setAuthUser } = useAuth();
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

  const doFaceLogin = async () => {
    setLoading(true);
    setMessage('');
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        try {
          const formData = new FormData();
          formData.append('image', blob, 'login.jpg');

          const session = await loginWithFace(formData); // { token, user_id, name, user_type }
          setAuthUser(session);
          navigate('/Dashboard');
        } catch (err) {
          setMessage(err.message || 'Face login failed');
        } finally {
          setLoading(false);
        }
      }, 'image/jpeg', 0.95);
    } catch (err) {
      setMessage('Error capturing face: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="face-registration-container">
      <div className="face-registration-card">
        <h2>Login with Face</h2>
        <p className="instructions">Look at the camera, keep steady, and ensure good lighting.</p>
        <div className="video-container">
          <video ref={videoRef} autoPlay playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
        {message && <div className="message error">{message}</div>}
        <button onClick={doFaceLogin} disabled={loading || !stream} className="capture-button">
          {loading ? 'Verifying…' : 'Verify & Login'}
        </button>
        <div className="alt-links" style={{ marginTop: 14 }}>
          <Link to="/login">Use password instead</Link>
        </div>
      </div>
    </div>
  );
};

export default FaceLogin;
