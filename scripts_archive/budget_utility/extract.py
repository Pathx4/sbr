import os
from pypdf import PdfReader

def extract_text(pdf_path, out_path):
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(text)

files = [
    "1764840888_7048.pdf",
    "1766118249_3084.pdf",
    "ระเบียบ สทอภ. ว่าด้วยคชจ.ในการฝึกอบรม การจัดงาน และการประชุม พ.ศ. 2554.pdf",
    "ระเบียบ สทอภ. ว่าด้วยค่าใช้จ่ายในการฝึกอบรม การจัดงาน และการประชุม (ฉบับที่ 2) พ.ศ. 2556.pdf"
]

for file in files:
    if os.path.exists(file):
        extract_text(file, file + ".txt")
print("Done")
