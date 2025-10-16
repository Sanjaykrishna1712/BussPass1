import io
import json
import qrcode

def make_qr_png_bytes(payload: dict) -> bytes:
    """
    Make a QR code as PNG bytes from a Python dict payload.
    """
    data = json.dumps(payload, separators=(",", ":"))
    qr_img = qrcode.make(data)
    buf = io.BytesIO()
    qr_img.save(buf, format="PNG")
    return buf.getvalue()
