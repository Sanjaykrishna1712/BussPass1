# backend/utils/auth_utils.py
from functools import wraps
from flask import request, jsonify
from bson import ObjectId
from datetime import datetime, timedelta
import jwt

from config import Config
from utils.database import mongo

def make_token(user_id: str):
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(seconds=Config.JWT_ACCESS_EXPIRES),
    }
    tok = jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")
    return tok.decode("utf-8") if isinstance(tok, bytes) else tok

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "")
        if token.startswith("Bearer "):
            token = token[7:]

        if not token:
            return jsonify({"message": "Token is missing"}), 401

        try:
            data = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
            uid = data.get("user_id")
            if not ObjectId.is_valid(uid):
                return jsonify({"message": "Invalid user id"}), 401

            user = mongo.db.users.find_one({"_id": ObjectId(uid)})
            if not user:
                return jsonify({"message": "User not found"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Token is invalid"}), 401
        except Exception as e:
            print("JWT decode error:", e)
            return jsonify({"message": "Token verification failed"}), 401

        return f(user, *args, **kwargs)
    return decorated
