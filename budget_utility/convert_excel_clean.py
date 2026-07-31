import pandas as pd
import json

df = pd.read_excel('รายชื่อติดต่อบุคลากรภายใน สทอภ. ตามโครงสร.xlsx', header=None)

# Let's inspect the data and extract valid names
# Assuming names are in column 0 and titles are in column 1
# We skip rows that look like headers (e.g. "กลุ่มอำนวยการ" without a name)

executives = []
for index, row in df.iterrows():
    name = str(row[0]).strip()
    title = str(row[1]).strip()
    
    # Filter out empty names, NaN, or obvious headers
    if name and name != 'nan' and name != 'กลุ่มอำนวยการ' and 'ชื่อ-นามสกุล' not in name:
        # Some rows might just be section headers in column 0, usually title is empty for headers
        # or title is something valid. We'll include if it looks like a person.
        if "(เดียว)" in name or "ดร." in name or "นาย" in name or "นาง" in name or "น.ส." in name:
            executives.append({"name": name, "title": title if title != 'nan' else ''})

# Save to src/data/personnel.json
with open('../../frontend/src/data/personnel.json', 'w', encoding='utf-8') as f:
    json.dump(executives, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(executives)} executives.")
