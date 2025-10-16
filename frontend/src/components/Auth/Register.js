import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import './Register.css';
import './MultiStepForm.css';

export default function RegistrationForm() {
  const [formData, setFormData] = useState({
    // SSC Details
    boardType: "",
    name: "",
    email: "",
    password: "",
    user_type: "",
    fatherName: "",
    gender: "",
    dob: "",
    applicantPhoto: null,

    // Proofs
    aadharNumber: "",
    mobileNo: "",
    district: "",
    mandal: "",
    address: "",

    // Institution Details
    instDistrict: "",
    instMandal: "",
    institutionName: "",
    courseName: "",
    presentCourseYear: "",
    instAddress: "",
    admissionNumber: "",
    studyCertificate: null,

    // Pass Category
     From: "",
     To: "",
    passType: "",
    serviceType: "",
    renewalFrequency: "",
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [fileName, setFileName] = useState({
    applicantPhoto: "",
    studyCertificate: ""
  });
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // File validation function
  const validateFile = (file, allowedTypes, maxSizeMB) => {
    if (!file) return "File is required";
    
    const extension = file.name.split('.').pop().toLowerCase();
    const type = file.type;
    const validType = allowedTypes.includes(extension) || allowedTypes.includes(type);
    
    if (!validType) {
      return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
    }
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size must be less than ${maxSizeMB}MB`;
    }
    
    return null;
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.boardType) newErrors.boardType = "Board type is required";
      if (!formData.name) newErrors.name = "Name is required";
      if (!formData.email) {
        newErrors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Email is invalid";
      }
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
      if (!formData.user_type) newErrors.user_type = "User type is required";
      if (!formData.fatherName) newErrors.fatherName = "Father's name is required";
      if (!formData.gender) newErrors.gender = "Gender is required";
      if (!formData.dob) newErrors.dob = "Date of birth is required";
      
      // File validation for applicant photo
      if (!formData.applicantPhoto) {
        newErrors.applicantPhoto = "Photo is required";
      } else {
        const fileError = validateFile(formData.applicantPhoto, ['jpg', 'jpeg', 'png'], 5);
        if (fileError) newErrors.applicantPhoto = fileError;
      }
    }
    
    if (step === 2) {
      if (!formData.aadharNumber) {
        newErrors.aadharNumber = "Aadhar number is required";
      } else if (!/^\d{12}$/.test(formData.aadharNumber)) {
        newErrors.aadharNumber = "Aadhar number must be 12 digits";
      }
      if (!formData.mobileNo) {
        newErrors.mobileNo = "Mobile number is required";
      } else if (!/^\d{10}$/.test(formData.mobileNo)) {
        newErrors.mobileNo = "Mobile number must be 10 digits";
      }
      if (!formData.district) newErrors.district = "District is required";
      if (!formData.mandal) newErrors.mandal = "Mandal is required";
      if (!formData.address) newErrors.address = "Address is required";
    }
    
    if (step === 3) {
      if (!formData.instDistrict) newErrors.instDistrict = "Institute district is required";
      if (!formData.instMandal) newErrors.instMandal = "Institute mandal is required";
      if (!formData.institutionName) newErrors.institutionName = "Institution name is required";
      if (!formData.courseName) newErrors.courseName = "Course name is required";
      if (!formData.presentCourseYear) newErrors.presentCourseYear = "Course year is required";
      if (!formData.instAddress) newErrors.instAddress = "Institution address is required";
      if (!formData.admissionNumber) newErrors.admissionNumber = "Admission number is required";
      
      // File validation for study certificate
      if (!formData.studyCertificate) {
        newErrors.studyCertificate = "Study certificate is required";
      } else {
        const fileError = validateFile(formData.studyCertificate, ['jpg', 'jpeg', 'png', 'pdf'], 10);
        if (fileError) newErrors.studyCertificate = fileError;
      }
    }
    
    if (step === 4) {
  if (!formData.From) newErrors.from = "From location is required";  // Changed
  if (!formData.To) newErrors.to = "To location is required";        // Changed
  if (!formData.passType) newErrors.passType = "Pass type is required";
  if (!formData.serviceType) newErrors.serviceType = "Service type is required";
  if (!formData.renewalFrequency) newErrors.renewalFrequency = "Renewal frequency is required";
}
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    if (type === "file") {
      if (files[0]) {
        const file = files[0];
        
        setFormData({
          ...formData,
          [name]: file
        });
        
        setFileName({
          ...fileName,
          [name]: file.name
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) return;
    
    setIsSubmitting(true);
    setSubmitStatus(null);
    
    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        data.append(key, formData[key]);
      });

      const res = await fetch("http://127.0.0.1:5000/auth/register", {
        method: "POST",
        body: data,
      });

      const result = await res.json();
      
      if (res.ok) {
        // Store user ID for face registration
        localStorage.setItem('pending_user_id', result.user_id);
        
        // Redirect to face registration page
        navigate('/');
      } else {
        setSubmitStatus(result.message || "Registration failed. Please try again.");
      }
    } catch (error) {
      setSubmitStatus("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Progress percentage
  const progressPercentage = (currentStep / 4) * 100;

  return (
    <div className="registration-container">
      <div className="registration-header">
        <h1>Bus Pass Registration</h1>
        <p>Complete your application in a few simple steps</p>
        <p>Already have an account? <Link to="/login">Login here</Link></p>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="progress-steps">
          <span className={currentStep >= 1 ? "active" : ""}>Personal Details</span>
          <span className={currentStep >= 2 ? "active" : ""}>Proofs</span>
          <span className={currentStep >= 3 ? "active" : ""}>Institution</span>
          <span className={currentStep >= 4 ? "active" : ""}>Pass Details</span>
        </div>
      </div>

      {submitStatus && (
        <div className={`alert ${submitStatus.includes("error") || submitStatus.includes("failed") ? "error" : "info"}`}>
          <i className={`fas ${submitStatus.includes("error") || submitStatus.includes("failed") ? "fa-exclamation-circle" : "fa-info-circle"}`}></i> 
          {submitStatus}
        </div>
      )}

      <form onSubmit={handleSubmit} className="registration-card">
        {/* Step 1: SSC DETAILS */}
        {currentStep === 1 && (
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <i className="fas fa-user-graduate"></i>
              </div>
              <h2 className="section-title">Student Details</h2>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Board Type</label>
                <select 
                  name="boardType" 
                  value={formData.boardType}
                  onChange={handleChange} 
                  className={`form-control ${errors.boardType ? 'error' : ''}`}
                  required
                >
                  <option value="">Select Board</option>
                  <option value="AP SSC">AP SSC</option>
                  <option value="CBSE">CBSE</option>
                  <option value="ICSE">ICSE</option>
                  <option value="APOS">APOS</option>
                  <option value="RDD">RDD</option>
                  <option value="Oriental">Oriental</option>
                  <option value="Others">Others</option>
                </select>
                {errors.boardType && <span className="error-text">{errors.boardType}</span>}
              </div>
              
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name}
                  placeholder="Enter your full name" 
                  onChange={handleChange} 
                  className={`form-control ${errors.name ? 'error' : ''}`}
                  required
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>
              
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email}
                  placeholder="Enter your email" 
                  onChange={handleChange} 
                  className={`form-control ${errors.email ? 'error' : ''}`}
                  required
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>
              
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  name="password" 
                  value={formData.password}
                  placeholder="Create a password" 
                  onChange={handleChange} 
                  className={`form-control ${errors.password ? 'error' : ''}`}
                  required
                />
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>
              
              <div className="form-group">
                <label>User Type</label>
                <select 
                  name="user_type" 
                  value={formData.user_type}
                  onChange={handleChange} 
                  className={`form-control ${errors.user_type ? 'error' : ''}`}
                  required
                >
                  <option value="">Select User Type</option>
                  <option value="student">Student</option>
                  <option value="employee">Employee</option>
                  <option value="senior">Senior Citizen</option>
                </select>
                {errors.user_type && <span className="error-text">{errors.user_type}</span>}
              </div>
              
              <div className="form-group">
                <label>Father's Name</label>
                <input 
                  type="text" 
                  name="fatherName" 
                  value={formData.fatherName}
                  placeholder="Enter father's name" 
                  onChange={handleChange} 
                  className={`form-control ${errors.fatherName ? 'error' : ''}`}
                  required
                />
                {errors.fatherName && <span className="error-text">{errors.fatherName}</span>}
              </div>
              
              <div className="form-group">
                <label>Gender</label>
                <select 
                  name="gender" 
                  value={formData.gender}
                  onChange={handleChange} 
                  className={`form-control ${errors.gender ? 'error' : ''}`}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && <span className="error-text">{errors.gender}</span>}
              </div>
              
              <div className="form-group">
                <label>Date of Birth</label>
                <input 
                  type="date" 
                  name="dob" 
                  value={formData.dob}
                  onChange={handleChange} 
                  className={`form-control ${errors.dob ? 'error' : ''}`}
                  required
                />
                {errors.dob && <span className="error-text">{errors.dob}</span>}
              </div>
              
              <div className="form-group">
                <label>Applicant Photo</label>
                <div className="file-upload">
                  <label className="file-upload-btn">
                    <i className="fas fa-upload"></i> Upload Photo
                    <input 
                      type="file" 
                      name="applicantPhoto" 
                      accept="image/*" 
                      onChange={handleChange} 
                      className="file-upload-input"
                      required
                    />
                  </label>
                  {fileName.applicantPhoto && (
                    <div className="file-name">{fileName.applicantPhoto}</div>
                  )}
                  {errors.applicantPhoto && <span className="error-text">{errors.applicantPhoto}</span>}
                </div>
              </div>
            </div>
            
            <div style={{ textAlign: 'right', marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={nextStep}
              >
                Next <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Proofs */}
        {currentStep === 2 && (
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <i className="fas fa-id-card"></i>
              </div>
              <h2 className="section-title">Identity Proofs</h2>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Aadhar Number</label>
                <input 
                  type="text" 
                  name="aadharNumber" 
                  value={formData.aadharNumber}
                  placeholder="Enter Aadhar number" 
                  onChange={handleChange} 
                  className={`form-control ${errors.aadharNumber ? 'error' : ''}`}
                  required
                />
                {errors.aadharNumber && <span className="error-text">{errors.aadharNumber}</span>}
              </div>
              
              <div className="form-group">
                <label>Mobile Number</label>
                <input 
                  type="text" 
                  name="mobileNo" 
                  value={formData.mobileNo}
                  placeholder="Enter mobile number" 
                  onChange={handleChange} 
                  className={`form-control ${errors.mobileNo ? 'error' : ''}`}
                  required
                />
                {errors.mobileNo && <span className="error-text">{errors.mobileNo}</span>}
              </div>
              
              <div className="form-group">
                <label>District</label>
                <input 
                  type="text" 
                  name="district" 
                  value={formData.district}
                  placeholder="Enter district" 
                  onChange={handleChange} 
                  className={`form-control ${errors.district ? 'error' : ''}`}
                  required
                />
                {errors.district && <span className="error-text">{errors.district}</span>}
              </div>
              
              <div className="form-group">
                <label>Mandal</label>
                <input 
                  type="text" 
                  name="mandal" 
                  value={formData.mandal}
                  placeholder="Enter mandal" 
                  onChange={handleChange} 
                  className={`form-control ${errors.mandal ? 'error' : ''}`}
                  required
                />
                {errors.mandal && <span className="error-text">{errors.mandal}</span>}
              </div>
              
              <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
                <label>Residential Address</label>
                <textarea 
                  name="address" 
                  value={formData.address}
                  placeholder="Enter your complete address" 
                  onChange={handleChange} 
                  className={`form-control ${errors.address ? 'error' : ''}`}
                  required
                ></textarea>
                {errors.address && <span className="error-text">{errors.address}</span>}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn"
                onClick={prevStep}
                style={{ background: '#e9ecef', color: '#495057' }}
              >
                <i className="fas fa-arrow-left"></i> Back
              </button>
              
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={nextStep}
              >
                Next <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Institution Details */}
        {currentStep === 3 && (
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <i className="fas fa-school"></i>
              </div>
              <h2 className="section-title">Institution Details</h2>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Institute District</label>
                <input 
                  type="text" 
                  name="instDistrict" 
                  value={formData.instDistrict}
                  placeholder="Enter institute district" 
                  onChange={handleChange} 
                  className={`form-control ${errors.instDistrict ? 'error' : ''}`}
                  required
                />
                {errors.instDistrict && <span className="error-text">{errors.instDistrict}</span>}
              </div>
              
              <div className="form-group">
                <label>Institute Mandal</label>
                <input 
                  type="text" 
                  name="instMandal" 
                  value={formData.instMandal}
                  placeholder="Enter institute mandal" 
                  onChange={handleChange} 
                  className={`form-control ${errors.instMandal ? 'error' : ''}`}
                  required
                />
                {errors.instMandal && <span className="error-text">{errors.instMandal}</span>}
              </div>
              
              <div className="form-group">
                <label>Institution Name</label>
                <input 
                  type="text" 
                  name="institutionName" 
                  value={formData.institutionName}
                  placeholder="Enter institution name" 
                  onChange={handleChange} 
                  className={`form-control ${errors.institutionName ? 'error' : ''}`}
                  required
                />
                {errors.institutionName && <span className="error-text">{errors.institutionName}</span>}
              </div>
              
              <div className="form-group">
                <label>Course Name</label>
                <input 
                  type="text" 
                  name="courseName" 
                  value={formData.courseName}
                  placeholder="Enter course name" 
                  onChange={handleChange} 
                  className={`form-control ${errors.courseName ? 'error' : ''}`}
                  required
                />
                {errors.courseName && <span className="error-text">{errors.courseName}</span>}
              </div>
              
              <div className="form-group">
                <label>Present Course Year</label>
                <input 
                  type="text" 
                  name="presentCourseYear" 
                  value={formData.presentCourseYear}
                  placeholder="Enter current year" 
                  onChange={handleChange} 
                  className={`form-control ${errors.presentCourseYear ? 'error' : ''}`}
                  required
                />
                {errors.presentCourseYear && <span className="error-text">{errors.presentCourseYear}</span>}
              </div>
              
              <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
                <label>Institution Address</label>
                <textarea 
                  name="instAddress" 
                  value={formData.instAddress}
                  placeholder="Enter complete institution address" 
                  onChange={handleChange} 
                  className={`form-control ${errors.instAddress ? 'error' : ''}`}
                  required
                ></textarea>
                {errors.instAddress && <span className="error-text">{errors.instAddress}</span>}
              </div>
              
              <div className="form-group">
                <label>Admission Number</label>
                <input 
                  type="text" 
                  name="admissionNumber" 
                  value={formData.admissionNumber}
                  placeholder="Enter admission number" 
                  onChange={handleChange} 
                  className={`form-control ${errors.admissionNumber ? 'error' : ''}`}
                  required
                />
                {errors.admissionNumber && <span className="error-text">{errors.admissionNumber}</span>}
              </div>
              
              <div className="form-group">
                <label>Study Certificate</label>
                <div className="file-upload">
                  <label className="file-upload-btn">
                    <i className="fas fa-upload"></i> Upload Certificate
                    <input 
                      type="file" 
                      name="studyCertificate" 
                      accept=".jpg,.jpeg,.png,.pdf" 
                      onChange={handleChange} 
                      className="file-upload-input"
                      required
                    />
                  </label>
                  {fileName.studyCertificate && (
                    <div className="file-name">{fileName.studyCertificate}</div>
                  )}
                  {errors.studyCertificate && <span className="error-text">{errors.studyCertificate}</span>}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn"
                onClick={prevStep}
                style={{ background: '#e9ecef', color: '#495057' }}
              >
                <i className="fas fa-arrow-left"></i> Back
              </button>
              
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={nextStep}
              >
                Next <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Pass Categories */}
        {currentStep === 4 && (
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <i className="fas fa-bus"></i>
              </div>
              <h2 className="section-title">Pass Details</h2>
            </div>
            
            <div className="form-grid">
          
<div className="form-group">
  <label>From</label>
  <input 
    type="text" 
    name="From"  // Changed from "from" to "From"
    value={formData.From}
    placeholder="Enter from location" 
    onChange={handleChange} 
    className={`form-control ${errors.From ? 'error' : ''}`}
    required
  />
  {errors.From && <span className="error-text">{errors.From}</span>}
</div>

<div className="form-group">
  <label>To</label>
  <input 
    type="text" 
    name="To"  // Changed from "to" to "To"
    value={formData.To}
    placeholder="Enter to location" 
    onChange={handleChange} 
    className={`form-control ${errors.To ? 'error' : ''}`}
    required
  />
  {errors.To && <span className="error-text">{errors.To}</span>}
</div>
              
              <div className="form-group">
                <label>Pass Type</label>
                <select 
                  name="passType" 
                  value={formData.passType}
                  onChange={handleChange} 
                  className={`form-control ${errors.passType ? 'error' : ''}`}
                  required
                >
                  <option value="">Select Pass Type</option>
                  <option value="Student">Student</option>
                  <option value="General">General</option>
                  <option value="Senior Citizen">Senior Citizen</option>
                  <option value="Physically Challenged">Physically Challenged</option>
                </select>
                {errors.passType && <span className="error-text">{errors.passType}</span>}
              </div>
              
              <div className="form-group">
                <label>Service Type</label>
                <select 
                  name="serviceType" 
                  value={formData.serviceType}
                  onChange={handleChange} 
                  className={`form-control ${errors.serviceType ? 'error' : ''}`}
                  required
                >
                  <option value="">Service Type</option>
                  <option value="City">City</option>
                  <option value="Metro">Metro</option>
                  <option value="Express">Express</option>
                  <option value="Ordinary">Ordinary</option>
                </select>
                {errors.serviceType && <span className="error-text">{errors.serviceType}</span>}
              </div>
              
              <div className="form-group">
                <label>Renewal Frequency</label>
                <select 
                  name="renewalFrequency" 
                  value={formData.renewalFrequency}
                  onChange={handleChange} 
                  className={`form-control ${errors.renewalFrequency ? 'error' : ''}`}
                  required
                >
                  <option value="">Renewal Frequency</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Half-Yearly">Half-Yearly</option>
                  <option value="Yearly">Yearly</option>
                </select>
                {errors.renewalFrequency && <span className="error-text">{errors.renewalFrequency}</span>}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn"
                onClick={prevStep}
                style={{ background: '#e9ecef', color: '#495057' }}
              >
                <i className="fas fa-arrow-left"></i> Back
              </button>
              
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Processing...
                  </>
                ) : (
                  <>
                    Submit Application <i className="fas fa-check"></i>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}