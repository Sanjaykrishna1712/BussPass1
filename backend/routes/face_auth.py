# backend/routes/face_auth.py
from flask import Blueprint, request, jsonify
from bson import ObjectId
import os
import cv2
import numpy as np

from utils.database import mongo
from face_processing.detection import FaceDetector
from face_processing.recognition import FaceRecognizer
from config import Config

face_auth_bp = Blueprint("face_auth", __name__)

# Models (loaded once)
detector = FaceDetector()
recognizer = FaceRecognizer()

FACE_DIR = os.path.join(os.getcwd(), "registered_faces")
os.makedirs(FACE_DIR, exist_ok=True)

def _read_image(file_storage):
    try:
        data = np.frombuffer(file_storage.read(), np.uint8)
        img = cv2.imdecode(data, cv2.IMREAD_COLOR)
        return img
    except Exception:
        return None

def _largest_face_crop(image):
    faces = detector.detect_faces(image)
    if not faces:
        return None
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    return image[y:y+h, x:x+w]

@face_auth_bp.route("/register", methods=["POST"])
def register_face():
    """
    Accepts:
      - multipart/form-data with:
        - user_id: str
        - images: multiple files (images[]) OR single 'image' file
    Stores up to 5 embeddings for best robustness.
    """
    db = mongo.db
    user_id = request.form.get("user_id")
    if not user_id:
        return jsonify({"message": "user_id is required"}), 400

    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"message": "User not found"}), 404

    files = request.files.getlist("images")
    if not files:
        single = request.files.get("image")
        if single:
            files = [single]

    if not files:
        return jsonify({"message": "At least one image is required (images[] or image)"}), 400

    embeddings = []
    saved_any = False

    for f in files[:5]:  # limit to 5
        img = _read_image(f)
        if img is None:
            continue
        crop = _largest_face_crop(img)
        if crop is None:
            continue

        emb = recognizer.generate_embedding(crop)
        if emb is None:
            continue

        embeddings.append(emb)
        # Save last crop preview
        fname = os.path.join(FACE_DIR, f"{user_id}.jpg")
        cv2.imwrite(fname, crop)
        saved_any = True
        last_path = fname

    if not embeddings:
        return jsonify({"message": "No valid faces detected in uploads"}), 400

    ok = recognizer.store_faces(user_id, embeddings)
    if not ok:
        return jsonify({"message": "Failed to store embeddings"}), 500

    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"face_registered": True, "face_path": last_path if saved_any else user.get("face_path")}}
    )

    return jsonify({"message": f"Stored {len(embeddings)} face embeddings", "count": len(embeddings)}), 200

@face_auth_bp.route("/verify", methods=["POST"])
def verify_face():
    """
    Accepts multipart/form-data:
      - image: file  (or images[] -> we’ll just use first valid)
    Returns:
      - { success, user_id?, message }
    """
    db = mongo.db
    files = request.files.getlist("images")
    if not files:
        single = request.files.get("image")
        if single:
            files = [single]

    if not files:
        return jsonify({"error": "No image provided"}), 400

    for f in files:
        img = _read_image(f)
        if img is None:
            continue
        crop = _largest_face_crop(img)
        if crop is None:
            continue
        emb = recognizer.generate_embedding(crop)
        if emb is None:
            continue

        user_id = recognizer.verify_face(emb)
        if user_id:
            user = db.users.find_one({"_id": ObjectId(user_id)})
            return jsonify({
                "success": True,
                "user_id": user_id,
                "message": "Face verified",
                "name": user["name"] if user else None,
                "user_type": user["user_type"] if user else None
            })

    return jsonify({"success": False, "message": "No matching face found"}), 404
