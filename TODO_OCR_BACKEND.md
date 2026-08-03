# แผนการทำงานสำหรับ Agent ในอนาคต (TODO: Hugging Face OCR Backend)

## 📌 สถานะปัจจุบัน (Current State)
- **Backend:** โค้ดสำหรับรัน `PaddleOCR` เตรียมพร้อมเรียบร้อยแล้วในโฟลเดอร์ `backend` (ประกอบด้วย `ocr_service.py`, `app.py` `/api/extract-bill`, `requirements.txt`, `Dockerfile`) โค้ดทั้งหมดถูก Push ขึ้น GitHub เรียบร้อย
- **Frontend:** ปัจจุบันระบบ `AutoWordPage.tsx` **ยังคงใช้ Tesseract.js (Offline 2D Spatial Clustering)** เพื่อไม่ให้ระบบเดิมล่มระหว่างรอการตั้งค่าเซิร์ฟเวอร์
- **สิ่งติดขัด (Blocker):** รอ User สมัครใช้งานและตั้งค่า Hugging Face Spaces ให้ดึงโค้ดจาก GitHub ไปรันให้เสร็จสมบูรณ์

## 🚀 สิ่งที่ต้องทำต่อไป (Next Actions for Agent)
**(อัปเดตล่าสุด: โค้ดฝั่ง Frontend และระบบ Fallback เตรียมพร้อมเสร็จสมบูรณ์แล้วใน `AutoWordPage.tsx` ไม่ต้องแก้โค้ดเพิ่มแล้ว! 🎉)**

สิ่งที่ Agent ในอนาคตต้องทำเมื่อ User ไปที่คอมพิวเตอร์ที่ทำงานคือ **ไกด์ให้ User รันเซิร์ฟเวอร์** ดังนี้:

1. ให้นำทาง User ไปที่โฟลเดอร์ `backend`
2. ไกด์ให้ User ติดตั้งไลบรารีและรันเซิร์ฟเวอร์ (ถ้ายังไม่เคยรัน):
   - `pip install -r requirements.txt` (อาจต้องใช้เวลาและต้องมี C++ Build tools ถ้ายังไม่เคยลง PaddleOCR)
   - `flask run --port=5000`
3. ไกด์ให้เปิด Command Prompt อีกจอแล้วรัน Cloudflare Tunnel:
   - `cloudflared tunnel --url http://localhost:5000`
4. เมื่อได้ URL `https://xxxx.trycloudflare.com` มาแล้ว ให้บอก User ว่า **ให้นำ URL นี้ไปกรอกในช่องตั้งค่า (ไอคอนฟันเฟือง ⚙️) บนหน้าเว็บได้เลย** 

*(บันทึกนี้มีไว้เพื่อเตือนความจำ Agent ใน Session ถัดไป ห้ามลบจนกว่าจะแน่ใจว่าระบบทำงานได้สมบูรณ์แล้ว)*
