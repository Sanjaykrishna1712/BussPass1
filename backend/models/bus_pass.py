# Lightweight schema helper for db.bus_passes
# Example document:
"""
{
  _id: ObjectId,
  user_id: ObjectId,
  pass_type: "daily"|"weekly"|"monthly",
  zones: [str, ...],
  issue_date: datetime,
  expiry_date: datetime,
  status: "active"|"suspended"|"expired"
}
"""
