from flask_pymongo import PyMongo
from pymongo import ASCENDING
import time

mongo = PyMongo()

def init_db(app):
    if not app.config.get("MONGO_URI"):
        raise RuntimeError("MONGO_URI missing in app.config")

    max_retries = 3
    retry_delay = 2  # seconds
    
    for attempt in range(max_retries):
        try:
            mongo.init_app(app)
            with app.app_context():
                db = mongo.db
                db.command("ping")
                print(f"✅ Connected to MongoDB: {db.name}")

                # Create indexes
                db.users.create_index([("email", ASCENDING)], unique=True)
                db.users.create_index([("face_registered", ASCENDING)])
                db.users.create_index([("user_type", ASCENDING)])

                db.bus_passes.create_index([("user_id", ASCENDING)])
                db.bus_passes.create_index([("status", ASCENDING)])
                db.bus_passes.create_index([("expiry_date", ASCENDING)])
                
                return mongo
        except Exception as e:
            print(f"❌ MongoDB connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                print(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                print("Max retries reached. Could not connect to MongoDB.")
                raise