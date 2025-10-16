from flask import Blueprint, request, jsonify, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
import os
from utils.database import mongo
from utils.auth_utils import make_token, token_required
import datetime
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash
from pymongo.errors import DuplicateKeyError
from flask import current_app

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    db = mongo.db
    
    # Handle form data instead of JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form.to_dict()
    else:
        data = request.get_json(silent=True) or {}
    
    # Check for required fields
    required = ("name", "email", "password", "user_type")
    missing = [k for k in required if not data.get(k)]
    if missing:
        return jsonify({"message": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        # Check if email already exists
        if db.users.find_one({"email": data["email"]}):
            return jsonify({"message": "Email already registered"}), 400

        # Handle file uploads - SINGLE FILE for study certificate
        applicant_photo = request.files.get('applicantPhoto')
        study_certificate = request.files.get('studyCertificate')  # SINGLE FILE
        
        # Create specific folders for each file type
        applicant_photo_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'applicantPhotos')
        study_certificate_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'studyCertificates')
        
        # Create folders if they don't exist
        os.makedirs(applicant_photo_folder, exist_ok=True)
        os.makedirs(study_certificate_folder, exist_ok=True)
        
        # Save files if they exist and store only filenames
        applicant_photo_filename = None
        study_certificate_filename = None  # SINGLE FILENAME
        
        if applicant_photo and allowed_file(applicant_photo.filename, {'png', 'jpg', 'jpeg'}):
            # Generate unique filename using email and timestamp
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            file_extension = os.path.splitext(applicant_photo.filename)[1]
            filename = secure_filename(f"{data['email']}_{timestamp}{file_extension}")
            applicant_photo_path = os.path.join(applicant_photo_folder, filename)
            applicant_photo.save(applicant_photo_path)
            applicant_photo_filename = filename
            print(f"Saved applicant photo: {applicant_photo_filename}")
        
        # Handle SINGLE study certificate
        if study_certificate and study_certificate.filename != '' and allowed_file(study_certificate.filename, {'png', 'jpg', 'jpeg', 'pdf'}):
            # Generate unique filename using email and timestamp
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            file_extension = os.path.splitext(study_certificate.filename)[1]
            filename = secure_filename(f"{data['email']}_cert_{timestamp}{file_extension}")
            study_certificate_path = os.path.join(study_certificate_folder, filename)
            study_certificate.save(study_certificate_path)
            study_certificate_filename = filename  # SINGLE FILENAME
            print(f"Saved study certificate: {filename}")

        # Create user document - STORE SINGLE FILENAME
        user_doc = {
            "name": data["name"],
            "email": data["email"],
            "password": generate_password_hash(data["password"]),
            "user_type": data.get("user_type", "student"),
            "created_at": datetime.datetime.utcnow(),
            "face_registered": False,
            "face_embeddings": [],
            "face_filename": None,
            
            # SSC Details
            "board_type": data.get("boardType", ""),
            "father_name": data.get("fatherName", ""),
            "gender": data.get("gender", ""),
            "dob": data.get("dob", ""),
            "applicant_photo_filename": applicant_photo_filename,
            
            # Proofs
            "aadhar_number": data.get("aadharNumber", ""),
            "mobile_no": data.get("mobileNo", ""),
            "district": data.get("district", ""),
            "mandal": data.get("mandal", ""),
            "address": data.get("address", ""),
            
            # Institution Details
            "inst_district": data.get("instDistrict", ""),
            "inst_mandal": data.get("instMandal", ""),
            "institution_name": data.get("institutionName", ""),
            "course_name": data.get("courseName", ""),
            "present_course_year": data.get("presentCourseYear", ""),
            "inst_address": data.get("instAddress", ""),
            "admission_number": data.get("admissionNumber", ""),
            "study_certificate_filename": study_certificate_filename,  # SINGLE FILENAME FIELD
            
            # Pass Category
            "From": data.get("From", ""),
            "To": data.get("To", ""),
            "pass_type": data.get("passType", ""),
            "service_type": data.get("serviceType", ""),
            "renewal_frequency": data.get("renewalFrequency", ""),
            "Pass_Status": False,  # (pending approval)
            "pass_expiry": None,    # Will be set when approved
            "pass_code": None,
        }
        
        # Insert user into database
        ins = db.users.insert_one(user_doc)
        return jsonify({
            "message": "User registered successfully", 
            "user_id": str(ins.inserted_id)
        }), 201
        
    except DuplicateKeyError:
        return jsonify({"message": "Email already exists"}), 400
    except Exception as e:
        print("Register error:", e)
        # Clean up uploaded files if registration failed
        if applicant_photo_filename:
            applicant_photo_path = os.path.join(applicant_photo_folder, applicant_photo_filename)
            if os.path.exists(applicant_photo_path):
                os.remove(applicant_photo_path)
        if study_certificate_filename:
            cert_path = os.path.join(study_certificate_folder, study_certificate_filename)
            if os.path.exists(cert_path):
                os.remove(cert_path)
        return jsonify({"message": "Registration failed"}), 500

def allowed_file(filename, allowed_extensions):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

# Add this route to serve uploaded files
@auth_bp.route('/uploads/<path:folder>/<filename>')
def serve_uploaded_file(folder, filename):
    """
    Serve uploaded files from the uploads directory
    """
    try:
        # Security check: prevent directory traversal
        if '..' in folder or '..' in filename:
            return jsonify({"error": "Invalid path"}), 400
            
        upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], folder)
        
        # Check if file exists
        file_path = os.path.join(upload_folder, filename)
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404
            
        return send_from_directory(upload_folder, filename)
    except Exception as e:
        print(f"Error serving file: {e}")
        return jsonify({"error": "Internal server error"}), 500

# In auth.py, replace the login function to store token in user document:

@auth_bp.route("/login", methods=["POST"])
def login():
    db = mongo.db
    data = request.get_json(silent=True) or {}
    if not data.get("email") or not data.get("password"):
        return jsonify({"message": "Missing credentials"}), 400

    user = db.users.find_one({"email": data["email"]})
    if not user or not check_password_hash(user["password"], data["password"]):
        return jsonify({"message": "Invalid credentials"}), 401

    # Check if user is declined
    if user.get("declined"):
        return jsonify({
            "message": "Admin approval pending. Please wait.",
            "declined": True
        }), 401

    # Generate token and store it in user document
    import uuid
    from datetime import datetime, timedelta
    
    token = str(uuid.uuid4())
    token_expiry = datetime.utcnow() + timedelta(hours=24)
    
    # Update user with token
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "token": token,
            "tokenExpiry": token_expiry,
            "lastLogin": datetime.utcnow()
        }}
    )

    # Return all necessary user data for the frontend
    return jsonify({
        "token": token,
        "user_id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "user_type": user["user_type"],
        "face_registered": user.get("face_registered", False),
        "declined": user.get("declined", False),
        # Include other fields that might be needed
        "face_filename": user.get("face_filename"),
        "board_type": user.get("board_type"),
        "father_name": user.get("father_name"),
        "gender": user.get("gender"),
        "dob": user.get("dob"),
        "aadhar_number": user.get("aadhar_number"),
        "mobile_no": user.get("mobile_no"),
        "district": user.get("district"),
        "mandal": user.get("mandal"),
        "address": user.get("address"),
        "inst_district": user.get("inst_district"),
        "inst_mandal": user.get("inst_mandal"),
        "institution_name": user.get("institution_name"),
        "course_name": user.get("course_name"),
        "present_course_year": user.get("present_course_year"),
        "inst_address": user.get("inst_address")
    })
# Also update the login_face function:
@auth_bp.route("/login_face", methods=["POST"])
def login_face():
    db = mongo.db
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"message": "user_id required"}), 400

    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"message": "User not found"}), 404

    # FIXED: Generate token and store it in user document (like email login)
    import uuid
    from datetime import datetime, timedelta
    
    token = str(uuid.uuid4())
    token_expiry = datetime.utcnow() + timedelta(hours=24)
    
    # Store token in user document (this is what your token_required expects)
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "token": token,
            "tokenExpiry": token_expiry,
            "lastLogin": datetime.utcnow()
        }}
    )

    return jsonify({
        "token": token,  # Make sure this returns the token
        "user_id": str(user["_id"]),
        "name": user["name"],
        "user_type": user["user_type"],
    })
@auth_bp.route("/user", methods=["GET"])
@token_required
def get_user(current_user):
    return jsonify({
        "user_id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "user_type": current_user["user_type"],
        "face_registered": current_user.get("face_registered", False),
    })



@auth_bp.route('/profile/<user_id>', methods=['GET'])
@token_required
def get_user_profile(current_user, user_id):
    try:
        # Verify the requesting user has access to this profile
        if str(current_user["_id"]) != user_id:
            return jsonify({
                "success": False,
                "message": "Access denied"
            }), 403

        # Fetch user from database
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        # Convert ObjectId to string and remove sensitive data
        user_data = dict(user)
        user_data['_id'] = str(user_data['_id'])
        if 'password' in user_data:
            del user_data['password']

        # 🔹 Convert filenames into public URLs for frontend
        if user_data.get("face_filename"):
            user_data["face_url"] = f"http://localhost:5000/faces/{user_data['face_filename']}"

        if user_data.get("applicant_photo_filename"):
            user_data["applicant_photo_url"] = f"http://localhost:5000/uploads/applicantPhotos/{user_data['applicant_photo_filename']}"

        # UPDATE: Handle single study certificate file
        if user_data.get("study_certificate_filename"):
            user_data["study_certificate_url"] = f"http://localhost:5000/uploads/studyCertificates/{user_data['study_certificate_filename']}"

        return jsonify({
            "success": True,
            "user": user_data
        })

    except Exception as e:
        print(f"Error in get_user_profile: {str(e)}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500