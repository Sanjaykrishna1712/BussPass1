# Lightweight schema helper (not an ORM model)
# Stored in db.users
# Example document:
"""
{
  _id: ObjectId,
  name: str,
  email: str (unique),
  password: str (hashed),
  user_type: "student"|"employee"|"senior",
  created_at: datetime,
  face_registered: bool,
  face_embeddings: [ [float, ...], ... ]  # latest first
}
"""
