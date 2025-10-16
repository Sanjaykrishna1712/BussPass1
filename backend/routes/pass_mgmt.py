from flask import Blueprint, request, jsonify, send_file
from datetime import datetime, timedelta
from bson import ObjectId
import io

from routes.auth import token_required
from utils.database import mongo
from utils.fare_calculator import calculate_fare
from utils.qr_generator import make_qr_png_bytes
from utils.pdf_generator import make_pass_pdf

pass_bp = Blueprint("pass_mgmt", __name__)
db = mongo.db

@pass_bp.route("/passes", methods=["GET"])
@token_required
def get_passes(current_user):
    passes = list(db.bus_passes.find({"user_id": current_user["_id"]}).sort("issue_date", -1))
    for p in passes:
        p["_id"] = str(p["_id"])
        p["user_id"] = str(p["user_id"])
    return jsonify({"passes": passes})

@pass_bp.route("/create", methods=["POST"])
@token_required
def create_pass(current_user):
    """
    Create a new time-bound pass.
    body: { "pass_type": "monthly|weekly|daily", "zones": ["Z1","Z2"] }
    """
    data = request.get_json(silent=True) or {}
    pass_type = data.get("pass_type", "monthly")
    zones = data.get("zones", [])
    days = {"daily": 1, "weekly": 7, "monthly": 30}.get(pass_type, 30)

    issue = datetime.utcnow()
    expiry = issue + timedelta(days=days)

    # Generate QR payload for this pass
    payload = {"type": "bus_pass", "user_id": str(current_user["_id"]), "issue": issue.isoformat()}
    qr_png = make_qr_png_bytes(payload)

    # Generate PDF pass
    pdf_bytes = make_pass_pdf(
        user_name=current_user["name"],
        user_type=current_user.get("user_type", ""),
        user_id=str(current_user["_id"]),
        pass_type=pass_type,
        issue_date=issue,
        expiry_date=expiry,
        zones=zones,
        qr_png_bytes=qr_png,
    )

    doc = {
        "user_id": current_user["_id"],
        "pass_type": pass_type,
        "zones": zones,
        "issue_date": issue,
        "expiry_date": expiry,
        "status": "active",
    }

    inserted = db.bus_passes.insert_one(doc)
    pass_id = inserted.inserted_id

    # Optionally store PDF in GridFS or return bytes
    if request.args.get("download") == "1":
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"bus_pass_{pass_id}.pdf",
        )

    return jsonify({"message": "Pass created", "pass_id": str(pass_id), "issue_date": issue, "expiry_date": expiry})


@pass_bp.route("/renew/<pass_id>", methods=["POST"])
@token_required
def renew_pass(current_user, pass_id):
    doc = db.bus_passes.find_one({"_id": ObjectId(pass_id), "user_id": current_user["_id"]})
    if not doc:
        return jsonify({"message": "Pass not found"}), 404
    if doc.get("status") != "active":
        return jsonify({"message": "Only active passes can be renewed"}), 400

    # Extend by the same original duration
    days = (doc["expiry_date"] - doc["issue_date"]).days or 30
    new_expiry = doc["expiry_date"] + timedelta(days=days)
    db.bus_passes.update_one({"_id": ObjectId(pass_id)}, {"$set": {"expiry_date": new_expiry}})
    return jsonify({"message": "Pass renewed", "new_expiry": new_expiry})


@pass_bp.route("/fare", methods=["POST"])
@token_required
def compute_fare(current_user):
    """
    body: { "distance_km": 12.3 }  OR  { "start_lat": ..., "start_lng": ..., "end_lat": ..., "end_lng": ... }
    """
    data = request.get_json(silent=True) or {}
    # Supports distance_km directly or calculates from coordinates
    fare_info = calculate_fare(data)
    return jsonify(fare_info)
@pass_bp.route("/renew-request", methods=["POST"])
@token_required
def request_renewal(current_user):
    """
    User requests pass renewal after expiry
    """
    user = mongo.db.users.find_one({"_id": current_user["_id"]})
    
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    if user.get("Pass_Status") is not False:
        return jsonify({"message": "Only expired passes can be renewed"}), 400
    
    # Update status to indicate renewal requested
    mongo.db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"renewal_requested": True, "renewal_request_date": datetime.datetime.utcnow()}}
    )
    
    return jsonify({"message": "Renewal request submitted for admin approval"})