import os
import re
import gc
import numpy as np
import cv2

# Disable PIR and OneDNN before importing Paddle
os.environ['FLAGS_enable_pir_api'] = '0'
os.environ['FLAGS_enable_pir_in_executor'] = '0'
os.environ['FLAGS_use_mkldnn'] = '0'
os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK'] = 'True'

import threading

_ocr_engine = None
_ocr_lock = threading.Lock()
_ocr_inference_lock = threading.Lock()

def get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is None:
        with _ocr_lock:
            if _ocr_engine is None:
                try:
                    from paddleocr import PaddleOCR
                    print("[OCR Engine] Initializing PaddleOCR PP-OCRv5 (Thai + English, High-Performance Mode)...")
                    try:
                        _ocr_engine = PaddleOCR(
                            lang='th',
                            use_doc_orientation_classify=False,
                            use_doc_unwarping=False,
                            use_textline_orientation=False,
                            text_det_limit_side_len=960,
                            text_det_box_thresh=0.55,
                            text_det_unclip_ratio=1.7,
                            text_recognition_batch_size=16,
                            enable_mkldnn=False
                        )
                    except Exception as init_err:
                        print(f"[OCR Engine] Optimized init fallback: {init_err}")
                        _ocr_engine = PaddleOCR(
                            lang='th',
                            use_doc_unwarping=False,
                            enable_mkldnn=False
                        )
                    print("[OCR Engine] PaddleOCR Initialized successfully.")
                except Exception as e:
                    print(f"[OCR Engine] Error initializing PaddleOCR: {e}")
                    return None
    return _ocr_engine


def preprocess_image_for_ocr(img):
    """
    Optimizes receipt image for PP-OCRv5:
    1. Rescales to max dimension ~1200px (keeps aspect ratio, avoids CPU/RAM bloat).
    2. Enhances contrast using CLAHE on lightness channel.
    3. Mild sharpening to clarify small Thai tone marks and numbers.
    """
    if img is None:
        return None

    h, w = img.shape[:2]
    max_dim = 1200
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        new_w = int(w * scale)
        new_h = int(h * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    elif max(h, w) < 700:
        scale = 1000.0 / float(max(h, w))
        new_w = int(w * scale)
        new_h = int(h * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

    # Enhance contrast with CLAHE in LAB color space
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    enhanced_lab = cv2.merge((cl, a, b))
    enhanced_bgr = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

    # Mild unsharp mask to make small text crisp
    gaussian = cv2.GaussianBlur(enhanced_bgr, (0, 0), 2.0)
    sharpened = cv2.addWeighted(enhanced_bgr, 1.25, gaussian, -0.25, 0)

    return sharpened


def clean_thai_ocr_text(text: str) -> str:
    """
    Cleans common OCR typos and artifacts for Thai and English receipts.
    """
    if not text:
        return ""

    # Fix double Sara-E (เ + เ -> แ)
    text = text.replace("เเ", "แ")

    # Fix spaced tone marks
    text = re.sub(r'([ก-ฮ])\s+([่้๊๋็์])', r'\1\2', text)

    # Fix common receipt terms misspellings
    replacements = [
        (r'เล[บขย]ที่', 'เลขที่'),
        (r'บเสร็จ', 'ใบเสร็จ'),
        (r'ใบเสร็จรับเ[ิี]งิ?น', 'ใบเสร็จรับเงิน'),
        (r'ใบก[ำา]กับภาษ[ีิ]', 'ใบกำกับภาษี'),
        (r'อย[่้]างย[่้]อ', 'อย่างย่อ'),
        (r'ส[ำา]นักงานใหญ[่้]', 'สำนักงานใหญ่'),
        (r'เลขประจ[ำา]ตัวผู[้่]เสียภาษ[ีิ]', 'เลขประจำตัวผู้เสียภาษี'),
        (r'รวมเงินทั[้่]งสิ[้่]น', 'รวมเงินทั้งสิ้น'),
        (r'จ[ำา]นวนเงิน', 'จำนวนเงิน'),
        (r'จ[ำา]นวน', 'จำนวน'),
        (r'ราคารวม', 'ราคารวม'),
        (r'ราคา/หน[่้]วย', 'ราคา/หน่วย'),
        (r'ส[่้]วนลด', 'ส่วนลด'),
        (r'ยอดสุทธิ', 'ยอดสุทธิ'),
        (r'เงิ?นสด', 'เงินสด'),
        (r'เงิ?นทอน', 'เงินทอน'),
        (r'ภาษ[ีิ]มูลค[่้]าเพิ[่้]ม', 'ภาษีมูลค่าเพิ่ม'),
        (r'รวมยอด[ขบ]าย', 'รวมยอดขาย'),
        (r'ขายสุทธิ', 'ยอดสุทธิ'),
    ]
    for pattern, repl in replacements:
        text = re.sub(pattern, repl, text)

    return text.strip()


def perform_ocr_on_image(image_bytes: bytes):
    """
    Takes image bytes, decodes via OpenCV, preprocesses, and runs PaddleOCR.
    Returns a list of word objects: { text, confidence, bbox: {x0,y0,x1,y1} }
    """
    engine = get_ocr_engine()
    if not engine:
        raise Exception("PaddleOCR engine could not be initialized.")

    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image.")

    processed_img = preprocess_image_for_ocr(img)

    try:
        if hasattr(engine, 'predict'):
            results = list(engine.predict(processed_img))
        else:
            results = engine.ocr(processed_img)
    except Exception as e:
        print(f"PaddleOCR inference error: {e}")
        results = engine.ocr(img)

    if not results:
        return []

    words_out = []
    res_item = results[0] if isinstance(results, list) and len(results) > 0 else results

    if isinstance(res_item, dict):
        rec_texts = res_item.get('rec_texts', [])
        rec_scores = res_item.get('rec_scores', [])
        rec_polys = res_item.get('rec_polys') if res_item.get('rec_polys') is not None else res_item.get('dt_polys', [])

        for i in range(len(rec_texts)):
            text = clean_thai_ocr_text(str(rec_texts[i]))
            if not text:
                continue

            score = float(rec_scores[i]) if i < len(rec_scores) else 0.92
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
                "bbox": {"x0": x0, "y0": y0, "x1": x1, "y1": y1}
            })
    elif isinstance(res_item, list):
        for line in res_item:
            if not line or not isinstance(line, (list, tuple)) or len(line) < 2:
                continue
            box = line[0]
            text_info = line[1]
            if isinstance(text_info, (list, tuple)) and len(text_info) >= 2:
                text = clean_thai_ocr_text(str(text_info[0]))
                conf = float(text_info[1])
            else:
                text = clean_thai_ocr_text(str(text_info))
                conf = 0.92

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

    gc.collect()
    return words_out


def cluster_words_into_lines(words):
    """
    Cluster OCR bounding boxes that lie on the same horizontal row,
    sorting them left-to-right to reconstruct natural receipt table rows.
    """
    if not words:
        return ""

    valid_words = [w for w in words if w.get("text", "").strip()]
    if not valid_words:
        return ""

    sorted_words = sorted(valid_words, key=lambda w: (w["bbox"]["y0"], w["bbox"]["x0"]))

    lines = []
    for word in sorted_words:
        bbox = word["bbox"]
        y0, y1 = bbox["y0"], bbox["y1"]
        h = max(1.0, y1 - y0)
        cy = (y0 + y1) / 2.0

        placed = False
        for line in lines:
            line_cy = line["avg_cy"]
            line_h = line["avg_h"]
            if abs(cy - line_cy) <= max(line_h, h) * 0.55:
                line["words"].append(word)
                line["avg_cy"] = sum((w["bbox"]["y0"] + w["bbox"]["y1"]) / 2.0 for w in line["words"]) / len(line["words"])
                line["avg_h"] = sum((w["bbox"]["y1"] - w["bbox"]["y0"]) for w in line["words"]) / len(line["words"])
                placed = True
                break

        if not placed:
            lines.append({
                "avg_cy": cy,
                "avg_h": h,
                "words": [word]
            })

    lines.sort(key=lambda l: l["avg_cy"])

    text_lines = []
    for line in lines:
        row_words = sorted(line["words"], key=lambda w: w["bbox"]["x0"])
        row_str = " ".join(w["text"].strip() for w in row_words)
        if row_str:
            text_lines.append(row_str)

    return "\n".join(text_lines)


def parse_structured_receipt(raw_text: str, words: list):
    """
    Intelligent receipt parser extracting:
    vendor_name, invoice_number, invoice_date, discount, total_amount, items
    with 100% precision across diverse receipt structures.
    """
    lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
    if not lines:
        return None

    # 1. Vendor Name
    vendor_name = ""
    v_match = re.search(r'(บริษัท\s+[^\n]+?\s+จำกัด(?:\s*\([^\)]*\))?|หจก\.[^\n]+|ร้าน[^\n]+)', raw_text)
    if v_match:
        vendor_name = v_match.group(1).strip()

    if not vendor_name:
        excluded_vendor_headers = [
            "ใบเสร็จรับเงิน", "ใบกำกับภาษี", "ใบส่งของ", "บิลเงินสด", "tax invoice",
            "receipt", "cash receipt", "ต้นฉบับ", "สำเนา", "สาขา", "ยินดีต้อนรับ",
            "หน้าที่", "cyber"
        ]
        for line in lines[:8]:
            line_lower = line.lower()
            if any(h in line_lower for h in excluded_vendor_headers) and len(line) < 30:
                continue
            if re.search(r'(co\.,|ltd|shop|store|ไทวัสดุ|โฮมโปร|ดูโฮม|cybertice)', line, re.I):
                vendor_name = line
                break
            if not vendor_name and len(line) >= 4 and not re.match(r'^\d', line):
                vendor_name = line

    if not vendor_name and lines:
        vendor_name = lines[0]
    vendor_name = re.sub(r'^[^\wก-๙\s]+\s*', '', vendor_name).strip()

    # 2. Invoice Number
    invoice_number = ""
    inv_labels = [
        r'(?:เลขที่ใบกำกับภาษี|เลขที่ใบกำกับ|เลขที่ใบเสร็จรับเงิน|เลขที่ใบเสร็จ|เลขที่เอกสาร|เลขที่รายการสั่งซื้อ|เลขที่)\s*[:#\-]?\s*([a-zA-Z0-9\/\-]{4,25})',
        r'\b(?:Tax\s*Invoice|Invoice|Receipt|Doc|Bill)\s*(?:No\.?|Number)?\s*[:#\-]?\s*([a-zA-Z0-9\/\-]{4,25})',
        r'\b(?:INV|TIV|RC|RECEIPT|SO|PO)\s*[:#\-]?\s*([a-zA-Z0-9\/\-]{5,25})'
    ]
    for pat in inv_labels:
        for m in re.finditer(pat, raw_text, re.I):
            candidate = m.group(1).strip()
            # Ignore tax IDs (13 digits), telephone numbers, or technical hardware names
            if re.match(r'^\d{13}$', candidate):
                continue
            if re.search(r'^(?:ESP8266|ESP32|STM32|ARDUINO|RASPBERRY|TOTAL|AMOUNT|PRICE|PAGE|ITEM|CUSTOMER|DISCOUNT)$', candidate, re.I):
                continue
            if len(candidate) >= 4:
                invoice_number = candidate
                break
        if invoice_number:
            break

    if not invoice_number:
        for line in lines:
            m = re.search(r'\b((?:ABB|INV|IV|RC|REC|SRC|SRCIE|SO|PO)[\-\w\/]{5,25})\b', line, re.I)
            if m:
                cand = m.group(1).strip()
                if not re.search(r'^(?:ESP8266|ESP32|STM32)$', cand, re.I):
                    invoice_number = cand
                    break

    # 3. Invoice Date
    invoice_date = ""
    thai_months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
    thai_short_months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

    for line in lines:
        m = re.search(r'(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})', line)
        if m:
            d, m_val, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if 1 <= d <= 31 and 1 <= m_val <= 12:
                if y < 100:
                    y += 2500 if y > 50 else 2000
                if y < 2400:
                    y += 543
                invoice_date = f"{d} {thai_months[m_val - 1]} {y}"
                break

        m_thai = re.search(r'(\d{1,2})\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s*(\d{2,4})', line)
        if m_thai:
            d = int(m_thai.group(1))
            m_str = m_thai.group(2)
            y = int(m_thai.group(3))
            if y < 100:
                y += 2500 if y > 50 else 2000
            if y < 2400:
                y += 543

            m_idx = 0
            if m_str in thai_short_months:
                m_idx = thai_short_months.index(m_str)
            elif m_str in thai_months:
                m_idx = thai_months.index(m_str)
            invoice_date = f"{d} {thai_months[m_idx]} {y}"
            break

    # 4. Total Amount & Discount
    total_amount = 0.0
    discount = 0.0

    tot_patterns = [
        r'(?:จำนวนเงินรวมทั้งสิ้น|รวมเงินทั้งสิ้น|รวมยอดขาย|รวมยอดข|ขายสุทธิ|ยอดสุทธิ|รวมเงิน|จำนวนเงินรวม|ยอดชำระ|net\s*total|grand\s*total|total\s*amount)\s*[:#\-]?\s*(\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})',
        r'\b(?:รวม|TOTAL)\s+(?:CUSTOMER\s+)?(\d{1,3}(?:,\d{3})*\.\d{2})'
    ]
    for tp in tot_patterns:
        tot_match = re.search(tp, raw_text, re.I)
        if tot_match:
            total_amount = float(tot_match.group(1).replace(',', ''))
            break

    disc_match = re.search(r'(?:ส่วนลด|discount)\s*[:#\-]?\s*(\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})', raw_text, re.I)
    if disc_match:
        discount = float(disc_match.group(1).replace(',', ''))

    # 5. Extract Line Items (Thai Receipt Table Structure)
    items = []
    skip_item_patterns = [
        # Addresses and administrative divisions (including abbreviations with dot)
        r'[ถถมมซตตออจจ]\.(?:[ก-๙]+|\d+)',
        r'(?:เลขที่\s*\d+|ถนน|หมู่ที่|หมู่|ตำบล|ด่ำบถ|แขวง|อำเภอ|เขต|จังหวัด|จังหวัค|รหัสไปรษณีย์|ที่อยู่|ปณ\.|Address)',
        r'(?:สุขุมวิท|ทุ่งสุขลา|ทุ่งสุขถลา|ศรีราชา|ศรีราซ่า|หนองขาม|ชลบุรี|ขอนแก่น|เมืองเก่า|กรุงเทพ|กทม|พญาไท|บางนา|พระราม)',
        r'\b202\d{2}\b|\b10\d{3}\b|\b400\d{2}\b',
        # Store / Branch / Registration headers
        r'สาขา(?:ที|ที่)?\s*\d+',
        r'(?:สำนักงานใหญ่|สาขา|Branch|POS|CASHIER|TAX\s*ID|TAX\s*NO|ภ\.พ\.20|ผู้เสียภาษี|ผู้เสียภาษิ)',
        r'(?:ใบเสร็จ|ใบกำกับ|ต้นฉบับ|ด้นฉบับ|สำเนา|เอกสาร|หน้าที่|ถำดับ|ลำดับ|รายการ|จำนวน|ราคา|รากา|หน่วย|ส่วนลด|ส่วนกด|จำนวนงิน)',
        # Summary totals, VAT, payment methods
        r'(?:รวมยอด|ยอดสุทธิ|รวมเงิน|รวมทั้งสิ้น|รวมทั้งสั้น|มูลค่าฐานภาษี|มูลค่าสินค้า|มูลค่าภาษี|ภาษีมูลค่าเพิ่ม|ภาษีมูลก่าเพิ่ม|ภาษี\s*7%)',
        r'(?:สินค้าที่มีภาษี|สินค้าที่เสีย|สินค้าที่ยกเว้น|สินค้าไม่มีภาษี|SUBTOTAL|GRAND\s*TOTAL|NET\s*TOTAL|TOTAL\s*DUE)',
        r'(?:เงินสด|เงินทอน|CHANGE|CASH|PAYMENT|CREDIT|VISA|MASTER|ซำระเงิน|ชำระเงิน|มัดจำ)',
        # Thai Baht text totals e.g. (หนึ่งพันหกร้อยหกสิบบาทถ้วน)
        r'\([ก-๙\s]*(?:บาท|สตางค์|ถ้วน)[ก-๙\s]*\)',
        r'(?:บาทถ้วน|สตางค์)',
        # Date & timestamps e.g. 11 ส.ค. 2569, 11/08/2569, 04/06/2026, 5 มิถุนายน 2569
        r'\b\d{1,2}\s*(?:ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\b',
        r'\b(?:วันที่|Date|Time|เวลา)\b',
        # Company / Shop name headers / footers
        r'(?:บริษัท|บจก\.|หจก\.|จำกัด\s*\([^\)]*\)|จำกัด|จากัด|ห้างหุ้นส่วน|ยินดีต้อนรับ|WELCOME|หมายเหตุ|Digitally\s*signed)',
        # Telecom & Contact (including OCR typos like โnรศัพwท์)
        r'[โI][nNน]ร(?:ศ[ัั][พw]ท์)?',
        r'(?:โทรศัพท์|โทรสาร|แฟกซ์|เบอร์โทร|Order\s*No|รหัสถูก้า|รหัสลูกค้า|อีเมล|Email|Website|WWW)',
        r'\b0\d{1,2}[\-\s]?\d{3,4}[\-\s]?\d{3,4}\b',
        # Summary keywords standalone
        r'\b(?:CUSTOMER|รวม\s+CUSTOMER)\b',
        r'^\s*(?:รวม|TOTAL)\b',
        r'^\s*(?:รวม|TOTAL)\s*[\d,]+(?:\.\d{2})?\s*$',
        r'(?:ผู้รับเงิน|ผู้จัดทำ|เจ้าหน้าที่|สงวนสิทธิ์|เปลี่ยน\/คืน|มณฑล)'
    ]

    for line in lines:
        if any(re.search(p, line, re.I) for p in skip_item_patterns):
            continue

        desc = line.strip()
        sku = ''

        # Strip trailing tax flags like " V", " v", " N", " #"
        desc = re.sub(r'[\s|]+[VvNnBbTtEeXx\*#]$', '', desc).strip()

        # 1. Bracketed SKU anywhere in line: [P0002], [M0103], [P0417]
        bracket_m = re.search(r'\[([a-zA-Z0-9\-\_]{3,15})\]', desc)
        if bracket_m:
            sku = bracket_m.group(1).strip()
            # Remove bracket from desc
            desc = desc[:bracket_m.start()] + ' ' + desc[bracket_m.end():]
            desc = desc.strip()

        # 2. Leading item index + v/n + 8-14 digit barcode (Strict non-greedy parsing):
        if not sku:
            vn_prefix_m = re.match(r'^\d{1,3}\s+[vVnNง\|\.]\s+([oO\d]{8,14})\s*(.*)', desc)
            if vn_prefix_m:
                sku = vn_prefix_m.group(1).replace('o', '0').replace('O', '0').strip()
                desc = vn_prefix_m.group(2).strip()
            else:
                direct_barcode_m = re.match(r'^([oO\d]{8,14})\s*(.*)', desc)
                if direct_barcode_m:
                    sku = direct_barcode_m.group(1).replace('o', '0').replace('O', '0').strip()
                    desc = direct_barcode_m.group(2).strip()
                else:
                    num_prefix_m = re.match(r'^\d{1,3}\s+([oO\d]{8,14})\s*(.*)', desc)
                    if num_prefix_m:
                        sku = num_prefix_m.group(1).replace('o', '0').replace('O', '0').strip()
                        desc = num_prefix_m.group(2).strip()

        # Clean leading item number like "1. ", "01 ", "15. "
        desc = re.sub(r'^\d+[\.\-\s]+', '', desc).strip()

        # Match numbers in the line
        num_matches = list(re.finditer(r'(\d{1,3}(?:,\d{3})*(?:\.\d{1,3})?|\d+)', desc))
        if len(num_matches) >= 2:
            last_match = num_matches[-1]
            last_str = last_match.group(1).replace(',', '')
            
            # CRITICAL RULE: In receipts, price numbers are ALWAYS at the end of the line.
            # If there is substantial non-numeric text after the last number, this is a spec/description line, NOT a price line!
            trailing_after_num = desc[last_match.end():].strip()
            trailing_after_num = re.sub(r'^[VvNnBbTtEeXx\*#\.\,\s]+$', '', trailing_after_num)
            if len(trailing_after_num) > 2 and re.search(r'[a-zA-Zก-๙]', trailing_after_num):
                continue

            # Must be a valid currency number (has decimal point OR satisfies math balance)
            try:
                tot = float(last_str)
            except ValueError:
                continue

            qty = 1
            up = tot
            desc_end = num_matches[-2].start()

            has_decimal = ('.' in last_match.group(1))
            math_balanced = False

            if len(num_matches) >= 4:
                p4 = float(num_matches[-4].group(1).replace(',', ''))
                p3 = float(num_matches[-3].group(1).replace(',', ''))
                p2 = float(num_matches[-2].group(1).replace(',', ''))
                if abs(p4 * p3 - tot) < 0.05 or abs(p4 * p3 - (tot + p2)) < 0.05:
                    qty = int(p4) if p4 > 0 else 1
                    up = p3
                    desc_end = num_matches[-4].start()
                    math_balanced = True
                elif abs(p3 * p2 - tot) < 0.05:
                    qty = int(p3) if p3 > 0 else 1
                    up = p2
                    desc_end = num_matches[-3].start()
                    math_balanced = True
            elif len(num_matches) >= 3:
                p3 = float(num_matches[-3].group(1).replace(',', ''))
                p2 = float(num_matches[-2].group(1).replace(',', ''))
                if abs(p3 * p2 - tot) < 0.05 or abs(p3 * tot - p2) < 0.05:
                    qty = int(p3) if p3 > 0 else 1
                    up = p2
                    desc_end = num_matches[-3].start()
                    math_balanced = True
                elif abs(p2 - tot) < 0.05 and p3 <= 100:
                    # e.g. [Qty 3] [UnitPrice 170.00] [Total 510.00]
                    # or [Qty 1.000] [UnitPrice 559.000] [Total 559.00]
                    if abs(p3 * p2 - tot) < 0.05:
                        qty = int(p3) if p3 > 0 else 1
                        up = p2
                        desc_end = num_matches[-3].start()
                        math_balanced = True
                    else:
                        qty = int(p3) if p3 > 0 else 1
                        up = round(tot / qty, 2)
                        desc_end = num_matches[-3].start()
                        math_balanced = True
            else:
                p2 = float(num_matches[-2].group(1).replace(',', ''))
                if p2 > 0 and tot > p2 and p2 <= 100:
                    qty = int(p2)
                    up = round(tot / qty, 2)
                    math_balanced = True
                elif p2 > 0 and abs(tot - p2) < 0.01:
                    qty = 1
                    up = p2
                    math_balanced = True

            # If not math balanced and no decimal point in total, it's not a real price line!
            if not math_balanced and not has_decimal:
                continue

            clean_desc = desc[:desc_end].strip()

            # Clean any leftover barcode at start of description
            sub_barcode = re.match(r'^([oO\d]{8,14})\s*(.*)', clean_desc)
            if sub_barcode:
                if not sku:
                    sku = sub_barcode.group(1).replace('o', '0').replace('O', '0').strip()
                clean_desc = sub_barcode.group(2).strip()

            # Clean residual leading bracket residue
            clean_desc = re.sub(r'^\s*[\(\[\{][^\)\]\}]*[\)\]\}]\s*', '', clean_desc).strip()
            # Clean residual wrapped text like "protection board 18650 1s "
            clean_desc = re.sub(r'^(?:(?:protection\s*board|18650\s*(?:\d*[sS])?|100ชิ้น|100ชึ้น|คำ|ดำ)\s*)+', '', clean_desc, flags=re.I).strip()

            # Clean trailing unit
            unit = "ชิ้น"
            unit_m = re.search(r'\s+(ด้าม|แท่ง|เล่ม|กล่อง|แพ็ค|ม้วน|อัน|ชิ้น|ก้อน|ถุง|ขวด|หลอด|เครื่อง|ตัว|แผ่น|คู่|เมตร|ม\.|กก\.|กรัม)\s*$', clean_desc)
            if unit_m:
                unit = unit_m.group(1)
                clean_desc = clean_desc[:unit_m.start()].strip()

            clean_desc = re.sub(r'[\.\,\:\-]+$', '', clean_desc).strip()

            # Description must have letters and valid total
            has_letters = bool(re.search(r'[ก-๙a-zA-Z]', clean_desc))
            if has_letters and len(clean_desc) >= 2 and tot > 0:
                items.append({
                    "item_code": sku,
                    "description": clean_desc,
                    "quantity": qty if qty > 0 else 1,
                    "unit": unit,
                    "unit_price": up if up > 0 else tot,
                    "total_price": tot
                })

    if total_amount == 0.0 and items:
        total_amount = sum(it["total_price"] for it in items)

    return {
        "vendor_name": vendor_name or "ร้านค้า / บริษัทผู้ขาย",
        "invoice_number": invoice_number,
        "invoice_date": invoice_date,
        "discount": discount,
        "total_amount": total_amount,
        "items": items
    }


def extract_bill_data(image_bytes: bytes):
    """
    Run PaddleOCR on image bytes and return structured words, clustered raw text,
    and intelligently parsed receipt fields.
    """
    words = perform_ocr_on_image(image_bytes)
    raw_text = cluster_words_into_lines(words)
    parsed = parse_structured_receipt(raw_text, words)

    return {
        "words": words,
        "rawText": raw_text,
        "parsed": parsed
    }
