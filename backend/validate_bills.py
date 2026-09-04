import sys
sys.path.insert(0, '/app')
from ocr_service import extract_bill_data

for b in ['/tmp/bill1.jpg', '/tmp/bill2.jpg', '/tmp/bill3.jpg']:
    with open(b, 'rb') as f:
        res = extract_bill_data(f.read())
    p = res['parsed']
    print(f"\n==================== {b} ====================")
    print(f"Vendor:       {p['vendor_name']}")
    print(f"Invoice No:   {p['invoice_number']}")
    print(f"Invoice Date: {p['invoice_date']}")
    print(f"Total Amount: {p['total_amount']}")
    print(f"Discount:     {p['discount']}")
    print(f"Items Count:  {len(p['items'])}")
    for idx, it in enumerate(p['items'], 1):
        print(f"  {idx:2d}. [{it['item_code']}] {it['description']} | Qty: {it['quantity']} {it['unit']} | Price: {it['unit_price']} | Total: {it['total_price']}")
