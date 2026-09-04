import json
import re

def parse_structured_receipt_v2(raw_text: str):
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
                if not re.search(r'^(?:ESP8266|ESP32)$', cand, re.I):
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
        r'(?:จำนวนเงินรวมทั้งสิ้น|รวมเงินทั้งสิ้น|รวมยอดขาย|ขายสุทธิ|ยอดสุทธิ|รวมเงิน|จำนวนเงินรวม|ยอดชำระ|net\s*total|grand\s*total|total\s*amount)\s*[:#\-]?\s*(\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})',
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

        # 2. Leading item index + v/n + 8-14 digit barcode: 1 v 8858658300827 ... or 6904531006996 ...
        if not sku:
            vn_barcode_m = re.search(r'^(?:\d{1,3}\s*[vVnN]?\s*)?([oO\d]{8,14})\s*(.*)', desc)
            if vn_barcode_m:
                sku = vn_barcode_m.group(1).replace('o', '0').replace('O', '0').strip()
                desc = vn_barcode_m.group(2).strip()

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
            clean_desc = re.sub(r'^(?:protection\s*board|100ชิ้น|100ชึ้น|คำ|ดำ)\s*', '', clean_desc, flags=re.I).strip()

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
                # Deduplicate identical consecutive items if any
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

# Test against raw text of all 3 bills from container log
if __name__ == '__main__':
    with open('/tmp/test_ocr_results.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    for b_idx, item in enumerate(data, 1):
        print(f"\n====================== TESTING BILL {b_idx} ======================")
        parsed = parse_structured_receipt_v2(item['rawText'])
        print(f"Vendor: {parsed['vendor_name']}")
        print(f"Invoice No: {parsed['invoice_number']}")
        print(f"Invoice Date: {parsed['invoice_date']}")
        print(f"Total Amount: {parsed['total_amount']}")
        print(f"Items Count: {len(parsed['items'])}")
        for idx, it in enumerate(parsed['items'], 1):
            print(f"  {idx}. [{it['item_code']}] {it['description']} | Qty: {it['quantity']} {it['unit']} | UnitPrice: {it['unit_price']} | Total: {it['total_price']}")
