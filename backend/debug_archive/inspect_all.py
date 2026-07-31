import docx
from docx.oxml.ns import qn

doc = docx.Document(r"d:\AutoWord\แบบฟอร์ม รายงานขอความเห็นชอบซื้อจ้าง.docx")
with open("inspect_all_p.txt", "w", encoding="utf-8") as f:
    for i, p in enumerate(doc.paragraphs):
        f.write(f"Paragraph {i}: {repr(p.text[:60])}\n")
        
        # Check paragraph properties
        pPr = p._p.get_or_add_pPr()
        jc = pPr.find(qn('w:jc'))
        if jc is not None:
            f.write(f"  Paragraph Alignment (jc): {jc.get(qn('w:val'))}\n")
            
        spacing = pPr.find(qn('w:spacing'))
        if spacing is not None:
            line = spacing.get(qn('w:line'))
            line_rule = spacing.get(qn('w:lineRule'))
            before = spacing.get(qn('w:before'))
            after = spacing.get(qn('w:after'))
            f.write(f"  Paragraph Spacing: line={line}, lineRule={line_rule}, before={before}, after={after}\n")
            
        ind = pPr.find(qn('w:ind'))
        if ind is not None:
            left = ind.get(qn('w:left'))
            first_line = ind.get(qn('w:firstLine'))
            f.write(f"  Paragraph Indents: left={left}, firstLine={first_line}\n")
            
        # Check run properties
        for r_idx, r in enumerate(p.runs):
            rPr = r._r.get_or_add_rPr()
            rSpacing = rPr.find(qn('w:spacing'))
            rSpacing_val = rSpacing.get(qn('w:val')) if rSpacing is not None else 'None'
            
            rFonts = rPr.find(qn('w:rFonts'))
            ascii_f = rFonts.get(qn('w:ascii')) if rFonts is not None else 'None'
            cs_f = rFonts.get(qn('w:cs')) if rFonts is not None else 'None'
            
            u = rPr.find(qn('w:u'))
            u_val = u.get(qn('w:val')) if u is not None else 'None'
            
            sz = rPr.find(qn('w:sz'))
            sz_val = sz.get(qn('w:val')) if sz is not None else 'None'
            
            bold = rPr.find(qn('w:b')) is not None
            bold_cs = rPr.find(qn('w:bCs')) is not None
            
            f.write(f"  Run {r_idx}: text={repr(r.text[:30])}, font={ascii_f}/{cs_f}, size={sz_val}, spacing={rSpacing_val}, underline={u_val}, bold={bold}/{bold_cs}\n")
        f.write("-" * 50 + "\n")
print("inspect_all_p.txt created.")
