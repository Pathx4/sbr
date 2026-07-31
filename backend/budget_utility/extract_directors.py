import pandas as pd
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

xl = pd.ExcelFile('รายชื่อติดต่อบุคลากรภายใน สทอภ. ตามโครงสร.xlsx')
directors = []

print("Sheets:", xl.sheet_names)

for sheet in xl.sheet_names:
    df = pd.read_excel(xl, sheet, header=None)
    
    for index, row in df.iterrows():
        name = str(row[0]).strip() if len(row) > 0 else ""
        title = str(row[1]).strip() if len(row) > 1 else ""
        
        if name and name != 'nan' and 'ชื่อ-นามสกุล' not in name:
            if ("ผู้อำนวยการ" in title or "ผู้อำนวยการ" in name) and "(" in name and ")" in name:
                if not any(x in name for x in ["สำนักงาน", "ฝ่าย", "Office", "Division"]):
                    gender = 'M'
                    if "นาง" in name or "น.ส." in name:
                        gender = 'F'
                    
                    directors.append({
                        "name": name,
                        "title": title if title != 'nan' else 'ผู้อำนวยการสำนัก',
                        "gender": gender,
                        "sheet": sheet
                    })

print(f"Found {len(directors)} directors.")
for d in directors:
    print(f"Name: {d['name']}, Title: {d['title']} (Sheet: {d['sheet']})")

with open('../../frontend/src/data/directors.json', 'w', encoding='utf-8') as f:
    json.dump(directors, f, ensure_ascii=False, indent=2)
