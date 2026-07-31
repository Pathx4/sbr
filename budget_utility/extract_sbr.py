import pandas as pd
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

xl = pd.ExcelFile('รายชื่อติดต่อบุคลากรภายใน สทอภ. ตามโครงสร.xlsx')
sbr_staff = []

print("Sheets:", xl.sheet_names)

for sheet in xl.sheet_names:
    if "สบร" in sheet or "สบร." in sheet or "สถาบัน" in sheet:
        df = pd.read_excel(xl, sheet, header=None)
        
        for index, row in df.iterrows():
            name = str(row[0]).strip()
            title = str(row[1]).strip() if len(row) > 1 else ""
            
            if name and name != 'nan' and 'ชื่อ-นามสกุล' not in name:
                if "นาย" in name or "นาง" in name or "น.ส." in name or "ดร." in name:
                    gender = 'M'
                    if "นาง" in name or "น.ส." in name:
                        gender = 'F'
                    
                    sbr_staff.append({
                        "name": name,
                        "title": title if title != 'nan' else '',
                        "gender": gender
                    })

print(f"Found {len(sbr_staff)} staff.")

with open('../../frontend/src/data/staff_sbr.json', 'w', encoding='utf-8') as f:
    json.dump(sbr_staff, f, ensure_ascii=False, indent=2)

