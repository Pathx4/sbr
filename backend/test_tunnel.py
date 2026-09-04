import urllib.request
import json
import uuid
import sys

sys.stdout.reconfigure(encoding='utf-8')

base_url = 'https://exactly-teeth-webster-item.trycloudflare.com'

# 1. Login to get token
login_req = urllib.request.Request(
    f"{base_url}/api/auth/login",
    data=json.dumps({"email": "pakimthamthung@gmail.com", "password": "gistda2026"}).encode('utf-8'),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(login_req, timeout=30) as resp:
    login_data = json.loads(resp.read().decode('utf-8'))
    token = login_data['token']
    print(f"Logged in successfully! User: {login_data['user']['name']}", flush=True)

# 2. Test authenticated OCR extraction on sample bill
sample_path = r'd:\SBR V 1\frontend\Bill\S__30916611.jpg'
with open(sample_path, 'rb') as f:
    file_bytes = f.read()

boundary = '----WebKitFormBoundary' + uuid.uuid4().hex
body = []
body.append(f'--{boundary}'.encode('utf-8'))
body.append(b'Content-Disposition: form-data; name="file"; filename="bill.jpg"')
body.append(b'Content-Type: image/jpeg\r\n')
body.append(file_bytes)
body.append(f'--{boundary}--\r\n'.encode('utf-8'))
payload = b'\r\n'.join(body[:3]) + b'\r\n' + body[3] + b'\r\n' + body[4]

req = urllib.request.Request(f"{base_url}/api/extract-bill", data=payload)
req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
req.add_header('Authorization', f'Bearer {token}')
req.add_header('User-Agent', 'Mozilla/5.0')

print("\nSending receipt to PaddleOCR on server...", flush=True)
with urllib.request.urlopen(req, timeout=90) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    p = data.get('parsed', {})
    print(f"Status: {resp.status}", flush=True)
    print(f"Vendor: {p.get('vendor_name')}", flush=True)
    print(f"Invoice No: {p.get('invoice_number')}", flush=True)
    print(f"Total Amount: {p.get('total_amount')}", flush=True)
    print(f"Items Count: {len(p.get('items', []))}", flush=True)
    for idx, it in enumerate(p.get('items', []), 1):
        print(f"  {idx:2d}. [{it.get('item_code')}] {it.get('description')} | Qty: {it.get('quantity')} {it.get('unit')} | Price: {it.get('unit_price')} | Total: {it.get('total_price')}", flush=True)
