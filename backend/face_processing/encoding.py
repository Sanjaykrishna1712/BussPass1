from deepface import DeepFace
import numpy as np

class FaceRecognizer:
    def __init__(self, model_name="Facenet"):
        self.model_name = model_name

    def get_embedding(self, face_img):
        try:
            embedding_obj = DeepFace.represent(face_img, model_name=self.model_name, enforce_detection=False)
            return np.array(embedding_obj[0]['embedding'])
        except Exception as e:
            print(f"[ERROR] Embedding generation failed: {e}")
            return None
