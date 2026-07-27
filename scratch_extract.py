def extract_bill():
    provider = request.form.get('provider', 'gemini')
    api_key = request.headers.get('Authorization')
    if api_key and api_key.startswith('Bearer '):
        api_key = api_key[len('Bearer '):]
    
    if not api_key:
        api_key = request.form.get('api_key')
        
    if not api_key:
        api_key = HARDCODED_API_KEY
        if api_key and api_key.startswith('gsk_'):
            provider = 'groq'
        elif api_key and api_key.startswith('sk-'):
            provider = 'openai'
            
    if not api_key:
        return jsonify({"error": "API Key is required"}), 400
        
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
        
    mime_type = file.content_type or "image/jpeg"
    
    prompt = """
    คุณคือผู้เชี่ยวชาญด้านการถอดข้อมูลบิลและใบเสร็จ (OCR & Receipt Parsing Specialist)
    หน้าที่ของคุณคือการวิเคราะห์ภาพถ่ายบิล/ใบเสร็จนี้อย่างแม่นยำ และแปลงข้อมูลเป็น JSON ตามโครงสร้างที่กำหนด
    
    คำแนะนำที่ต้องปฏิบัติตามอย่างเคร่งครัด:
    1. **ชื่อร้านค้า/บริษัทผู้ขาย (vendor_name)**: 
       - ต้องเป็นชื่อของห้างร้านหรือบริษัทที่ออกเอกสารนี้ (เช่น "บริษัท ไอที ซิตี้ (มหาชน)", "บริษัท ซีโอแอล จำกัด (มหาชน)") ซึ่งมักจะอยู่ด้านบนสุดของบิล
       - ห้ามสับสนกับชื่อผู้ซื้อ (เช่น "สำนักงาน...", "สคร.") หรือชื่อสินค้าเด็ดขาด!
       - หากชื่อร้านเป็นภาษาไทย ให้ใช้ภาษาไทย
    2. **เลขที่เอกสาร/ใบเสร็จ (invoice_number)**:
       - มองหาคำว่า "เลขที่", "เลขที่ใบเสร็จ", "เลขที่ใบกำกับภาษี", "Invoice No.", "Receipt No.", "Tax Invoice No.", "Doc No."
       - ห้ามใช้เลขประจำตัวผู้เสียภาษี (Tax ID ซึ่งเป็นเลข 13 หลัก) หรือเลขที่สาขา มาเป็นเลขที่เอกสารเด็ดขาด!
    3. **วันที่เอกสาร (invoice_date)**:
       - ต้องแปลงเป็นฟอร์แมตภาษาไทย เช่น "28 ตุลาคม 2567" หรือ "9 มิถุนายน 2569" 
       - หากบิลระบุปีคริสตศักราช (ค.ศ. เช่น 2024, 2025, 2026) ต้องแปลงเป็นปีพุทธศักราช (พ.ศ. โดยบวก 543 เช่น 2024 -> 2567, 2026 -> 2569)
    4. **ประเภทเอกสาร (doc_type)**:
       - ตรวจสอบและระบุประเภทเอกสารตามที่ปรากฏบนหัวเอกสาร เช่น "ใบเสร็จรับเงิน", "ใบกำกับภาษี", "ใบเสร็จรับเงิน/ใบกำกับภาษี", "บิลเงินสด" หรือคำระบุประเภทเอกสารอื่นๆ
       - หากไม่แน่ใจหรือไม่มีระบุไว้ให้ใช้ "ใบเสร็จรับเงิน/ใบกำกับภาษี" เป็นค่าเริ่มต้น
    5. **รายการสินค้า (items)**:
       - ดึงรายการสินค้าทั้งหมดออกมาในรูปแบบอาร์เรย์
       - **รหัสสินค้า (item_code)**: หากมีรหัสสินค้า (SKU, Barcode, Product Code เช่น MS4-000939 หรือเลขบาร์โค้ด) ให้ดึงมาใส่ในฟิลด์นี้ หากไม่มีให้ใส่ null
       - **รายละเอียดสินค้า (description)**: ต้องเป็นชื่อสินค้าและรายละเอียดพัสดุ (เช่น "SANDISK SDSSDE30 Portable SSD 1TB") ห้ามมีชื่อร้านค้าหรือคำอื่นๆ ที่ไม่ใช่ชื่อสินค้าปนมาเด็ดขาด!
       - **จำนวน (quantity)**: ต้องเป็นจำนวนชิ้น (จำนวนเต็ม)
       - **ราคาต่อหน่วย (unit_price)**: ราคาต่อหน่วยก่อนหักส่วนลด (ทศนิยม)
       - **ราคารวม (total_price)**: ราคารวมของรายการนั้น (quantity * unit_price)
       - **ความถูกต้องของตัวเลข**: ตรวจสอบคำนวณทางคณิตศาสตร์ให้ถูกต้องเสมอ!
    6. **ส่วนลด (discount)**:
       - ยอดส่วนลดรวมท้ายบิล (ถ้ามี) หากไม่มีให้ใส่ 0.0
    7. **ยอดเงินรวมทั้งสิ้น (grand_total)**:
       - ยอดเงินสุทธิรวมที่ต้องจ่ายจริงท้ายบิล ตรวจสอบให้มั่นใจว่าตัวเลขราคาและยอดรวมถูกต้องตรงตามใบเสร็จ
    """
    
    try:
        if provider == 'openai':
            # Read file bytes for base64 encoding
            file.stream.seek(0)
            img_bytes = file.stream.read()
            response_text = call_openai_with_retries(api_key, img_bytes, prompt, mime_type=mime_type)
            return response_text, 200, {'Content-Type': 'application/json'}
        elif provider == 'groq':
            # Read file bytes for base64 encoding
            file.stream.seek(0)
            img_bytes = file.stream.read()
            response_text = call_groq_with_retries(api_key, img_bytes, prompt, mime_type=mime_type)
            return response_text, 200, {'Content-Type': 'application/json'}
        else:
            # Default to Gemini
            img = Image.open(file.stream)
            client = genai.Client(api_key=api_key)
            response_text = call_gemini_with_retries(client, img, prompt, schema=BillExtraction)
            return response_text, 200, {'Content-Type': 'application/json'}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        err_msg = str(e)
        tip_msg = ""
        if provider == 'gemini':
            if "NOT_FOUND" in err_msg or "not found" in err_msg.lower() or "404" in err_msg:
                tip_msg = "\n\n💡 Tip: This usually means the Generative Language API is not enabled for your project, or your API key is invalid. Please create a key from Google AI Studio (https://aistudio.google.com/) and try again."
        elif provider == 'openai':
            tip_msg = "\n\n💡 Tip: Please verify that your OpenAI API key is correct, has credits available, and the OpenAI service is online."
        elif provider == 'groq':
            tip_msg = "\n\n💡 Tip: Please verify that your Groq API key is correct and you have not exceeded your Groq rate limits. Check console.groq.com."
            
        return jsonify({"error": f"Failed during bill extraction: {err_msg}{tip_msg}"}), 500