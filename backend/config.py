# backend/config.py
import os
from dotenv import load_dotenv
load_dotenv()
class Config:
    # App
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    # JWT
    JWT_SECRET = os.getenv("JWT_SECRET", "dev-jwt")
    JWT_ACCESS_EXPIRES = int(os.getenv("JWT_ACCESS_EXPIRES", 3600))
    # DB
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/smart_bus_pass")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "smart_bus_pass")
    # Face Recognition
    YOLO_MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "models/yolov8n-face.pt")
    DEEPFACE_MODEL = os.getenv("DEEPFACE_MODEL", "ArcFace")
    FACE_THRESHOLD = float(os.getenv("FACE_THRESHOLD", 0.60))  # cosine similarity threshold
    # Uploads
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
    # Create upload directory
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
# Optional: Environment-specific configurations
class DevelopmentConfig(Config):
    DEBUG = True
    ENV = 'development'
class ProductionConfig(Config):
    DEBUG = False
    ENV = 'production'
    # Override with production values
    SECRET_KEY = os.getenv("SECRET_KEY")
    JWT_SECRET = os.getenv("JWT_SECRET")
class TestingConfig(Config):
    TESTING = True
    MONGO_URI = os.getenv("TEST_MONGO_URI", "mongodb://localhost:27017/test_smart_bus_pass")