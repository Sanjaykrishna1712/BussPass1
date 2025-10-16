import secrets
import string
from flask import Flask, make_response, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import uuid
import re
from datetime import datetime, timedelta,date  # FIXED: Import from datetime module
from bson import ObjectId
from config import DevelopmentConfig
from utils.database import init_db, mongo
from routes.auth import auth_bp, token_required
from routes.face_auth import face_auth_bp
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
from werkzeug.security import generate_password_hash
from bson import ObjectId
from functools import wraps
from flask_mail import Mail, Message
from flask import current_app

app = Flask(__name__)

# Load config
app.config.from_object(DevelopmentConfig)

# Debug output
print(f"MONGO_URI: {app.config.get('MONGO_URI')}")
print(f"JWT_SECRET_KEY: {app.config.get('JWT_SECRET_KEY')}")
print(f"CORS allowing origins: {os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000')}")

# CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
CORS(
    app,
    origins=allowed_origins,
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)

# DB
init_db(app)

# Blueprints
app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(face_auth_bp, url_prefix="/api/face_auth")

scheduler = BackgroundScheduler()
# Email configuration
# Remove the duplicate email configuration and replace with this:
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')

# Initialize Flask-Mail
mail = Mail(app)
# FIXED: Improved token_required decorator
# Enhanced token_required decorator with debugging
# In your token_required decorator, add token refresh logic
# In your token_required decorator, ensure consistent token handling
def generate_password(length=12):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for i in range(length))
password = generate_password()
hashed_password = generate_password_hash(password)
# Add this function to clean up expired tokens on startup
def cleanup_expired_tokens():
    """Remove expired tokens from database"""
    try:
        now = datetime.utcnow()
        
        # Clean users collection
        mongo.db.users.update_many(
            {"tokenExpiry": {"$lt": now}},
            {"$unset": {"token": "", "tokenExpiry": ""}}
        )
        
        # Clean conductors collection
        mongo.db.conductors.update_many(
            {"tokenExpiry": {"$lt": now}},
            {"$unset": {"token": "", "tokenExpiry": ""}}
        )
        
        print("Expired tokens cleaned up")
    except Exception as e:
        print(f"Error cleaning up expired tokens: {e}")

# Then call it
# cleanup_expired_tokens()  # REMOVE THIS LINE - it's being called later in the app context
# Add this before_request handler:

def check_email_config():
    """Check if email configuration is valid"""
    required_vars = ['MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_DEFAULT_SENDER']
    missing_vars = []
    
    for var in required_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"⚠️  Warning: Missing email environment variables: {', '.join(missing_vars)}")
        print("⚠️  Email functionality will be disabled")
        return False
    
    print("✅ Email configuration is complete")
    return True

# Call this function during startup
with app.app_context():
    check_email_config()
    cleanup_expired_tokens()
def validate_date_format(date_string):
    """Validate that a date string is in expected format"""
    if not date_string:
        return False
    
    try:
        # Try common date formats
        formats = ['%Y-%m-%d', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S', '%d/%m/%Y', '%m/%d/%Y']
        
        for fmt in formats:
            try:
                datetime.strptime(date_string, fmt)
                return True
            except ValueError:
                continue
        
        return False
    except:
        return False
def format_verification_response(verification):
    """Format verification data for API response"""
    if not verification:
        return None
    
    verification_data = {
        '_id': str(verification['_id']),
        'conductor_id': str(verification.get('conductor_id', '')),
        'busId': str(verification.get('busId', '')),
        'busNumber': verification.get('busNumber', ''),  # Ensure this is included
        'date': verification.get('date', ''),
        'timestamp': format_date(verification.get('timestamp')),
        'status': verification.get('status', ''),
        'message': verification.get('message', ''),
        'userName': verification.get('userName', ''),
        'userPhoto': verification.get('userPhoto', ''),
        'passId': verification.get('passId', ''),
        'passType': verification.get('passType', ''),
        'validity': format_date(verification.get('validity')),
        'fare': verification.get('fare', 0)
    }
    
    # Add user ID if available
    if 'userId' in verification:
        verification_data['userId'] = str(verification['userId'])
    
    return verification_data
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            # Check both collections
            current_user = mongo.db.users.find_one({"token": token})
            if not current_user:
                current_user = mongo.db.conductors.find_one({"token": token})
            
            if not current_user:
                return jsonify({'message': 'Token is invalid!'}), 401
                
            # Check if token is expired
            if (current_user.get("tokenExpiry") and 
                current_user["tokenExpiry"] < datetime.utcnow()):
                return jsonify({'message': 'Token has expired!'}), 401
            
            # Convert ObjectId to string for consistency
            current_user['_id'] = str(current_user['_id'])
            
        except Exception as e:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated
# Add this function to clean up expired tokens on startup
# Move this function to be before the call to it

# Then call it
cleanup_expired_tokens()
# Add this to your app.py to clean up expired tokens on startup
@app.route('/api/debug/token-storage', methods=['GET'])
def debug_token_storage():
    """Debug endpoint to check where tokens are stored"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    if not token:
        return jsonify({'error': 'No token provided'}), 400
    
    # Check users collection
    user_with_token = mongo.db.users.find_one({"token": token})
    conductor_with_token = mongo.db.conductors.find_one({"token": token})
    
    # Get all tokens in system for debugging
    all_user_tokens = list(mongo.db.users.find({"token": {"$exists": True}}, {"token": 1, "email": 1, "_id": 1}))
    all_conductor_tokens = list(mongo.db.conductors.find({"token": {"$exists": True}}, {"token": 1, "conductorId": 1, "_id": 1}))
    
    # Convert ObjectId to string
    for item in all_user_tokens:
        item['_id'] = str(item['_id'])
    for item in all_conductor_tokens:
        item['_id'] = str(item['_id'])
    
    return jsonify({
        'provided_token': f"{token[:10]}...{token[-10:]}" if token else None,
        'token_length': len(token) if token else 0,
        'found_in_users': user_with_token is not None,
        'found_in_conductors': conductor_with_token is not None,
        'all_user_tokens': all_user_tokens,
        'all_conductor_tokens': all_conductor_tokens
    })
def parse_date(date_value):
    """Parse various date formats into datetime object"""
    if not date_value:
        return None
    
    if isinstance(date_value, datetime):
        return date_value
    
    if isinstance(date_value, date):
        return datetime.combine(date_value, datetime.min.time())
    
    # Handle string dates
    if isinstance(date_value, str):
        # Try common date formats
        formats = [
            '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', 
            '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S',
            '%d-%m-%Y', '%m-%d-%Y', '%Y%m%d', '%d%m%Y', '%m%d%Y'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_value, fmt)
            except ValueError:
                continue
    
    # If all parsing attempts fail, return None
    return None

def format_date(date_field):
    """Safely format date field, handling invalid dates gracefully"""
    if not date_field:
        return ''
    
    # Parse the date first
    parsed_date = parse_date(date_field)
    if parsed_date:
        return parsed_date.strftime('%Y-%m-%d')
    
    # If it's already a string that looks like a date, return as-is
    if isinstance(date_field, str):
        # Check if it's already in YYYY-MM-DD format
        if re.match(r'^\d{4}-\d{2}-\d{2}$', date_field):
            return date_field
    
    # Handle ObjectId (convert to string)
    if isinstance(date_field, ObjectId):
        return str(date_field)
    
    # Return empty string for invalid dates
    return ''
# Add this utility function to standardize date handling
# def parse_date(date_value):
#     """Parse various date formats into datetime object"""
#     if not date_value:
#         return None
    
#     if isinstance(date_value, datetime):
#         return date_value
    
#     if isinstance(date_value, date):
#         return datetime.combine(date_value, datetime.min.time())
    
#     # Convert to string if it's not already
#     date_str = str(date_value)
    
#     # Try parsing string formats
#     formats = [
#         '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', 
#         '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S',
#         '%d-%m-%Y', '%m-%d-%Y', '%Y%m%d', '%d%m%Y', '%m%d%Y'
#     ]
    
#     for fmt in formats:
#         try:
#             return datetime.strptime(date_str, fmt)
#         except ValueError:
#             continue
    
#     # If all parsing attempts fail, return None
#     return None

# # Use this in your date formatting function
# def format_date(date_field):
#     """Safely format date field, handling invalid dates gracefully"""
#     if not date_field:
#         return ''
    
#     # If it's already a string that looks like a date, return as-is
#     if isinstance(date_field, str):
#         # Check if it's already in YYYY-MM-DD format
#         if re.match(r'^\d{4}-\d{2}-\d{2}$', date_field):
#             return date_field
#         # Try to parse other formats
#         try:
#             dt = parse_date(date_field)
#             return dt.strftime('%Y-%m-%d') if dt else ''
#         except:
#             return ''
    
#     # Handle datetime objects
#     if isinstance(date_field, datetime):
#         return date_field.strftime('%Y-%m-%d')
    
#     # Handle date objects
#     if isinstance(date_field, date):
#         return date_field.strftime('%Y-%m-%d')
    
#     # Handle ObjectId (convert to string)
#     if isinstance(date_field, ObjectId):
#         return str(date_field)
    
#     # Handle other types (return empty string instead of "Invalid Date")
#     try:
#         # Try to convert to datetime first
#         dt = parse_date(str(date_field))
#         return dt.strftime('%Y-%m-%d') if dt else ''
#     except:
#         return ''
def check_expired_passes():
    """Check and expire passes daily"""
    with app.app_context():
        try:
            now = datetime.utcnow()  # FIXED: Use datetime.utcnow() instead of datetime.datetime.utcnow()
            expired_users = mongo.db.users.find({
                "Pass_Status": True,
                "pass_expiry": {"$lt": now}
            })
            
            for user in expired_users:
                mongo.db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"Pass_Status": False}}
                )
                print(f"Pass expired for user: {user['email']}")
                
            print(f"Checked expired passes at {now}")
        except Exception as e:
            print(f"Error checking expired passes: {e}")

scheduler.add_job(func=check_expired_passes, trigger="interval", days=1)
scheduler.start()

# Shut down the scheduler when exiting the app
atexit.register(lambda: scheduler.shutdown())
def send_approval_email(recipient, student_name, pass_code, expiry_date, password=None):
    """Send approval email with error handling"""
    try:
        # Create email HTML content
        email_html = f"""
        <h3>Application Approved</h3>
        <p>Dear {student_name},</p>
        <p>Your Smart Bus Pass application has been approved!</p>
        <p><strong>Pass Code:</strong> {pass_code}</p>
        <p><strong>Expiry Date:</strong> {expiry_date.strftime('%Y-%m-%d')}</p>
        """
        
        # Add password section if provided
        if password:
            email_html += f"""<p><strong>Login Password:</strong> {password}</p>
            <p>Please change your password after first login for security.</p>"""
        else:
            email_html += "<p>Please use your existing password to login.</p>"
        
        # Complete the email
        email_html += """
        <p>Please use this code to claim your bus pass.</p>
        <br>
        <p>Best regards,<br>Smart Bus Pass Team</p>
        """
        
        msg = Message(
            subject="Smart Bus Pass Application Approved",
            recipients=[recipient],
            html=email_html
        )
        
        mail.send(msg)
        print(f"✅ Email sent successfully to {recipient}")
        return True
        
    except Exception as e:
        print(f"❌ Error sending email to {recipient}: {str(e)}")
        # Fallback to simple SMTP if Flask-Mail fails
        return send_email_simple(recipient, student_name, pass_code, expiry_date, password)

def send_email_simple(to_email, student_name, pass_code, expiry_date, password=None):
    """Simple email sending using SMTP directly"""
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        msg = MIMEMultipart()
        msg['From'] = os.environ.get('MAIL_DEFAULT_SENDER')
        msg['To'] = to_email
        msg['Subject'] = "Smart Bus Pass Application Approved"
        
        # Build email body with optional password
        body = f"""
Dear {student_name},

Your Smart Bus Pass application has been approved!

Pass Code: {pass_code}
Expiry Date: {expiry_date.strftime('%Y-%m-%d')}
"""
        
        # Add password information if provided
        if password:
            body += f"""
Login Password: {password}

Please change your password after first login for security.
"""
        else:
            body += "\nPlease use your existing password to login.\n"
        
        # Complete the email body
        body += """
Please use this code to claim your bus pass.

Best regards,
Smart Bus Pass Team
"""
        
        msg.attach(MIMEText(body, 'plain'))
        
        # SMTP configuration
        mail_server = os.environ.get('MAIL_SERVER')
        mail_port = int(os.environ.get('MAIL_PORT', 587))
        mail_username = os.environ.get('MAIL_USERNAME')
        mail_password = os.environ.get('MAIL_PASSWORD')
        
        server = smtplib.SMTP(mail_server, mail_port)
        server.starttls()
        server.login(mail_username, mail_password)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Fallback email sent to {to_email}")
        if password:
            print(f"✅ Password included in email: {password}")
        return True
        
    except Exception as e:
        print(f"❌ SMTP email also failed: {str(e)}")
        return False
# Email sending endpoint
@app.route('/api/admin/send-email', methods=['POST'])
def send_email():
    try:
        data = request.get_json()
        to = data.get('to')
        subject = data.get('subject')
        text = data.get('text')
        email_type = data.get('email_type', 'notification')
        
        if not all([to, subject, text]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        # Create and send the email
        msg = Message(
            subject=subject,
            recipients=[to],
            body=text
        )
        
        mail.send(msg)
        
        return jsonify({'success': True, 'message': 'Email sent successfully'})
    
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to send email'}), 500

@app.route("/")
def health():
    return {
        "status": "ok",
        "env": app.config.get("ENV", "production"),
        "db": app.config.get("MONGO_DB_NAME"),
    }

# Add OPTIONS handler
@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", request.headers.get("Origin", ""))
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response
# Add specific CORS for conductor routes
@app.after_request
def after_request(response):
    origin = request.headers.get("Origin")
    if origin and origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = allowed_origins[0]  # Or '', or don't set if not matching

    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers["Access-Control-Allow-Credentials"] = "true"

    return response

# Add OPTIONS handler for conductor login

# In your app.py, add this route
@app.route("/debug/routes")
def list_routes():
    import urllib
    output = []
    for rule in app.url_map.iter_rules():
        methods = ','.join(rule.methods)
        line = urllib.parse.unquote(f"{rule.endpoint:50} {methods:20} {rule}")
        output.append(line)
    
    return jsonify({"routes": sorted(output)})

# Static admin credentials
ADMIN_CREDENTIALS = {
    "email": "admin@gmail.com",
    "password": "admin"
}

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if email == ADMIN_CREDENTIALS['email'] and password == ADMIN_CREDENTIALS['password']:
        return jsonify({"success": True, "message": "Login successful"})
    else:
        return jsonify({"success": False, "message": "Invalid credentials"}), 401
@app.route('/api/auth/verify-token', methods=['GET'])
def verify_token():
    """Verify if the current token is valid"""
    try:
        token = None
        
        # Check for token in Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'valid': False, 'message': 'Token is missing!'}), 401
        
        # Check both users and conductors collections
        user = mongo.db.users.find_one({"token": token})
        conductor = mongo.db.conductors.find_one({"token": token})
        
        current_user = user or conductor
        
        if not current_user:
            return jsonify({'valid': False, 'message': 'Token is invalid!'}), 401
        
        # Check if token is expired
        if (current_user.get("tokenExpiry") and 
            current_user["tokenExpiry"] < datetime.utcnow()):
            return jsonify({'valid': False, 'message': 'Token has expired!'}), 401
        
        return jsonify({
            'valid': True,
            'user_type': 'user' if user else 'conductor',
            'user_id': str(current_user['_id'])
        })
        
    except Exception as e:
        print(f"Token verification error: {str(e)}")
        return jsonify({'valid': False, 'message': 'Token verification failed'}), 500
@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        users = list(mongo.db.users.find({}, {'password': 0}))  # Exclude password field
        # Convert ObjectId to string for JSON serialization
        for user in users:
            user['_id'] = str(user['_id'])
        return jsonify(users)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/certificate-requests', methods=['GET'])
def get_certificate_requests():
    try:
        # Get all bus pass applications (these are our certificate requests)
        requests = list(mongo.db.bus_passes.find({}))
        
        # Convert ObjectId to string for JSON serialization
        for req in requests:
            req['_id'] = str(req['_id'])
            req['user_id'] = str(req['user_id'])
            
        return jsonify(requests)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/approve-request/<request_id>', methods=['POST'])
def approve_request(request_id):
    try:
        data = request.get_json()
        from_location = data.get('from', 'Unknown')
        to_location = data.get('to', 'Unknown')
        
        # Generate pass code if not already present
        existing_pass = mongo.db.bus_passes.find_one({'_id': ObjectId(request_id)})
        pass_code = existing_pass.get('pass_code') or str(uuid.uuid4())[:8].upper()
        
        result = mongo.db.bus_passes.update_one(
            {'_id': ObjectId(request_id)},
            {'$set': {
                'status': 'approved',
                'From': from_location,
                'To': to_location,
                'pass_code': pass_code,
                'updated_at': datetime.utcnow()
            }}
        )
        
        if result.modified_count > 0:
            return jsonify({
                "success": True,
                "message": "Pass approved successfully",
                "pass_code": pass_code,
                "from": from_location,
                "to": to_location
            })
        else:
            return jsonify({
                "success": False,
                "message": "Document found but not modified",
                "matched_count": result.matched_count
            }), 500
            
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/decline-request/<request_id>', methods=['POST'])
def decline_request(request_id):
    try:
        # Update the bus pass status to declined
        result = mongo.db.bus_passes.update_one(
            {'_id': ObjectId(request_id)},
            {'$set': {'status': 'declined'}}
        )
        
        if result.modified_count > 0:
            return jsonify({"success": True})
        else:
            return jsonify({"success": False, "message": "Request not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# Serve applicant photos
@app.route('/uploads/applicantPhotos/<filename>')
def serve_applicant_photo(filename):
    # Use the UPLOAD_FOLDER from config instead of hardcoding path
    folder = os.path.join(app.config['UPLOAD_FOLDER'], 'applicantPhotos')
    return send_from_directory(folder, filename)

# Serve study certificates
@app.route('/uploads/studyCertificates/<filename>')
def serve_study_certificate(filename):
    # Use the UPLOAD_FOLDER from config instead of hardcoding path
    folder = os.path.join(app.config['UPLOAD_FOLDER'], 'studyCertificates')
    return send_from_directory(folder, filename)

@app.route('/api/admin/pending-applications', methods=['GET'])
def get_pending_applications():
    try:
        # Get users with Pass_Status = False (pending approval)
        pending_users = list(mongo.db.users.find(
            {"Pass_Status": False}, 
            {'password': 0}  # Exclude password
        ))
        
        for user in pending_users:
            user['_id'] = str(user['_id'])
            
        return jsonify(pending_users)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/admin/approve-application/<user_id>', methods=['POST'])
def approve_application(user_id):
    try:
        data = request.get_json(silent=True) or {}
        
        # Generate pass details
        pass_code = str(uuid.uuid4())[:8].upper()
        
        # Calculate expiry date (e.g., 1 year from now)
        expiry_date = datetime.utcnow() + timedelta(days=365)
        
        # Prepare update data
        update_data = {
            'Pass_Status': True,
            'pass_code': pass_code,
            'pass_expiry': expiry_date,
            'approval_date': datetime.utcnow(),
            'declined': False,
            'rejection_reason': ''
        }
        
        # Handle password if provided in request
        if data.get('password'):
            from werkzeug.security import generate_password_hash
            update_data['password'] = generate_password_hash(data['password'])
        
        # Update user with approval details
        result = mongo.db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': update_data}
        )
        
        if result.modified_count > 0:
            # Create a bus pass record
            bus_pass_doc = {
                'user_id': ObjectId(user_id),
                'pass_code': pass_code,
                'issue_date': datetime.utcnow(),
                'expiry_date': expiry_date,
                'status': 'active',
                'created_at': datetime.utcnow()
            }
            
            mongo.db.bus_passes.insert_one(bus_pass_doc)
            
            # Get user details for email
            user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
            
            email_sent = False
            if user and user.get('email'):
                # Try to send approval email (but don't fail if email fails)
                email_sent = send_approval_email(
                    user['email'],
                    user.get('name', 'User'),
                    pass_code,
                    expiry_date,
                    data.get('password')  # Include password in email if set
                )
            
            return jsonify({
                'success': True, 
                'pass_code': pass_code,
                'email_sent': email_sent,
                'message': 'Application approved successfully'
            })
        else:
            return jsonify({'success': False, 'message': 'User not found or no changes made'}), 404
    
    except Exception as e:
        print(f"Error approving application: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to approve application'}), 500
@app.route('/api/admin/decline-application/<user_id>', methods=['POST'])
def decline_application(user_id):
    try:
        # Get reason from JSON data if provided, otherwise use empty string
        reason = ''
        if request.is_json:
            data = request.get_json()
            reason = data.get('reason', '')
        
        result = mongo.db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {
                'Pass_Status': False,
                'declined': True,
                'rejection_reason': reason
            }}
        )
        
        if result.modified_count > 0:
            # Get user details for email
            user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
            
            if user and user.get('email'):
                # Send rejection email
                msg = Message(
                    subject='Bus Pass Application Status Update',
                    recipients=[user['email']],
                    body=f"Dear {user.get('name', 'User')},\n\nWe regret to inform you that your bus pass application has been declined.\n\nReason: {reason}\n\nIf you believe this is a mistake, please contact our support team.\n\nThank you."
                )
                
                mail.send(msg)
            
            return jsonify({"success": True, "message": "Application declined and email sent"})
        else:
            return jsonify({"success": False, "message": "User not found"}), 404
            
    except Exception as e:
        print(f"Error declining application: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
@app.route('/api/admin/all-applications', methods=['GET'])
def get_all_applications():
    try:
        # Get all users regardless of status
        all_users = list(mongo.db.users.find(
            {}, 
            {'password': 0}  # Exclude password
        ))
        
        for user in all_users:
            user['_id'] = str(user['_id'])
            
        return jsonify(all_users)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
# FIXED: Add proper token_required decorator to pass-info route
@app.route('/api/user/pass-info', methods=['GET'])
@token_required
def get_user_pass_info(current_user):
    try:
        # Use the current_user from token instead of URL parameter
        user_id = current_user["_id"]
        
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # REMOVE THIS LOCAL FUNCTION - use the global format_date instead
        # def format_date(date_field):
        #     if not date_field:
        #         return ''
        #     # ... remove this entire local function

        # Determine application status
        application_status = "pending"
        if user.get('Pass_Status') == True:
            application_status = "approved"
        elif user.get('declined') == True:
            application_status = "rejected"

        # Convert ObjectId to string and remove sensitive data
        user_data = {
            '_id': str(user['_id']),
            'name': user.get('name', ''),
            'email': user.get('email', ''),
            'user_type': user.get('user_type', ''),
            'gender': user.get('gender', ''),
            'dob': format_date(user.get('dob')),  # Use global format_date
            'From': user.get('From', ''),
            'To': user.get('To', ''),
            'pass_type': user.get('pass_type', ''),
            'Pass_Status': user.get('Pass_Status', False),
            'pass_expiry': format_date(user.get('pass_expiry')),  # Use global format_date
            'pass_code': user.get('pass_code', ''),
            'applicant_photo_filename': user.get('applicant_photo_filename', ''),
            'created_at': format_date(user.get('created_at')),  # Use global format_date
            'application_status': application_status,
            'rejection_reason': user.get('rejection_reason', ''),
            'declined': user.get('declined', False)
        }

        return jsonify({"success": True, "user": user_data})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
# FIXED: Add token_required decorator to trip-history route
@app.route('/api/user/trip-history', methods=['GET'])
@token_required  # ADD THIS DECORATOR
def get_user_trip_history(current_user):
    try:
        # Use current_user from token instead of URL parameter
        user_id = current_user["_id"]
        
        # This would come from your trips collection
        # For now, return mock data specific to this user
        trip_history = [
            {"date": "2024-01-15", "from": "City Center", "to": "University", "fare": "₹15"},
            {"date": "2024-01-14", "from": "University", "to": "City Center", "fare": "₹15"},
            {"date": "2024-01-13", "from": "City Center", "to": "Shopping Mall", "fare": "₹20"}
        ]
        
        return jsonify({"success": True, "trips": trip_history, "total_trips": len(trip_history)})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
@app.route('/api/users/<user_id>', methods=['GET'])
def get_user_details(user_id):
    try:
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)}, {'password': 0})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        user['_id'] = str(user['_id'])
        return jsonify({"success": True, "user": user})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/users/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        # First check if user exists
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        # Delete user
        result = mongo.db.users.delete_one({'_id': ObjectId(user_id)})
        
        if result.deleted_count > 0:
            # Also delete any associated bus passes
            mongo.db.bus_passes.delete_many({'user_id': ObjectId(user_id)})
            
            return jsonify({"success": True, "message": "User deleted successfully"})
        else:
            return jsonify({"success": False, "message": "Failed to delete user"}), 500
            
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/admin/depots/<depot_id>/buses', methods=['GET', 'POST'])
def manage_depot_buses(depot_id):
    if request.method == 'GET':
        try:
            # Convert depot_id string to ObjectId
            depot_object_id = ObjectId(depot_id)
            
            # Find buses with matching depot ObjectId
            buses = list(mongo.db.buses.find({"depot": depot_object_id}))
            
            for bus in buses:
                bus['_id'] = str(bus['_id'])
                # Convert conductor ObjectId to string if it exists
                if 'conductor' in bus and bus['conductor']:
                    bus['conductor'] = str(bus['conductor'])
                # Convert depot ObjectId to string
                if 'depot' in bus and bus['depot']:
                    bus['depot'] = str(bus['depot'])
            
            return jsonify({"success": True, "buses": buses})
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            bus_number = data.get('busNumber')
            route = data.get('route', '')
            conductor_id = data.get('conductorId', '')
            
            if not bus_number:
                return jsonify({"success": False, "message": "Bus number is required"}), 400
            
            # Check if bus already exists in this depot
            existing_bus = mongo.db.buses.find_one({
                "depot": ObjectId(depot_id),
                "busNumber": bus_number
            })
            if existing_bus:
                return jsonify({"success": False, "message": "Bus number already exists in this depot"}), 400
            
            # Create new bus with depot as ObjectId
            bus_id = mongo.db.buses.insert_one({
                "depot": ObjectId(depot_id),  # Store as ObjectId
                "busNumber": bus_number,
                "route": route,
                "conductor": ObjectId(conductor_id) if conductor_id else None,
                "created_at": datetime.utcnow()
            }).inserted_id
            
            return jsonify({
                "success": True, 
                "message": "Bus added successfully",
                "bus_id": str(bus_id)
            })
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/admin/depots/<depot_id>/buses/<bus_id>', methods=['DELETE'])
def delete_bus(depot_id, bus_id):
    try:
        result = mongo.db.buses.delete_one({
            "_id": ObjectId(bus_id),
            "depot": ObjectId(depot_id)  # Match depot as ObjectId
        })
        
        if result.deleted_count > 0:
            return jsonify({"success": True, "message": "Bus deleted successfully"})
        else:
            return jsonify({"success": False, "message": "Bus not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
@app.route('/api/conductor/me', methods=['GET'])
def get_conductor_profile():
    try:
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return jsonify({"success": False, "message": "Token required"}), 401
        
        token = token.split(' ')[1]
        
        # Find conductor by token
        conductor = mongo.db.conductors.find_one({"token": token})
        if not conductor:
            return jsonify({"success": False, "message": "Invalid token"}), 401
        
        # Check token expiration if you implemented it
        if 'tokenExpiry' in conductor and conductor['tokenExpiry'] < datetime.utcnow():
            return jsonify({"success": False, "message": "Token expired"}), 401
        
        return jsonify({
            "success": True,
            "conductor": {
                "_id": str(conductor["_id"]),
                "name": conductor.get("name", ""),
                "conductorId": conductor["conductorId"],
                "depot": str(conductor.get("depot", ""))
            }
        })
        
    except Exception as e:
        print(f"Profile error: {str(e)}")
        return jsonify({"success": False, "message": "Internal server error"}), 500
# Conductor routes
# Add this endpoint to your Flask backend
@app.route('/api/auth/conductor/verify', methods=['GET'])
@token_required
def verify_conductor_token(current_user):
    try:
        return jsonify({
            "success": True,
            "conductor": {
                "_id": str(current_user["_id"]),
                "conductorId": current_user["conductorId"],
                "name": current_user["name"],
                "depot": current_user["depot"]
            }
        })
    except Exception as e:
        print(f"Token verification error: {str(e)}")
        return jsonify({"success": False, "message": "Token verification failed"}), 401
# In your Flask backend
@app.route('/auth/conductor/refresh', methods=['POST'])
def refresh_conductor_token():
    try:
        # Get the current token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"success": False, "message": "Authorization header required"}), 401
        
        current_token = auth_header.split(' ')[1]
        
        # Find conductor by current token
        conductor = mongo.db.conductors.find_one({"token": current_token})
        
        if not conductor:
            return jsonify({"success": False, "message": "Invalid token"}), 401
        
        # Check if token is expired (optional)
        if conductor.get("tokenExpiry") and conductor["tokenExpiry"] < datetime.utcnow():
            return jsonify({"success": False, "message": "Token expired"}), 401
        
        # Create new token
        new_token = str(uuid.uuid4())
        token_expiry = datetime.utcnow() + timedelta(hours=24)
        
        # Update conductor with new token
        mongo.db.conductors.update_one(
            {"_id": conductor["_id"]},
            {"$set": {
                "token": new_token,
                "tokenExpiry": token_expiry
            }}
        )
        
        return jsonify({
            "success": True,
            "token": new_token,
            "message": "Token refreshed successfully"
        })
        
    except Exception as e:
        print(f"Token refresh error: {str(e)}")
        return jsonify({"success": False, "message": "Internal server error"}), 500
@app.route('/api/conductor/stats', methods=['GET'])
def get_conductor_stats():
    try:
        # Verify token
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return jsonify({"success": False, "message": "Token required"}), 401
        
        token = token.replace('Bearer ', '')
        
        conductor = mongo.db.conductors.find_one({
            "token": token,
            "tokenExpiry": {"$gt": datetime.utcnow()}
        })
        
        if not conductor:
            return jsonify({"success": False, "message": "Invalid or expired token"}), 401
        
        # Get date parameter
        date_str = request.args.get('date')
        target_date = datetime.utcnow()
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d')
            except ValueError:
                return jsonify({"success": False, "message": "Invalid date format"}), 400
        
        # Calculate stats (example implementation)
        # You'll need to implement your actual stats logic here
        stats = {
            "totalPassengers": 0,
            "totalRevenue": 0,
            "totalTrips": 0,
            "date": target_date.strftime('%Y-%m-%d')
        }
        
        return jsonify({
            "success": True,
            "stats": stats
        })
        
    except Exception as e:
        print(f"Stats error: {str(e)}")
        return jsonify({"success": False, "message": "Internal server error"}), 500
@app.route('/api/auth/conductor/login', methods=['POST'])
def conductor_login():
    try:
        data = request.get_json()
        conductor_id = data.get('conductorId')
        password = data.get('password')
        
        print(f"🔐 LOGIN ATTEMPT: conductorId={conductor_id}, password={password}")
        
        if not conductor_id or not password:
            print("❌ Missing conductorId or password")
            return jsonify({"success": False, "message": "Conductor ID and password required"}), 400
        
        # Find conductor
        conductor = mongo.db.conductors.find_one({"conductorId": conductor_id})
        
        if not conductor:
            print(f"❌ Conductor not found: {conductor_id}")
            return jsonify({"success": False, "message": "Invalid conductor ID"}), 401
        
        print(f"✅ Found conductor: {conductor.get('name')}")
        
        # Check if password field exists
        if 'password' not in conductor:
            print("❌ No password field in conductor document")
            return jsonify({"success": False, "message": "Password not set for this conductor"}), 401
        
        stored_password = conductor["password"]
        print(f"🔑 Stored password: '{stored_password}'")
        print(f"🔑 Input password: '{password}'")
        
        # Check password - handle hashed passwords
        if stored_password.startswith('scrypt:'):
            # Password is hashed, need to verify using the same method
            try:
                from werkzeug.security import check_password_hash
                password_match = check_password_hash(stored_password, password)
                print(f"🔑 Password match (hashed): {password_match}")
                
                if not password_match:
                    print("❌ Password mismatch (hashed)")
                    return jsonify({"success": False, "message": "Invalid password"}), 401
                    
            except ImportError:
                print("❌ Werkzeug not available for password checking")
                return jsonify({"success": False, "message": "Server configuration error"}), 500
                
        else:
            # Plain text password comparison (for development only)
            print(f"🔑 Plain text comparison: {stored_password == password}")
            if conductor["password"] != password:
                print("❌ Password mismatch (plain text)")
                return jsonify({"success": False, "message": "Invalid password"}), 401
        
        print("✅ Password verified successfully")
        
        # Generate new token
        token = str(uuid.uuid4())
        token_expiry = datetime.utcnow() + timedelta(hours=24)
        
        # Update conductor with new token
        mongo.db.conductors.update_one(
            {"_id": conductor["_id"]},
            {"$set": {
                "token": token,
                "tokenExpiry": token_expiry,
                "lastLogin": datetime.utcnow()
            }}
        )
        
        print(f"✅ Login successful, generated token: {token}")
        
        return jsonify({
            "success": True,
            "token": token,
            "conductor": {
                "_id": str(conductor["_id"]),
                "conductorId": conductor["conductorId"],
                "name": conductor["name"],
                "depot": str(conductor["depot"]) if conductor.get("depot") else ""
            },
            "message": "Login successful"
        })
        
    except Exception as e:
        print(f"🔥 Conductor login error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": "Internal server error"}), 500
@app.route('/api/debug/conductor-raw/<conductor_id>', methods=['GET'])
def debug_conductor_raw(conductor_id):
    try:
        conductor = mongo.db.conductors.find_one({"conductorId": conductor_id})
        
        if not conductor:
            return jsonify({"success": False, "message": "Conductor not found"}), 404
        
        # Return the raw conductor data
        conductor_data = dict(conductor)
        conductor_data['_id'] = str(conductor_data['_id'])
        
        # Check what type the depot field is
        depot_value = conductor.get('depot')
        depot_type = type(depot_value).__name__ if depot_value else 'None'
        conductor_data['depot_type'] = depot_type
        
        return jsonify({
            "success": True,
            "conductor": conductor_data
        })
        
    except Exception as e:
        print(f"Debug error: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
@app.route('/api/debug/conductor/<conductor_id>', methods=['GET'])
def debug_conductor(conductor_id):
    try:
        conductor = mongo.db.conductors.find_one({"conductorId": conductor_id})
        
        if not conductor:
            return jsonify({"success": False, "message": "Conductor not found"}), 404
        
        # Return all data (including password for debugging)
        conductor_data = dict(conductor)
        conductor_data['_id'] = str(conductor_data['_id'])
        if 'depot' in conductor_data and conductor_data['depot']:
            conductor_data['depot'] = str(conductor_data['depot'])
        
        return jsonify({
            "success": True,
            "conductor": conductor_data
        })
        
    except Exception as e:
        print(f"Debug error: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/debug/reset-password/<conductor_id>', methods=['POST'])
def reset_conductor_password(conductor_id):
    try:
        data = request.get_json()
        new_password = data.get('password', 'pavan')  # Default to 'pavan'
        
        conductor = mongo.db.conductors.find_one({"conductorId": conductor_id})
        
        if not conductor:
            return jsonify({"success": False, "message": "Conductor not found"}), 404
        
        # Update password
        mongo.db.conductors.update_one(
            {"_id": conductor["_id"]},
            {"$set": {
                "password": new_password
            }}
        )
        
        return jsonify({
            "success": True,
            "message": f"Password reset to '{new_password}' for conductor {conductor_id}"
        })
        
    except Exception as e:
        print(f"Password reset error: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
@app.route('/api/auth/conductor/init-password', methods=['POST'])
def init_conductor_password():
    try:
        data = request.get_json()
        conductor_id = data.get('conductorId')
        new_password = data.get('password')
        
        if not conductor_id or not new_password:
            return jsonify({"success": False, "message": "Conductor ID and password required"}), 400
        
        # Find conductor
        conductor = mongo.db.conductors.find_one({"conductorId": conductor_id})
        
        if not conductor:
            return jsonify({"success": False, "message": "Invalid conductor ID"}), 401
        
        # Update password (in production, you should hash this)
        mongo.db.conductors.update_one(
            {"_id": conductor["_id"]},
            {"$set": {
                "password": new_password  # In production, hash this password
            }}
        )
        
        return jsonify({
            "success": True,
            "message": "Password updated successfully"
        })
        
    except Exception as e:
        print(f"Password init error: {str(e)}")
        return jsonify({"success": False, "message": "Internal server error"}), 500
@app.route('/api/test/create-test-conductor', methods=['POST'])
def create_test_conductor():
    """Create a test conductor for development"""
    try:
        # First check if test conductor already exists
        existing = mongo.db.conductors.find_one({"conductorId": "test123"})
        if existing:
            mongo.db.conductors.delete_one({"_id": existing["_id"]})
        
        # Get any depot ID to use
        depot = mongo.db.depots.find_one()
        if not depot:
            # Create a test depot if none exists
            depot_id = mongo.db.depots.insert_one({
                "name": "Test Depot",
                "location": "Test Location",
                "destination": "Test Destination",
                "created_at": datetime.utcnow()
            }).inserted_id
        else:
            depot_id = depot["_id"]
        
        # Create test conductor
        test_conductor = {
            "name": "Test Conductor",
            "conductorId": "test123",
            "password": generate_password_hash("password123"),
            "depot": depot_id,
            "contact": "1234567890",
            "address": "Test Address",
            "created_at": datetime.utcnow()
        }
        
        result = mongo.db.conductors.insert_one(test_conductor)
        
        return jsonify({
            "success": True,
            "message": "Test conductor created",
            "credentials": {
                "conductorId": "test123",
                "password": "password123"
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
@app.route('/api/conductor/depot/<depot_id>/buses', methods=['GET'])
def get_depot_buses(depot_id):
    try:
        print(f"Received depot_id: {depot_id}")  # Debug log
        
        # Check if depot_id is a valid ObjectId
        if not ObjectId.is_valid(depot_id):
            return jsonify({"success": False, "message": "Invalid depot ID format"}), 400
        
        # Convert depot_id string to ObjectId
        depot_object_id = ObjectId(depot_id)
        
        # Find buses with matching depot ObjectId
        buses = list(mongo.db.buses.find({"depot": depot_object_id}))
        
        for bus in buses:
            bus['_id'] = str(bus['_id'])
            # Convert conductor ObjectId to string if it exists
            if 'conductor' in bus and bus['conductor']:
                bus['conductor'] = str(bus['conductor'])
            # Convert depot ObjectId to string
            if 'depot' in bus and bus['depot']:
                bus['depot'] = str(bus['depot'])
        
        return jsonify({"success": True, "buses": buses})
    except Exception as e:
        print(f"Error fetching depot buses: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
# Add these routes to your app.py

# Conductor management routes
@app.route('/api/admin/conductors', methods=['POST'])
def manage_conductors():
    if request.method == 'POST':
        try:
            data = request.get_json()
            
            # Validate required fields
            required_fields = ['name', 'conductorId', 'password', 'depot']
            for field in required_fields:
                if not data.get(field):
                    return jsonify({"success": False, "message": f"{field} is required"}), 400
            
            # Check if conductor ID already exists
            existing_conductor = mongo.db.conductors.find_one({"conductorId": data.get('conductorId')})
            if existing_conductor:
                return jsonify({"success": False, "message": "Conductor ID already exists"}), 400
            
            # Create new conductor
            conductor_data = {
                "name": data.get('name'),
                "conductorId": data.get('conductorId'),
                "password": generate_password_hash(data.get('password')),
                "depot": ObjectId(data.get('depot')),
                "contact": data.get('contact', ''),
                "address": data.get('address', ''),
                "created_at": datetime.utcnow()
            }
            
            conductor_id = mongo.db.conductors.insert_one(conductor_data).inserted_id
            
            return jsonify({
                "success": True, 
                "message": "Conductor created successfully",
                "conductor_id": str(conductor_id)
            })
        except Exception as e:
            print(f"Error creating conductor: {str(e)}")
            return jsonify({"success": False, "message": str(e)}), 500
@app.route('/api/admin/conductors', methods=['GET'])
def get_all_conductors():
    try:
        conductors = list(mongo.db.conductors.find({}))
        for conductor in conductors:
            conductor['_id'] = str(conductor['_id'])
            if 'depot' in conductor and conductor['depot']:
                conductor['depot'] = str(conductor['depot'])
        return jsonify({"success": True, "conductors": conductors})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# app.py - Update this route
@app.route('/auth/conductor/profile', methods=['GET'])
def conductor_profile():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({"success": False, "message": "Missing token"}), 401

        conductor = mongo.db.conductors.find_one({"token": token})
        if not conductor:
            return jsonify({"success": False, "message": "Unauthorized"}), 401

        conductor["_id"] = str(conductor["_id"])
        if 'depot' in conductor and conductor['depot']:
            conductor['depot'] = str(conductor['depot'])
        
        # Remove sensitive data
        conductor.pop('password', None)
        conductor.pop('token', None)

        return jsonify({"success": True, "user": conductor})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
@app.route("/auth/profile", methods=["GET"])
@token_required
def get_user_prof(current_user):
    try:
        # Use the current_user from the token instead of URL parameter
        user_id = current_user["_id"]
        
        # Get user data from database
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        # Prepare response data - REMOVE the local format_date function
        # def format_date(date_field): ... remove this
        
        application_status = "pending"
        if user.get('Pass_Status') == True:
            application_status = "approved"
        elif user.get('declined') == True:
            application_status = "rejected"

        user_data = {
            '_id': str(user['_id']),
            'name': user.get('name', ''),
            'email': user.get('email', ''),
            'user_type': user.get('user_type', ''),
            'gender': user.get('gender', ''),
            'dob': format_date(user.get('dob')),  # Use global function
            'From': user.get('From', ''),
            'To': user.get('To', ''),
            'pass_type': user.get('pass_type', ''),
            'Pass_Status': user.get('Pass_Status', False),
            'pass_expiry': format_date(user.get('pass_expiry')),  # Use global function
            'pass_code': user.get('pass_code', ''),
            'applicant_photo_filename': user.get('applicant_photo_filename', ''),
            'created_at': format_date(user.get('created_at')),  # Use global function
            'application_status': application_status,
            'rejection_reason': user.get('rejection_reason', ''),
            'declined': user.get('declined', False),
            # ... other fields
        }
        
        return jsonify({"success": True, "user": user_data})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
@app.route('/api/debug/check-token', methods=['GET'])
def debug_check_token():
    """Debug endpoint to check token status"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    if not token:
        return jsonify({'has_token': False, 'message': 'No token provided'})
    
    # Check both collections
    user = mongo.db.users.find_one({"token": token})
    conductor = mongo.db.conductors.find_one({"token": token})
    
    return jsonify({
        'has_token': True,
        'token_length': len(token),
        'found_in_users': user is not None,
        'found_in_conductors': conductor is not None,
        'user_id': str(user['_id']) if user else None,
        'conductor_id': str(conductor['_id']) if conductor else None
    })

@app.route('/api/debug/routes-with-auth', methods=['GET'])
def debug_routes_with_auth():
    """List all routes that require authentication"""
    routes = []
    for rule in app.url_map.iter_rules():
        if any('token_required' in str(func) for func in app.view_functions[rule.endpoint].__dict__.get('__wrapped__', {}).__dict__.values()):
            routes.append({
                'endpoint': rule.endpoint,
                'methods': list(rule.methods),
                'path': str(rule)
            })
    return jsonify({'authenticated_routes': routes})
@app.route("/auth/profile/<user_id>", methods=["GET"])
@token_required
def get_user_profile_by_id(current_user, user_id):
    try:
        print(f"Current user ID: {current_user['_id']}, Requested user ID: {user_id}")
        
        # Verify the requested profile belongs to the authenticated user
        if str(current_user["_id"]) != user_id:
            return jsonify({"success": False, "message": "Unauthorized access"}), 403
        
        # Get user data from database
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        # Determine application status
        application_status = "pending"
        if user.get('Pass_Status') == True:
            application_status = "approved"
        elif user.get('declined') == True:
            application_status = "rejected"
        
        # Prepare response data - USE THE GLOBAL format_date FUNCTION
        user_data = {
            '_id': str(user['_id']),
            'name': user.get('name', ''),
            'email': user.get('email', ''),
            'user_type': user.get('user_type', ''),
            'gender': user.get('gender', ''),
            'dob': format_date(user.get('dob')),  # Use global function
            'From': user.get('From', ''),
            'To': user.get('To', ''),
            'pass_type': user.get('pass_type', ''),
            'Pass_Status': user.get('Pass_Status', False),
            'pass_expiry': format_date(user.get('pass_expiry')),  # Use global function
            'pass_code': user.get('pass_code', ''),
            'applicant_photo_filename': user.get('applicant_photo_filename', ''),
            'applicant_photo_url': f"/uploads/applicantPhotos/{user.get('applicant_photo_filename', '')}" if user.get('applicant_photo_filename') else '',
            'created_at': format_date(user.get('created_at')),  # Use global function
            'application_status': application_status,
            'rejection_reason': user.get('rejection_reason', ''),
            'declined': user.get('declined', False),
            # Add the additional fields that your frontend expects
            'aadhar_number': user.get('aadhar_number', ''),
            'mobile_no': user.get('mobile_no', ''),
            'district': user.get('district', ''),
            'mandal': user.get('mandal', ''),
            'address': user.get('address', ''),
            'institution_name': user.get('institution_name', ''),
            'course_name': user.get('course_name', ''),
            'present_course_year': user.get('present_course_year', ''),
            'admission_number': user.get('admission_number', ''),
            'inst_address': user.get('inst_address', ''),
            'service_type': user.get('service_type', ''),
            'renewal_frequency': user.get('renewal_frequency', ''),
            'study_certificate_url': f"/uploads/studyCertificates/{user.get('study_certificate_filename', '')}" if user.get('study_certificate_filename') else ''
        }
        
        return jsonify({"success": True, "user": user_data})
    
    except Exception as e:
        print(f"Error in get_user_profile: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
@app.route('/api/face_auth/verify', methods=['POST'])
def face_auth_verify():
    try:
        # Check if image file is present
        if 'image' not in request.files:
            return jsonify({"success": False, "message": "No image provided"}), 400
        
        image_file = request.files['image']
        user_id = request.form.get('userId')
        
        if image_file.filename == '':
            return jsonify({"success": False, "message": "No image selected"}), 400
        
        # In a real implementation, you would process the face image
        # For demo: Find the user and verify
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        # Check if user has valid pass
        current_time = datetime.utcnow()
        pass_expiry = user.get('pass_expiry')
        
        is_valid = (user.get('Pass_Status') and 
                   pass_expiry and 
                   (isinstance(pass_expiry, datetime) and pass_expiry > current_time or 
                    isinstance(pass_expiry, str) and datetime.strptime(pass_expiry, '%Y-%m-%d') > current_time))
        
        if is_valid:
            return jsonify({
                "success": True,
                "valid": True,
                "message": "Face verification successful",
                "user": {
                    "name": user.get('name', ''),
                    "email": user.get('email', ''),
                    "passId": user.get('pass_code', '')
                }
            })
        else:
            return jsonify({
                "success": True,
                "valid": False,
                "message": "Pass is invalid or expired"
            })
            
    except Exception as e:
        print(f"Error in face auth: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
@app.route('/auth/refresh', methods=['POST'])
def refresh_token():
    try:
        # Get the current token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"success": False, "message": "Authorization header required"}), 401
        
        current_token = auth_header.split(' ')[1]
        
        # Find user by current token
        user = mongo.db.users.find_one({"token": current_token})
        if not user:
            # Try conductors collection
            user = mongo.db.conductors.find_one({"token": current_token})
        
        if not user:
            return jsonify({"success": False, "message": "Invalid token"}), 401
        
        # Check if token is expired
        if user.get("tokenExpiry") and user["tokenExpiry"] < datetime.utcnow():
            return jsonify({"success": False, "message": "Token expired"}), 401
        
        # Create new token
        new_token = str(uuid.uuid4())
        token_expiry = datetime.utcnow() + timedelta(hours=24)
        
        # Update user with new token
        collection = mongo.db.users if 'email' in user else mongo.db.conductors
        collection.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "token": new_token,
                "tokenExpiry": token_expiry
            }}
        )
        
        return jsonify({
            "success": True,
            "token": new_token,
            "message": "Token refreshed successfully"
        })
        
    except Exception as e:
        print(f"Token refresh error: {str(e)}")
        return jsonify({"success": False, "message": "Internal server error"}), 500
@app.route('/api/test/create-conductor', methods=['POST'])
def create_conductor_test():
    """Create a test conductor for development"""
    try:
        test_conductor = {
            "name": "Test Conductor",
            "conductorId": "test123",
            "password": generate_password_hash("password123"),
            "depot": ObjectId("65a1b2c3d4e5f6a7b8c9d0e1"),  # Replace with actual depot ID
            "contact": "1234567890",
            "address": "Test Address",
            "created_at": datetime.utcnow()
        }
        
        result = mongo.db.conductors.insert_one(test_conductor)
        return jsonify({
            "success": True,
            "message": "Test conductor created",
            "conductorId": "test123",
            "password": "password123"
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
@app.route('/api/debug/conductors', methods=['GET'])
def debug_conductors():
    try:
        conductors = list(mongo.db.conductors.find({}))
        result = []
        for conductor in conductors:
            result.append({
                '_id': str(conductor['_id']),
                'conductorId': conductor.get('conductorId', ''),
                'name': conductor.get('name', ''),
                'depot': str(conductor.get('depot', '')) if conductor.get('depot') else '',
                'has_password': 'password' in conductor
            })
        return jsonify({"success": True, "conductors": result})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
@app.route('/api/admin/conductors/<conductor_id>', methods=['DELETE'])
def delete_conductor(conductor_id):
    try:
        # Check if conductor exists
        conductor = mongo.db.conductors.find_one({"_id": ObjectId(conductor_id)})
        if not conductor:
            return jsonify({"success": False, "message": "Conductor not found"}), 404
        
        # Remove conductor from any assigned buses
        mongo.db.buses.update_many(
            {"conductor": ObjectId(conductor_id)},
            {"$unset": {"conductor": ""}}
        )
        
        # Delete conductor
        result = mongo.db.conductors.delete_one({"_id": ObjectId(conductor_id)})
        
        if result.deleted_count > 0:
            return jsonify({"success": True, "message": "Conductor deleted successfully"})
        else:
            return jsonify({"success": False, "message": "Failed to delete conductor"}), 500
    except Exception as e:
        print(f"Error deleting conductor: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

# Depot management routes with buses array
@app.route('/api/admin/depots', methods=['GET', 'POST'])
def manage_depots():
    if request.method == 'GET':
        try:
            depots = list(mongo.db.depots.aggregate([
                {
                    '$lookup': {
                        'from': 'buses',
                        'localField': '_id',
                        'foreignField': 'depot',
                        'as': 'buses'
                    }
                },
                {
                    '$project': {
                        '_id': 1,
                        'name': 1,
                        'location': 1,
                        'destination': 1,
                        'created_at': 1,
                        'bus_count': {'$size': '$buses'}
                    }
                }
            ]))
            
            for depot in depots:
                depot['_id'] = str(depot['_id'])
            
            return jsonify({"success": True, "depots": depots})
        except Exception as e:
            print(f"Error fetching depots: {str(e)}")
            return jsonify({"success": False, "message": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            name = data.get('name')
            location = data.get('location', '')
            destination = data.get('destination', '')
            
            if not name:
                return jsonify({"success": False, "message": "Depot name is required"}), 400
            
            # Check if depot already exists
            existing_depot = mongo.db.depots.find_one({"name": name})
            if existing_depot:
                return jsonify({"success": False, "message": "Depot already exists"}), 400
            
            # Create new depot
            depot_id = mongo.db.depots.insert_one({
                "name": name,
                "location": location,
                "destination": destination,
                "created_at": datetime.utcnow()
            }).inserted_id
            
            return jsonify({
                "success": True, 
                "message": "Depot created successfully",
                "depot_id": str(depot_id)
            })
        except Exception as e:
            print(f"Error creating depot: {str(e)}")
            return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/admin/depots/<depot_id>', methods=['DELETE'])
def delete_depot(depot_id):
    try:
        # Check if depot has buses
        buses_count = mongo.db.buses.count_documents({"depot": ObjectId(depot_id)})
        if buses_count > 0:
            return jsonify({
                "success": False, 
                "message": "Cannot delete depot with assigned buses. Please remove buses first."
            }), 400
        
        # Check if depot has conductors
        conductors_count = mongo.db.conductors.count_documents({"depot": ObjectId(depot_id)})
        if conductors_count > 0:
            return jsonify({
                "success": False, 
                "message": "Cannot delete depot with assigned conductors. Please reassign conductors first."
            }), 400
        
        result = mongo.db.conductors.delete_one({"_id": ObjectId(depot_id)})
        
        if result.deleted_count > 0:
            return jsonify({"success": True, "message": "Depot deleted successfully"})
        else:
            return jsonify({"success": False, "message": "Depot not found"}), 404
    except Exception as e:
        print(f"Error deleting depot: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

# Bus management routes
@app.route('/api/admin/buses', methods=['GET', 'POST'])
def manage_buses():
    if request.method == 'GET':
        try:
            # Simplified query to just get buses without joins
            buses = list(mongo.db.buses.find({}))
            
            # Convert ObjectId to string for JSON serialization
            for bus in buses:
                bus['_id'] = str(bus['_id'])
                # Convert any ObjectId fields to strings
                if 'depot' in bus and bus['depot']:
                    bus['depot'] = str(bus['depot'])
                if 'conductor' in bus and bus['conductor']:
                    bus['conductor'] = str(bus['conductor'])
            
            return jsonify({"success": True, "buses": buses})
        except Exception as e:
            print(f"Error fetching buses: {str(e)}")
            return jsonify({"success": False, "message": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            print(f"Received data: {data}")  # Debug log
            
            # Validate required fields - using the new field names
            if not data.get('busNumber') or not data.get('from') or not data.get('to'):
                return jsonify({
                    "success": False, 
                    "message": "Bus number, from location, and to location are required"
                }), 400
            
            # Check if bus number already exists
            existing_bus = mongo.db.buses.find_one({
                "busNumber": data.get('busNumber')
            })
            if existing_bus:
                return jsonify({
                    "success": False, 
                    "message": "Bus number already exists"
                }), 400
            
            # Create new bus with the new field structure
            bus_data = {
                "busNumber": data.get('busNumber'),
                "from": data.get('from'),
                "to": data.get('to'),
                "route": f"{data.get('from')} → {data.get('to')}",  # Add this line
                "created_at": datetime.utcnow()
            }
            # Insert the new bus
            result = mongo.db.buses.insert_one(bus_data)
            
            return jsonify({
                "success": True, 
                "message": "Bus created successfully",
                "bus_id": str(result.inserted_id)
            })
            
        except Exception as e:
            print(f"Error creating bus: {str(e)}")
            return jsonify({"success": False, "message": str(e)}), 500
@app.route('/api/conductor/buses', methods=['GET'])
def get_all_buses():
    try:
        buses = list(mongo.db.buses.find({}))
        
        # Convert ObjectId to string for JSON serialization
        for bus in buses:
            bus['_id'] = str(bus['_id'])
        
        return jsonify({"success": True, "buses": buses})
    except Exception as e:
        print(f"Error fetching buses: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
@app.route('/api/admin/buses/<bus_id>', methods=['DELETE'])
def delete_bus_direct(bus_id):
    try:
        print(f"Attempting to delete bus with ID: {bus_id}")
        
        # Check if bus exists
        bus = mongo.db.buses.find_one({"_id": ObjectId(bus_id)})
        if not bus:
            print(f"Bus not found with ID: {bus_id}")
            return jsonify({"success": False, "message": "Bus not found"}), 404
        
        print(f"Found bus: {bus}")
        
        # Delete the bus
        result = mongo.db.buses.delete_one({"_id": ObjectId(bus_id)})
        
        if result.deleted_count > 0:
            print(f"Successfully deleted bus with ID: {bus_id}")
            return jsonify({"success": True, "message": "Bus deleted successfully"})
        else:
            print(f"Failed to delete bus with ID: {bus_id}")
            return jsonify({"success": False, "message": "Failed to delete bus"}), 500
            
    except Exception as e:
        print(f"Error deleting bus: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
# Add these routes to your app.py

@app.route('/api/conductor/scan-qr', methods=['POST'])
def scan_qr_code():
    try:
        data = request.get_json()
        bus_id = data.get('busId')
        qr_data = data.get('qrData')
        
        # In a real implementation, you would decode the QR data
        # For demo purposes, we'll simulate a passenger
        passenger = {
            "id": str(ObjectId()),
            "name": "Demo Passenger",
            "phone": "9876543210",
            "fare": 25  # Fixed fare for demo
        }
        
        return jsonify({
            "success": True,
            "passenger": passenger,
            "fare": passenger["fare"]
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/conductor/process-payment', methods=['POST'])
def process_payment():
    try:
        data = request.get_json()
        bus_id = data.get('busId')
        payment_method = data.get('paymentMethod')
        amount = data.get('amount')
        passenger_id = data.get('passengerId')
        
        # Simulate payment processing
        # In a real implementation, integrate with payment gateway
        
        # Generate ticket ID
        ticket_id = f"TKT-{str(ObjectId())[:8].upper()}"
        
        return jsonify({
            "success": True,
            "ticketId": ticket_id,
            "message": "Payment processed successfully"
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/conductor/send-ticket-sms', methods=['POST'])
def send_ticket_sms():
    try:
        data = request.get_json()
        passenger_phone = data.get('passengerPhone')
        bus_number = data.get('busNumber')
        route = data.get('route')
        amount = data.get('amount')
        ticket_id = data.get('ticketId')
        
        # Simulate SMS sending
        # In a real implementation, integrate with SMS gateway
        print(f"SMS sent to {passenger_phone}: Ticket {ticket_id} for bus {bus_number} ({route}), Amount: ₹{amount}")
        
        return jsonify({
            "success": True,
            "message": "SMS sent successfully"
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# Face verification endpoint for conductors
@app.route('/face_auth/verify-conductor', methods=['POST'])
def face_verify_conductor():
    try:
        data = request.get_json()
        bus_id = data.get('busId')
        
        # In a real implementation, you would process the face image
        # For demo, we'll simulate a pass holder verification
        
        # Simulate finding a pass holder
        pass_holder = mongo.db.users.find_one({
            "Pass_Status": True,
            "pass_expiry": {"$gt": datetime.utcnow()}
        })
        
        if pass_holder:
            return jsonify({
                "success": True,
                "passenger": {
                    "name": pass_holder.get('name', 'Pass Holder'),
                    "passId": pass_holder.get('pass_code', 'N/A'),
                    "type": pass_holder.get('pass_type', 'Regular'),
                    "validity": pass_holder.get('pass_expiry', datetime.utcnow() + timedelta(days=365))
                }
            })
        else:
            return jsonify({
                "success": False,
                "message": "No active pass holder found"
            })
            
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
# Add these routes to your app.py



# Add these routes to your app.py

@app.route('/api/conductor/verify-face', methods=['POST'])
def verify_face_image():
    try:
        # Check if image file is present
        if 'image' not in request.files:
            return jsonify({"success": False, "message": "No image provided"}), 400
        
        image_file = request.files['image']
        bus_id = request.form.get('busId')
        
        if image_file.filename == '':
            return jsonify({"success": False, "message": "No image selected"}), 400
        
        # In a real implementation, you would process the face image
        # For demo: Find a user with valid pass
        valid_user = mongo.db.users.find_one({
            "Pass_Status": True,
            "pass_expiry": {"$gt": datetime.utcnow()}
        })
        
        if valid_user:
            user_data = {
                "name": valid_user.get('name', ''),
                "email": valid_user.get('email', ''),
                "passId": valid_user.get('pass_code', ''),
                "passType": valid_user.get('pass_type', ''),
                "validity": valid_user.get('pass_expiry'),
                "photo": valid_user.get('applicant_photo_filename', '')
            }
            
            # Log the verification
            mongo.db.verification_logs.insert_one({
                "user_id": valid_user['_id'],
                "bus_id": ObjectId(bus_id) if bus_id else None,
                "type": "face",
                "status": "success",
                "timestamp": datetime.utcnow()
            })
            
            return jsonify({
                "success": True,
                "valid": True,
                "user": user_data,
                "message": "Face verification successful"
            })
        else:
            # No valid user found
            mongo.db.verification_logs.insert_one({
                "bus_id": ObjectId(bus_id) if bus_id else None,
                "type": "face",
                "status": "failed",
                "reason": "No matching valid pass found",
                "timestamp": datetime.utcnow()
            })
            
            return jsonify({
                "success": True,
                "valid": False,
                "message": "No valid pass holder found"
            })
            
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
# Add these routes to your app.py

@app.route('/api/conductor/verify-pass', methods=['POST'])
def verify_pass():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        bus_id = data.get('busId')
        
        if not user_id or not bus_id:
            return jsonify({"success": False, "message": "User ID and Bus ID are required"}), 400
        
        # Find user by ID
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return jsonify({
                "success": True,
                "valid": False,
                "message": "User not found"
            })
        
        # Check if user has valid pass
        current_time = datetime.utcnow()
        pass_expiry = user.get('pass_expiry')
        
        # Parse the expiry date to ensure it's a valid datetime
        expiry_date = parse_date(pass_expiry) if pass_expiry else None
        
        is_valid = (user.get('Pass_Status') and 
                   expiry_date and 
                   expiry_date > current_time)
        
        if is_valid:
            # Get bus information for route validation
            bus = None
            route_valid = True
            
            # Handle different bus ID formats
            if bus_id != 'default-bus-id':
                try:
                    bus = mongo.db.buses.find_one({'_id': ObjectId(bus_id)})
                except:
                    # If not a valid ObjectId, try finding by bus number
                    bus = mongo.db.buses.find_one({'busNumber': bus_id})
            
            # If bus not found by ID, use default bus info
            if not bus:
                bus = {
                    'from': 'Srikakulam',  # Default values
                    'to': 'Rajam'
                }
            
            # Check if pass is valid for bus route
            user_from = user.get('From')
            user_to = user.get('To')
            bus_from = bus.get('from')
            bus_to = bus.get('to')
            
            # Route validation
            if bus_from and bus_to and user_from and user_to:
                route_valid = (user_from.lower() == bus_from.lower() and 
                              user_to.lower() == bus_to.lower())
            
            # Pass is valid - return user data with properly formatted dates
            user_data = {
                "name": user.get('name', ''),
                "photo": user.get('applicant_photo_filename', ''),
                "passId": str(user.get('_id', '')),  # Use user ID as passId
                "passType": user.get('pass_type', ''),
                "From": user.get('From', ''),  # Add From field
                "To": user.get('To', ''),      # Add To field
                "validity": format_date(expiry_date) if expiry_date else '',  # Use the formatted date
                "routeValid": route_valid
            }
            
            message = "Pass is valid"
            if not route_valid:
                message = "Pass is valid but route doesn't match bus route"
            
            return jsonify({
                "success": True,
                "valid": True,
                "user": user_data,
                "routeValid": route_valid,
                "message": message
            })
        else:
            # Pass is invalid or expired
            return jsonify({
                "success": True,
                "valid": False,
                "message": "Pass is invalid or expired"
            })
            
    except Exception as e:
        print(f"Error verifying pass: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

# Helper function to parse dates
def parse_date(date_str):
    """Parse date string to datetime object"""
    if isinstance(date_str, datetime):
        return date_str
    try:
        # Try parsing ISO format
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except:
        try:
            # Try parsing other common formats
            return datetime.strptime(date_str, '%Y-%m-%dT%H:%M:%S.%fZ')
        except:
            try:
                return datetime.strptime(date_str, '%Y-%m-%d')
            except:
                return None

# Helper function to format dates for frontend
def format_date(date_obj):
    """Format datetime object for JSON response"""
    if isinstance(date_obj, datetime):
        return date_obj.isoformat()
    return date_obj
@app.route('/api/debug/user-dates/<user_id>', methods=['GET'])
def debug_user_dates(user_id):
    """Debug endpoint to check date values in database"""
    try:
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        pass_expiry = user.get('pass_expiry')
        expiry_date = parse_date(pass_expiry) if pass_expiry else None
        
        return jsonify({
            "success": True,
            "pass_expiry_raw": str(pass_expiry),
            "pass_expiry_type": str(type(pass_expiry)) if pass_expiry else "None",
            "pass_expiry_parsed": str(expiry_date) if expiry_date else "None",
            "pass_expiry_formatted": format_date(pass_expiry),
            "current_time": str(datetime.utcnow()),
            "is_valid": expiry_date and expiry_date > datetime.utcnow() if expiry_date else False
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
@app.route('/api/conductor/store-verification', methods=['POST'])
def store_verification():
    try:
        data = request.get_json()
        print("Received verification data:", data)  # Debug log
        
        # Handle busId - allow string IDs
        bus_id = data.get('busId')
        if bus_id == 'default-bus-id':
            # Use a default bus ID or handle as string
            data['busId'] = 'default-bus'
        elif bus_id:
            try:
                data['busId'] = ObjectId(bus_id)
            except:
                data['busId'] = bus_id  # Keep as string if not valid ObjectId
        
        # Handle userId if present
        user_id = data.get('userId')
        if user_id:
            try:
                data['userId'] = ObjectId(user_id)
            except:
                data['userId'] = user_id  # Keep as string
        
        data['timestamp'] = datetime.utcnow()
        
        # Insert into verifications collection
        result = mongo.db.verifications.insert_one(data)
        
        return jsonify({
            "success": True, 
            "message": "Verification stored successfully",
            "verificationId": str(result.inserted_id)
        })
        
    except Exception as e:
        print("Error storing verification:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500
@app.route('/api/conductor/verifications', methods=['GET'])
@token_required
def get_conductor_verifications(current_user):
    try:
        # Get verification history for this conductor
        verifications = list(mongo.db.verifications.find({
            "conductor_id": ObjectId(current_user["_id"])
        }).sort("timestamp", -1).limit(50))
        
        # Format the response using the helper function
        formatted_verifications = [
            format_verification_response(verification) 
            for verification in verifications
        ]
        
        return jsonify({
            "success": True,
            "verifications": formatted_verifications
        })
        
    except Exception as e:
        print(f"Error fetching verifications: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
@app.route('/api/conductor/verification-history', methods=['GET'])
def get_verification_history():
    try:
        bus_id = request.args.get('busId')
        date = request.args.get('date')
        
        if not bus_id or not date:
            return jsonify({"success": False, "message": "Bus ID and date are required"}), 400
        
        # Build query
        query = {
            "busId": ObjectId(bus_id),
            "date": date
        }
        
        # Get verification history
        history = list(mongo.db.verifications.find(query).sort("timestamp", -1))
        
        # Convert ObjectId to string for JSON serialization
        for item in history:
            item['_id'] = str(item['_id'])
            item['busId'] = str(item['busId'])
            if 'userId' in item:
                item['userId'] = str(item['userId'])
        
        return jsonify({
            "success": True,
            "history": history
        })
        
    except Exception as e:
        print(f"Error fetching verification history: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

# Add this route to serve user photos
@app.route('/api/user/photo/<filename>')
def get_user_photo1(filename):
    try:
        return send_from_directory(
            os.path.join(app.config['UPLOAD_FOLDER'], 'applicantPhotos'),
            filename
        )
    except FileNotFoundError:
        # Return a default avatar or error image
        return jsonify({"success": False, "message": "Photo not found"}), 404
# Route to serve user photos
@app.route('/api/user/photo/<filename>')
def get_user_photo(filename):
    try:
        return send_from_directory(
            os.path.join(app.config['UPLOAD_FOLDER'], 'applicantPhotos'),
            filename
        )
    except FileNotFoundError:
        return jsonify({"success": False, "message": "Photo not found"}), 404
@app.route('/api/admin/fix-invalid-dates', methods=['POST'])
def fix_invalid_dates():
    """Fix invalid dates in the database"""
    try:
        users = list(mongo.db.users.find({}))
        fixed_count = 0
        
        for user in users:
            update_data = {}
            user_id = user['_id']
            
            # Check and fix pass_expiry
            pass_expiry = user.get('pass_expiry')
            if pass_expiry and not parse_date(pass_expiry):
                print(f"Fixing invalid pass_expiry for user {user_id}: {pass_expiry}")
                # Set to 1 year from now if invalid
                update_data['pass_expiry'] = datetime.utcnow() + timedelta(days=365)
                fixed_count += 1
            
            # Check and fix other date fields if needed
            dob = user.get('dob')
            if dob and not parse_date(dob):
                print(f"Fixing invalid dob for user {user_id}: {dob}")
                # Set to a reasonable default or null
                update_data['dob'] = None
                fixed_count += 1
            
            # Update if any fixes are needed
            if update_data:
                mongo.db.users.update_one(
                    {"_id": user_id},
                    {"$set": update_data}
                )
        
        return jsonify({
            "success": True, 
            "message": f"Fixed {fixed_count} invalid date fields"
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
# Run startup checks when the app starts
with app.app_context():
    print("Running startup checks...")
    check_email_config()
    cleanup_expired_tokens()
    print("Startup checks completed")
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=os.getenv("FLASK_DEBUG", "True")=="True")