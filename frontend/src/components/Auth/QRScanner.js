import React, { useEffect, useRef, useState } from 'react';
import Navbar from '../Common/Navbar';

const QRScanner = () => {
  const videoRef = useRef(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let stream;
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoRef.current.srcObject = stream;
        // You can integrate a QR lib like jsQR here by drawing frames to canvas
        setMessage('Scanner ready (demo placeholder)');
      } catch (e) {
        setMessage('Camera error: ' + e.message);
      }
    };
    start();
    return () => stream?.getTracks()?.forEach((t) => t.stop());
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f7fa' }}>
      <Navbar />
      <div style={{ flex: 1, padding: 30 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <h2>QR Scanner</h2>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxWidth: 480, borderRadius: 8 }} />
          <p style={{ marginTop: 12, color: '#555' }}>{message}</p>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
