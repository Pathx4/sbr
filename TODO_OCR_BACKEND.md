# แผนการทำงานสำหรับ Agent ในอนาคต (TODO: Hugging Face OCR Backend)

## 📌 สถานะปัจจุบัน (Current State)
- **Backend:** โค้ดสำหรับรัน `PaddleOCR` เตรียมพร้อมเรียบร้อยแล้วในโฟลเดอร์ `backend` (ประกอบด้วย `ocr_service.py`, `app.py` `/api/extract-bill`, `requirements.txt`, `Dockerfile`) โค้ดทั้งหมดถูก Push ขึ้น GitHub เรียบร้อย
- **Frontend:** ปัจจุบันระบบ `AutoWordPage.tsx` **ยังคงใช้ Tesseract.js (Offline 2D Spatial Clustering)** เพื่อไม่ให้ระบบเดิมล่มระหว่างรอการตั้งค่าเซิร์ฟเวอร์
- **สิ่งติดขัด (Blocker):** รอ User สมัครใช้งานและตั้งค่า Hugging Face Spaces ให้ดึงโค้ดจาก GitHub ไปรันให้เสร็จสมบูรณ์

## 🚀 สิ่งที่ต้องทำต่อไป (Next Actions for Agent)
เมื่อ User กลับมาพร้อมกับ **"URL ของ Hugging Face Spaces"** สิ่งที่ Agent ต้องทำทันทีคือ:

1. **แก้ไข `AutoWordPage.tsx`:**
   - ค้นหาฟังก์ชัน `handleFileUpload`
   - ลบโค้ดการทำงานของ `Tesseract.js` (`createWorker`) ออก
   - เปลี่ยนเป็นการยิง API (`fetch` หรือ `axios`) นำไฟล์ภาพอัปโหลดไปที่ `[URL_ของ_HUGGING_FACE]/api/extract-bill` ด้วยรูปแบบ `multipart/form-data`
2. **ปรับแต่งการรับค่าใน Frontend:**
   - รับค่า JSON ที่คืนกลับมาจากเซิร์ฟเวอร์ (รูปแบบ `{ "words": [ { "text", "bbox", "confidence" } ] }`)
   - นำค่า `words` ที่ได้ ส่งเข้าไปประมวลผลต่อใน `parseThaiReceiptOcr` (ระบบ 2D Spatial Clustering ของเดิมรองรับการทำงานกับ Bounding Box อยู่แล้ว สามารถต่อกันได้เลย)
3. **ตรวจสอบความปลอดภัย:**
   - ดักจับ Error ในกรณีที่ Hugging Face นอนหลับ (Cold Start หรือ Time out) ให้แจ้งเตือน User ว่าเซิร์ฟเวอร์กำลังตื่น ให้รอสักครู่

*(บันทึกนี้มีไว้เพื่อเตือนความจำ Agent ใน Session ถัดไป ห้ามลบจนกว่าจะเชื่อมต่อ Backend สำเร็จ)*
