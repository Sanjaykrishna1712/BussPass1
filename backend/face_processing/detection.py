# backend/face_processing/detection.py
import cv2
from ultralytics import YOLO
from config import Config

class FaceDetector:
    """
    YOLOv8-face detector.
    Returns list of (x, y, w, h) for each detected face.
    """
    _shared = None

    def __init__(self, model_path: str = Config.YOLO_MODEL_PATH):
        if FaceDetector._shared is None:
            FaceDetector._shared = YOLO(model_path)
        self.model = FaceDetector._shared

    def detect_faces(self, image):
        if image is None:
            return []
        # Ensure 3-ch
        if len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        elif image.shape[2] == 1:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)

        # (Optional) downscale for speed
        h, w = image.shape[:2]
        max_side = max(h, w)
        if max_side > 1024:
            scale = 1024 / max_side
            image = cv2.resize(image, (int(w*scale), int(h*scale)))

        results = self.model(image, verbose=False)
        faces = []
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                faces.append((x1, y1, x2 - x1, y2 - y1))
        return faces
