# 📋 บันทึกการ Deploy ระบบ SBR (Unified Tools) บน Windows Server ด้วย Docker

**ถึง:** คุณธนากร (Thanakorn)  
**เรื่อง:** สรุปแนวทางการรันระบบ SBR ด้วย Docker โดยไม่ต้องเปิดพอร์ตบนเครื่อง Server (Zero-Port Deployment)  
**วันที่:** 4 กันยายน 2026  

---

## 📌 1. ที่มาและปัญหาปัจจุบัน (Problem & Background)

* ปัจจุบันระบบ SBR ถูก Deploy อยู่บน **GitHub Pages** ซึ่งทำหน้าที่เป็นเพียง Static Web (ไม่มีระบบ Backend)
* **ปัญหาที่พบ:** ฟังก์ชันการอ่านใบเสร็จและบิลจัดซื้อ (Auto-Word) จำเป็นต้องรัน OCR ด้วย `Tesseract.js` บนเบราว์เซอร์ของผู้ใช้งานเอง ส่งผลให้:
  1. การประมวลผลช้ามากและกินทรัพยากรเครื่องผู้ใช้จนเบราว์เซอร์ค้าง
  2. ความแม่นยำของภาษาไทย โครงสร้างตาราง และตัวเลขยอดเงินยังไม่ดีเท่าที่ควร
* **สิ่งที่มีอยู่แล้ว:** ในโฟลเดอร์ `backend/` มีโค้ดของ **PaddleOCR** (โมเดล Deep Learning สำหรับ OCR ภาษาไทยที่มีความแม่นยำสูงมาก) พร้อมระบบสร้างเอกสาร Word/Excel และค้นหาบุคลากร สทอภ. อยู่แล้ว จึงต้องการนำระบบทั้งหมดขึ้นมารันบน **Windows Server** เพื่อให้การทำงานมีประสิทธิภาพสูงสุด

---

## 🛡️ 2. โจทย์และข้อจำกัดของ Windows Server

1. เครื่อง Windows Server รันบริการต่างๆ ด้วย **Docker** เป็นหลักอยู่แล้ว
2. **ข้อจำกัดสำคัญ:** ไม่มีพอร์ตภายนอก (Public/Host Port) เหลือให้ใช้งานแล้ว และ**ไม่ต้องการทำเรื่องขอเปิดพอร์ตกับฝ่าย IT/Network** เพราะมีขั้นตอนซับซ้อนและใช้เวลานาน
3. ระบบต้องสามารถเข้าใช้งานได้จากทุกที่ (ทั้งคอมพิวเตอร์ในออฟฟิศ, เน็ตบ้าน หรือมือถือ) โดยมีระบบ Login ควบคุมสิทธิ์อยู่แล้ว

---

## 💡 3. สถาปัตยกรรมที่ออกแบบ: Zero-Port Deployment

เราแก้ปัญหาด้วยการใช้ **Docker Compose** ร่วมกับ **Cloudflare Tunnel (`cloudflared`)** โดยมีหลักการทำงานดังนี้:

```
[ ผู้ใช้งานจากอินเทอร์เน็ต / ออฟฟิศ ]
                 │ (เข้าผ่าน HTTPS)
                 ▼
     [ Cloudflare Edge Network ]
                 ▲
                 │ (ต่อท่อเสมือน Outbound Connection ทะลุ Firewall ได้ 100%)
═════════════════╪═════════════════════════════════════════════════════════════════
 [ Windows Server Host ] ─── ไม่ต้องเปิดพอร์ตบนเครื่อง Host เลย! (0 Port Used)
   │
   └── [ Docker Bridge Network (วงแลนปิดภายใน Docker) ]
         │
         ├── 1. Container: "tunnel" (cloudflare/cloudflared)
         │       └── ยิงท่อออกไปหา Cloudflare และรอรับ Request
         │               │
         │               └── ส่งต่อข้อมูลผ่านวงแลนภายใน Docker
         │                       │
         └── 2. Container: "app" (sbr-app)
                 ├── ทำหน้าที่ Serve หน้าเว็บ React (Frontend)
                 ├── รัน API Flask + PaddleOCR ภาษาไทยความแม่นยำสูง
                 └── ให้บริการที่พอร์ต 7860 (เฉพาะในวง Docker ไม่หลุดมาที่ Host)
```

### ทำไมวิธีนี้ถึงไม่ชนกับ Container อื่นในเซิร์ฟเวอร์?
* ในไฟล์ `docker-compose.yml` **ไม่มีการใส่ `ports:` mapping สู่ Host Windows Server** เลยแม้แต่พอร์ตเดียว
* พอร์ต `7860` ของแอปจะอยู่เฉพาะในวงแลนเสมือน (Bridge Network) ของ Docker เท่านั้น
* Container `tunnel` ใช้วิธี **"โทรออก (Outbound)"** ผ่านพอร์ต 443 ธรรมดาออกไปหา Cloudflare ไม่ใช่การเปิดรับคำขอเข้า (Inbound) จึง**ไม่ติด Firewall และไม่ต้องขอ Forward Port จากฝ่าย IT เลย**

---

## 🚀 4. ขั้นตอนการนำไปรันบน Windows Server (How to Deploy)

สิ่งที่ต้องทำบน Windows Server มีเพียง **2 คำสั่ง** เท่านั้นครับ:

### ขั้นตอนที่ 1: ดึงโค้ดและสั่งรัน Container
เปิด Command Prompt หรือ PowerShell ในโฟลเดอร์โปรเจกต์ `sbr` แล้วรัน:
```bash
docker compose up -d --build
```
> *Docker จะทำการ Build หน้าเว็บ Frontend (React/Vite) และ Backend (Python 3.10 + PaddleOCR + OpenCV) ให้โดยอัตโนมัติผ่าน Multi-Stage Build ใน `Dockerfile`*

### ขั้นตอนที่ 2: ดู URL สำหรับเข้าใช้งาน
เมื่อ Container เริ่มทำงาน ให้รันคำสั่ง:
```bash
docker compose logs -f tunnel
```
บนหน้าจอจะแสดงข้อความพร้อม URL ชั่วคราว (Quick Tunnel) เช่น:
```text
2026-09-04T... INF +--------------------------------------------------------------------------------------------+
2026-09-04T... INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
2026-09-04T... INF |  https://xxxx-xxxx-xxxx.trycloudflare.com                                                  |
2026-09-04T... INF +--------------------------------------------------------------------------------------------+
```
👉 **สามารถนำ URL `https://xxxx.trycloudflare.com` นี้ไปเปิดบนเบราว์เซอร์ เข้าใช้งานระบบได้ทันทีครับ!**

---

## 🌐 5. (ทางเลือก) การตั้งค่าชื่อโดเมนถาวร (Permanent Named Tunnel)

หากต้องการให้ URL คงที่ตลอดไป (เช่น `sbr.yourdomain.com`) ไม่เปลี่ยนทุกครั้งที่ Restart container สามารถทำได้ง่ายๆ ฟรีผ่าน **Cloudflare Zero Trust**:

1. ล็อกอินเข้า [Cloudflare Dashboard](https://dash.cloudflare.com/) -> ไปที่เมนู **Networks** -> **Tunnels**
2. กด **Create a Tunnel** -> เลือกประเภท **Cloudflared** และตั้งชื่อ Tunnel
3. Cloudflare จะให้ `Tunnel Token` มา (เป็นสตริงยาวๆ เช่น `eyJh...`)
4. ให้แก้ไขไฟล์ `docker-compose.yml` ในส่วนของ service `tunnel` ดังนี้:
   ```yaml
   tunnel:
     image: cloudflare/cloudflared:latest
     command: tunnel --no-autoupdate run --token <วาง_TOKEN_ของคุณที่นี่>
     restart: unless-stopped
     depends_on:
       - app
   ```
5. ในหน้าเว็บ Cloudflare เมนู Public Hostname ให้ชี้ Subdomain นั้นไปที่:
   * **Service:** `HTTP`
   * **URL:** `app:7860`
6. สั่ง `docker compose up -d` อีกครั้ง ลิงก์จะเป็นชื่อโดเมนถาวรทันที

---

## 🛠️ 6. คำสั่งที่มีประโยชน์สำหรับการดูแลระบบ (Useful Commands)

* **ดูสถานะ Container ทั้งหมด:**
  ```bash
  docker compose ps
  ```
* **ดู Log การทำงานของแอปและ OCR:**
  ```bash
  docker compose logs -f app
  ```
* **สั่ง Restart ระบบ:**
  ```bash
  docker compose restart
  ```
* **สั่งหยุดการทำงานทั้งหมด:**
  ```bash
  docker compose down
  ```

---

## 📂 7. ไฟล์สำคัญที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
| :--- | :--- |
| `Dockerfile` | สคริปต์ Multi-Stage Build (Stage 1: Node 20 Build React, Stage 2: Python 3.10 ติดตั้ง PaddleOCR + OpenCV + Gunicorn) |
| `docker-compose.yml` | กำหนดการรัน service `app` และ `tunnel` เชื่อมโยงกันผ่านเครือข่ายภายในของ Docker โดยไม่ผูกพอร์ตกับ Host |
| `backend/app.py` | Flask API รองรับ `/api/extract-bill` (PaddleOCR), จัดการไฟล์ Excel/Word และทำหน้าที่ Serve Frontend SPA ในตัว |
| `backend/ocr_service.py` | โมดูลประมวลผล PaddleOCR ภาษาไทยและจัดโครงสร้าง Bounding Box |
| `backend/requirements.txt` | รายการ Python dependencies (PaddlePaddle, PaddleOCR, Flask, OpenPyXL, Docx ฯลฯ) |

---
*หากมีข้อสงสัยหรือติดขัดในขั้นตอนใด สามารถประสานงานพูดคุยกันได้เลยครับ ขอบคุณมากครับ!*
