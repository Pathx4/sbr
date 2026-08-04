import os
import numpy as np
import cv2

# Disable PIR and OneDNN before importing Paddle
os.environ['FLAGS_enable_pir_api'] = '0'
os.environ['FLAGS_enable_pir_in_executor'] = '0'
os.environ['FLAGS_use_mkldnn'] = '0'

_ocr_engine = None

def get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is None:
        try:
            from paddleocr import PaddleOCR
            print("Initializing PaddleOCR (Thai+English)...")
            try:
                _ocr_engine = PaddleOCR(use_angle_cls=True, lang='th', enable_mkldnn=False)
            except Exception:
                _ocr_engine = PaddleOCR(use_angle_cls=True, lang='th')
            print("PaddleOCR Initialized successfully.")
        except Exception as e:
            print(f"Error initializing PaddleOCR: {e}")
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

    # Run OCR
    try:
        result = engine.ocr(img)
    except Exception as e:
        print(f"OCR predict error: {e}")
        raise e

    if not result:
        return []

    words_out = []
    res_item = result[0] if isinstance(result, list) and len(result) > 0 else result

    if isinstance(res_item, dict):
        # PaddleOCR 3.x / Paddlex Dict format with parallel arrays
        rec_texts = res_item.get('rec_texts', [])
        rec_scores = res_item.get('rec_scores', [])
        rec_polys = res_item.get('rec_polys') if res_item.get('rec_polys') is not None else res_item.get('dt_polys', [])

        for i in range(len(rec_texts)):
            text = str(rec_texts[i]).strip()
            if not text:
                continue

            score = float(rec_scores[i]) if i < len(rec_scores) else 0.9
            confidence = float(score * 100 if score <= 1.0 else score)

            box = rec_polys[i] if (rec_polys is not None and i < len(rec_polys)) else None
            if box is not None and len(box) >= 4:
                x_coords = [float(p[0]) for p in box]
                y_coords = [float(p[1]) for p in box]
                x0, y0, x1, y1 = min(x_coords), min(y_coords), max(x_coords), max(y_coords)
            else:
                x0, y0, x1, y1 = 0.0, float(i * 20), 100.0, float((i + 1) * 20)

            words_out.append({
                "text": text,
                "confidence": confidence,
                "bbox": {
                    "x0": x0,
                    "y0": y0,
                    "x1": x1,
                    "y1": y1
                }
            })
    elif isinstance(res_item, list):
        # PaddleOCR 2.x list of tuples format: [ [box, (text, confidence)], ... ]
        for line in res_item:
            if not line or not isinstance(line, (list, tuple)) or len(line) < 2:
                continue
            box = line[0]
            text_info = line[1]
            if isinstance(text_info, (list, tuple)) and len(text_info) >= 2:
                text = str(text_info[0]).strip()
                conf = float(text_info[1])
            else:
                text = str(text_info).strip()
                conf = 0.9

            if not text or not box:
                continue

            x_coords = [float(point[0]) for point in box]
            y_coords = [float(point[1]) for point in box]
            words_out.append({
                "text": text,
                "confidence": float(conf * 100 if conf <= 1.0 else conf),
                "bbox": {
                    "x0": min(x_coords),
                    "y0": min(y_coords),
                    "x1": max(x_coords),
                    "y1": max(y_coords)
                }
            })

    return words_out
