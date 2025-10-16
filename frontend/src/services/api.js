// src/services/api.js
import axios from "axios";

export const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Create axios instance with base URL
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Conductor API instance
export const conductorApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Helper functions for token management
// FIXED: Enhanced token management with better error handling
export const userToken = {
  get: () => {
    try {
      const token = localStorage.getItem("token");
      console.log('Getting user token:', token ? 'Exists' : 'Missing');
      return token;
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return null;
    }
  },
  set: (token) => {
    try {
      console.log('Setting user token:', token ? 'Token set' : 'No token provided');
      if (token) {
        localStorage.setItem("token", token);
      }
    } catch (error) {
      console.error('Error setting token:', error);
    }
  },
  remove: () => {
    try {
      console.log('Removing user token');
      localStorage.removeItem("token");
      localStorage.removeItem("tokenExpiry");
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },
  exists: () => {
    try {
      return !!localStorage.getItem("token");
    } catch (error) {
      console.error('Error checking token existence:', error);
      return false;
    }
  }
};

export const conductorToken = {
  get: () => {
    const token = localStorage.getItem("conductorToken");
    console.log("Getting conductor token:", token ? "Found" : "Missing");
    return token;
  },
  set: (token) => {
    console.log("Setting conductor token:", token);
    localStorage.setItem("conductorToken", token);
  },
  remove: () => {
    console.log("Removing conductor token");
    localStorage.removeItem("conductorToken");
  },
  exists: () => !!localStorage.getItem("conductorToken")
};

// Regular user interceptor
api.interceptors.request.use(
  (config) => {
    const token = userToken.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Adding user token to request:', config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Conductor interceptor - FIXED
conductorApi.interceptors.request.use(
  (config) => {
    const token = conductorToken.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Adding conductor token to request:', config.url);
    } else {
      console.log('No conductor token found for request:', config.url);
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptors for error handling
// FIXED: Enhanced response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    const url = error.config?.url;
    const status = error.response?.status;
    
    console.error('API Error:', status, url, error.message);
    
    if (status === 401) {
      console.log('Unauthorized access detected');
      userToken.remove();
      
      // Only redirect if not already on login page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/conductor-login')) {
        console.log('Redirecting to login page');
        window.location.href = "/login";
      }
    }
    
    return Promise.reject(error);
  }
);
// Add to api.js
// Add this right after the conductorToken object definition (around line 67)

// Utility error handling function
export const handleApiError = (error, context = '') => {
  const status = error.response?.status;
  const message = error.response?.data?.message || error.message;
  
  console.error(`API Error [${context}]:`, status, message);
  
  // Specific handling for different status codes
  switch(status) {
    case 401:
      console.log('Authentication error, redirecting to login');
      userToken.remove();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = "/login";
      }
      break;
    case 403:
      console.log('Access forbidden');
      break;
    case 404:
      console.log('Resource not found');
      break;
    case 500:
      console.log('Server error occurred');
      break;
    default:
      console.log('Unknown error occurred');
  }
  
  return { success: false, message, status };
};

// Then later, add the validateToken and getUserProfileWithValidation functions
// Add to api.js (around line 169)
export const validateToken = async () => {
  try {
    const token = userToken.get();
    if (!token) {
      return { valid: false, message: 'No token found' };
    }

    const response = await api.get('/api/auth/verify-token');
    return response.data;
  } catch (error) {
    console.error('Token validation failed:', error);
    userToken.remove();
    return handleApiError(error, 'validateToken');
  }
};

// Use this before making sensitive API calls
export const getUserProfileWithValidation = async (userId) => {
  try {
    // First validate token
    const tokenValidation = await validateToken();
    if (!tokenValidation.valid) {
      return tokenValidation;
    }

    const response = await api.get(`/api/auth/profile/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Get user profile error:", error);
    return handleApiError(error, 'getUserProfileWithValidation');
  }
};
// Conductor response interceptor with token refresh logic
conductorApi.interceptors.response.use(
  (response) => {
    console.log('Conductor API Response:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    console.error('Conductor API Error:', error.response?.status, error.config?.url);
    
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('Unauthorized access - attempting token refresh');
      originalRequest._retry = true;
      
      try {
        const refreshSuccess = await refreshConductorToken();
        if (refreshSuccess) {
          // Retry the original request with new token
          const token = conductorToken.get();
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return conductorApi(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
      
      // If refresh fails, logout and redirect
      console.log('Token refresh failed - logging out');
      conductorToken.remove();
      
      // Don't redirect if we're already on the login page to avoid loops
      if (!window.location.pathname.includes('/conductor-login')) {
        console.log('Redirecting to conductor login');
        window.location.href = "/conductor-login";
      }
    }
    
    return Promise.reject(error);
  }
);

// Token refresh function - IMPLEMENTED
// FIXED: Token refresh function with proper Content-Type
// FIXED: Token refresh function with proper implementation
const refreshConductorToken = async () => {
  try {
    console.log('Attempting to refresh conductor token');

    const currentToken = conductorToken.get();
    if (!currentToken) {
      console.log('No current token available for refresh');
      return false;
    }

    // Create a temporary axios instance without interceptors to avoid loops
    const refreshApi = axios.create({
      baseURL: API_BASE_URL,
      timeout: 5000,
    });

    // Add current token to Authorization header
    refreshApi.defaults.headers.Authorization = `Bearer ${currentToken}`;

    // Send empty JSON object instead of undefined
    const response = await refreshApi.post('/auth/conductor/refresh', {});

    if (response.data.success && response.data.token) {
      conductorToken.set(response.data.token);
      console.log('Token refreshed successfully');
      return true;
    } else {
      console.log('Token refresh failed - invalid response:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Token refresh failed:', error.response?.status, error.message);
    return false;
  }
};

// ===== FACE AUTH APIs =====
export const registerFace = async (formData) => {
  try {
    const response = await api.post("/api/face_auth/register", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      }
    });
    return response.data;
  } catch (error) {
    console.error("Face registration error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Face registration failed" 
    };
  }
};

export const verifyFace = async (formData) => {
  try {
    const response = await api.post("/api/face_auth/verify", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  } catch (error) {
    console.error("Face verification error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Face verification failed" 
    };
  }
};

export const loginWithFace = async (formData) => {
  try {
    console.log('🔐 Starting face login process');
    
    // First verify the face
    const verifyResponse = await api.post("/api/face_auth/verify", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });

    console.log('✅ Face verification response:', verifyResponse.data);

    if (!verifyResponse.data?.success || !verifyResponse.data?.user_id) {
      throw new Error(verifyResponse.data?.message || "Face not recognized");
    }

    // Then login with the user ID - MAKE SURE THIS RETURNS A TOKEN
    const loginResponse = await api.post("/auth/login_face", {
      user_id: verifyResponse.data.user_id,
    });

    console.log('✅ Face login response:', loginResponse.data);

    // CRITICAL: Store the token returned from login_face
    if (loginResponse.data.token) {
      userToken.set(loginResponse.data.token);
      console.log('💾 Token stored from face login');
    } else {
      console.warn('⚠️ No token returned from face login');
    }

    return loginResponse.data;
  } catch (error) {
    console.error("❌ Face login error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Face login failed" 
    };
  }
};

// ===== CONDUCTOR APIs =====
// FIXED: Use consistent endpoint paths
export const conductorLogin = async (credentials) => {
  console.log("Attempting conductor login with:", credentials);
  try {
    // Use conductorApi (not api) and consistent endpoint
    const response = await conductorApi.post("/api/auth/conductor/login", credentials);
    console.log("Conductor login response:", response.data);
    
    if (response.data.success && response.data.token) {
      conductorToken.set(response.data.token);
      // Set the token for future requests
      conductorApi.defaults.headers.Authorization = `Bearer ${response.data.token}`;
    }
    
    return response.data;
  } catch (error) {
    console.error("Conductor login error:", error);
    throw error;
  }
};

export const getConductorProfile = async () => {
  try {
    console.log('Fetching conductor profile');
    const response = await conductorApi.get("/api/auth/conductor/profile");
    console.log('Conductor profile response:', response.data);
    return response.data;
  } catch (error) {
    console.error("Get conductor profile error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Failed to fetch conductor profile" 
    };
  }
};

export const getDepotBuses = async (depotId) => {
  try {
    const response = await conductorApi.get(`/api/conductor/depot/${depotId}/buses`);
    return response.data;
  } catch (error) {
    console.error("Get depot buses error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Failed to fetch buses" 
    };
  }
};

export const scanQRCode = async (busId, qrData) => {
  try {
    const response = await conductorApi.post("/api/conductor/scan-qr", {
      busId,
      qrData
    });
    return response.data;
  } catch (error) {
    console.error("QR scan error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "QR scan failed" 
    };
  }
};

export const verifyPass = async (userId, busId) => {
  try {
    const response = await conductorApi.post("/api/conductor/verify-pass", {
      userId,
      busId
    });
    return response.data;
  } catch (error) {
    console.error("Pass verification error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Pass verification failed" 
    };
  }
};

export const verifyFaceImage = async (formData, busId) => {
  try {
    const response = await conductorApi.post("/api/conductor/verify-face", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      params: { busId }
    });
    return response.data;
  } catch (error) {
    console.error("Face verification error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Face verification failed" 
    };
  }
};

export const processPayment = async (paymentData) => {
  try {
    const response = await conductorApi.post("/api/conductor/process-payment", paymentData);
    return response.data;
  } catch (error) {
    console.error("Payment processing error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Payment processing failed" 
    };
  }
};

export const sendTicketSMS = async (smsData) => {
  try {
    const response = await conductorApi.post("/api/conductor/send-ticket-sms", smsData);
    return response.data;
  } catch (error) {
    console.error("SMS sending error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Failed to send SMS" 
    };
  }
};

export const storeVerification = async (verificationData) => {
  try {
    const response = await conductorApi.post("/api/conductor/store-verification", verificationData);
    return response.data;
  } catch (error) {
    console.error("Store verification error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Failed to store verification" 
    };
  }
};

export const getVerificationHistory = async (busId, date) => {
  try {
    const response = await conductorApi.get("/api/conductor/verification-history", {
      params: { busId, date }
    });
    return response.data;
  } catch (error) {
    console.error("Get verification history error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Failed to fetch verification history" 
    };
  }
};

export const getConductorStats = async (date) => {
  try {
    const response = await conductorApi.get("/api/conductor/stats", {
      params: { date }
    });
    return response.data;
  } catch (error) {
    console.error("Get stats error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Failed to fetch stats" 
    };
  }
};

export const getConductorVerifications = async () => {
  try {
    const response = await conductorApi.get("/api/conductor/verifications");
    return response.data;
  } catch (error) {
    console.error("Get conductor verifications error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Failed to fetch verifications" 
    };
  }
};

// ===== USER APIs =====
export const getUserProfile = async (userId) => {
  try {
    const response = await api.get(`/api/auth/profile/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Get user profile error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Failed to fetch user profile" 
    };
  }
};
// Test your token validation
export const testTokenValidation = async () => {
  console.log('Testing token validation...');
  
  // Check if token exists
  const token = userToken.get();
  console.log('Current token:', token ? `Exists (${token.length} chars)` : 'Missing');
  
  if (!token) {
    console.log('No token found. User needs to login.');
    return false;
  }
  
  // Test the token with debug endpoint
  try {
    const response = await api.get('/api/debug/check-token');
    console.log('Token validation result:', response.data);
    return response.data.found_in_users || response.data.found_in_conductors;
  } catch (error) {
    console.error('Token validation failed:', error.response?.data || error.message);
    return false;
  }
};

// Call this function when your app loads
// testTokenValidation();
export const getUserPassInfo = async () => {
  try {
    const response = await api.get("/api/user/pass-info");
    return response.data;
  } catch (error) {
    console.error("Get user pass info error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Failed to fetch pass information" 
    };
  }
};

export const getUserTripHistory = async () => {
  try {
    const response = await api.get("/api/user/trip-history");
    return response.data;
  } catch (error) {
    console.error("Get trip history error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Failed to fetch trip history" 
    };
  }
};

// ===== ADMIN APIs =====
export const adminLogin = async (credentials) => {
  try {
    const response = await api.post("/api/admin/login", credentials);
    return response.data;
  } catch (error) {
    console.error("Admin login error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Admin login failed" 
    };
  }
};

export const getAllUsers = async () => {
  try {
    const response = await api.get("/api/users");
    return response.data;
  } catch (error) {
    console.error("Get users error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Failed to fetch users" 
    };
  }
};

export const getCertificateRequests = async () => {
  try {
    const response = await api.get("/api/certificate-requests");
    return response.data;
  } catch (error) {
    console.error("Get certificate requests error:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Failed to fetch certificate requests" 
    };
  }
};

// Utility function for creating cancelable requests
export const createCancelToken = () => {
  return axios.CancelToken.source();
};

// Utility function to check if error is a cancellation
export const isCancel = (error) => {
  return axios.isCancel(error);
};

export default api;