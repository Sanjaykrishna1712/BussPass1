import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ConductorAuthProvider } from "./context/ConductorAuthContext";
import PrivateRoute from './components/Common/PrivateRoute';
import ConductorPrivateRoute from './components/Common/ConductorPrivateRoute';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import FaceRegistration from './components/Auth/FaceRegistration';
import FaceLogin from './components/Auth/FaceLogin';
import Dashboard from './components/Dashboard/Dashboard';
import PassInfo from './components/Dashboard/PassInfo';
import TravelHistory from './components/Dashboard/TravelHistory';
import './App.css';
import Layout from './components/Dashboard/Layout';
import Profile from './components/Dashboard/Profile';
import HomePage from './components/Home/Home';
import AdminLogin from './components/Auth/AdminLogin';
import ConductorLogin from './components/Auth/ConductorLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import ConductorDashboard from './components/conductor/ConductorDashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ConductorAuthProvider>
          <div className="app-container">
            <Routes>
              {/* Home route */}
              <Route path="/" element={<HomePage />} />
              
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/login/face" element={<FaceLogin />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register-face" element={<FaceRegistration />} />
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route path="/conductor-login" element={<ConductorLogin />} />
              
              {/* Admin routes */}
              <Route path='/admin' element={<AdminDashboard/>}/>
              
              {/* Conductor routes - protected */}
              <Route 
                path='/conductor/ConductorDashboard' 
                element={
                  <ConductorPrivateRoute>
                    <ConductorDashboard/>
                  </ConductorPrivateRoute>
                }
              />
              
              {/* User private routes with Layout */}
              <Route element={<PrivateRoute />}>
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/pass" element={<PassInfo />} />
                  <Route path="/history" element={<TravelHistory />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>
              </Route>
            </Routes>
          </div>
        </ConductorAuthProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;