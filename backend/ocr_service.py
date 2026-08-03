import os
import numpy as np
import cv2

# Initialize PaddleOCR lazily to avoid heavy loading on startup if not needed immediately
_ocr_engine = None

def get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is None:
        try:
            from paddleocr import PaddleOCR
            print("Initializing PaddleOCR (Thai+English)...")
            # use_angle_cls=True helps with slightly rotated images
            # lang='thai' implicitly handles English as well in PaddleOCR v2.0+
            _ocr_engine = PaddleOCR(use_angle_cls=True, lang='thai', show_log=False)
            print("PaddleOCR Initialized successfully.")
        except ImportError:
            print("Error: PaddleOCR not installed.")
            return None
    return _ocr_engine

def perform_ocr_on_image(image_bytes: bytes):
    """
    Takes image bytes, decodes via OpenCV, and runs PaddleOCR.
    Returns a list of Tesseract-like objects: { text, bbox: {x0,y0,x1,y1}, confidence }
    """
    engine = get_ocr_engine()
    if not engine:
        raise Exception("PaddleOCR engine could not be initialized.")

    # Decode image bytes to numpy array for OpenCV
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Could not decode image.")

    # Run OCR (ocr returns a list of lists: [[[[x,y],[x,y],[x,y],[x,y]], (text, confidence)], ...])
    # The first index is the batch result (since we pass one image, we take result[0])
    result = engine.ocr(img, cls=True)

    if not result or not result[0]:
        return []

    lines_data = result[0]
    words_out = []

    for line in lines_data:
        box, (text, confidence) = line
        
        # box is a list of 4 points: [top-left, top-right, bottom-right, bottom-left]
        # We convert this to x0, y0, x1, y1 (Bounding Box)
        x_coords = [point[0] for point in box]
        y_coords = [point[1] for point in box]
        
        x0 = float(min(x_coords))
        y0 = float(min(y_coords))
        x1 = float(max(x_coords))
        y1 = float(max(y_coords))

        words_out.append({
            "text": text,
            "confidence": float(confidence * 100), # Convert 0-1 to 0-100 percentage
            "bbox": {
                "x0": x0,
                "y0": y0,
                "x1": x1,
                "y1": y1
            }
        })

    return words_out
