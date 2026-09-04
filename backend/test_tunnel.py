import urllib.request
import json
import uuid

url = 'https://store-baseball-recording-look.trycloudflare.com/api/extract-bill'

for sample_path in [
    r'd:\SBR V 1\frontend\Bill\S__30916611.jpg',
    r'd:\SBR V 1\frontend\Bill\S__30949380_0.jpg',
    r'd:\SBR V 1\frontend\Bill\S__30949381_0.jpg'
]:
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

    req = urllib.request.Request(url, data=payload)
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    req.add_header('User-Agent', 'Mozilla/5.0')

    with urllib.request.urlopen(req, timeout=90) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        p = data.get('parsed', {})
        fname = sample_path.replace('\\', '/').split('/')[-1]
        print(f"\n==================== {fname} ====================")
        print(f"Status: {resp.status}")
        print(f"Vendor: {p.get('vendor_name')}")
        print(f"Invoice No: {p.get('invoice_number')}")
        print(f"Invoice Date: {p.get('invoice_date')}")
        print(f"Total Amount: {p.get('total_amount')}")
        print(f"Items Count: {len(p.get('items', []))}")
        for idx, it in enumerate(p.get('items', []), 1):
            print(f"  {idx:2d}. [{it.get('item_code')}] {it.get('description')} | Qty: {it.get('quantity')} {it.get('unit')} | Price: {it.get('unit_price')} | Total: {it.get('total_price')}")
