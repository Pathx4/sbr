import pandas as pd
import json

df = pd.read_excel('รายชื่อติดต่อบุคลากรภายใน สทอภ. ตามโครงสร.xlsx', header=None)

executives = []
for index, row in df.iterrows():
    name = str(row[0]).strip()
    title = str(row[1]).strip()
    
    if name and name != 'nan' and name != 'กลุ่มอำนวยการ' and 'ชื่อ-นามสกุล' not in name:
        if "(เดียว)" in name or "ดร." in name or "นาย" in name or "นาง" in name or "น.ส." in name:
            executives.append({"name": name, "title": title if title != 'nan' else ''})

with open('../../frontend/src/data/personnel.json', 'w', encoding='utf-8') as f:
    json.dump(executives, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(executives)} executives and exported to ../../frontend/src/data/personnel.json")
