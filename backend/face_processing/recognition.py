# backend/face_processing/recognition.py
import numpy as np
from deepface import DeepFace
from bson import ObjectId
from sklearn.metrics.pairwise import cosine_similarity

from config import Config
from utils.database import mongo

class FaceRecognizer:
    """
    Uses DeepFace (ArcFace by default) to generate embeddings and verify.
    Stores multiple embeddings per user (face_embeddings: [ [..], [..], ... ]).
    """
    def __init__(self):
        self.model_name = Config.DEEPFACE_MODEL  # "ArcFace"
        self.threshold = Config.FACE_THRESHOLD   # 0.60 (cosine sim)
        # DeepFace caches models internally; no manual preload needed

    def _ensure_rgb(self, img):
        if img is None:
            return None
        if len(img.shape) == 2:
            return np.stack([img, img, img], axis=-1)
        if img.shape[2] == 1:
            return np.repeat(img, 3, axis=2)
        return img

    def generate_embedding(self, face_image):
        """
        face_image: cropped face (BGR or RGB np.ndarray)
        returns: np.ndarray float32
        """
        try:
            img = self._ensure_rgb(face_image)
            if img is None:
                return None
            # DeepFace expects RGB; convert if needed (we pass BGR sometimes)
            # We'll assume BGR -> convert:
            img_rgb = img[:, :, ::-1].copy()

            reps = DeepFace.represent(
                img_path=img_rgb,
                model_name=self.model_name,
                enforce_detection=False,
                detector_backend="skip",
            )
            if not reps:
                return None
            emb = np.asarray(reps[0]["embedding"], dtype=np.float32)
            return emb
        except Exception as e:
            print("Embedding generation failed:", e)
            return None

    def store_faces(self, user_id: str, embeddings: list[np.ndarray]) -> bool:
        """
        Append multiple embeddings. Also set face_registered = True.
        """
        try:
            db = mongo.db
            payload = [emb.astype(np.float32).tolist() for emb in embeddings if emb is not None]
            if not payload:
                return False
            res = db.users.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {"face_registered": True},
                    "$push": {"face_embeddings": {"$each": payload}}
                },
                upsert=False
            )
            return res.modified_count == 1
        except Exception as e:
            print("Failed to store faces:", e)
            return False

    def verify_face(self, query_embedding: np.ndarray) -> str | None:
        """
        Returns best-matching user_id if cosine similarity >= threshold, else None.
        """
        try:
            db = mongo.db
            users = db.users.find(
                {"face_embeddings": {"$exists": True, "$ne": []}},
                {"face_embeddings": 1}
            )

            q = query_embedding.reshape(1, -1)
            best_user = None
            best_sim = -1.0

            for u in users:
                emb_list = u.get("face_embeddings", [])
                if not emb_list:
                    continue

                # max similarity among that user's stored embeddings
                sims = []
                for e in emb_list:
                    e_arr = np.asarray(e, dtype=np.float32).reshape(1, -1)
                    sim = float(cosine_similarity(q, e_arr)[0][0])
                    sims.append(sim)
                if not sims:
                    continue

                max_user_sim = max(sims)
                if max_user_sim > best_sim:
                    best_sim = max_user_sim
                    best_user = str(u["_id"])

            if best_sim >= self.threshold:
                return best_user
            return None
        except Exception as e:
            print("Face verify failed:", e)
            return None
