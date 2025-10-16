from math import radians, sin, cos, asin, sqrt

BASE_FARE = 10.0        # base fare in currency units
PER_KM = 1.75           # per-km charge
MAX_DAILY_CAP = 60.0    # max cap per trip/day (example)

def _haversine_km(lat1, lon1, lat2, lon2):
    """
    Compute distance between two lat/lng points in kilometers.
    """
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return R * c

def calculate_fare(payload: dict) -> dict:
    """
    Accepts:
      - {"distance_km": 12.3}
      - {"start_lat": ..., "start_lng": ..., "end_lat": ..., "end_lng": ...}
    Returns: {"distance_km": float, "fare": float, "capped": bool}
    """
    if "distance_km" in payload:
        distance_km = float(payload["distance_km"])
    else:
        try:
            distance_km = _haversine_km(
                float(payload["start_lat"]),
                float(payload["start_lng"]),
                float(payload["end_lat"]),
                float(payload["end_lng"]),
            )
        except Exception:
            return {"error": "Invalid input for distance"}, 400

    fare = BASE_FARE + PER_KM * max(0.0, distance_km)
    capped = False
    if fare > MAX_DAILY_CAP:
        fare = MAX_DAILY_CAP
        capped = True

    fare = round(fare, 2)
    return {"distance_km": round(distance_km, 3), "fare": fare, "capped": capped}
