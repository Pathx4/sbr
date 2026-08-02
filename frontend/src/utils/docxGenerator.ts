import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  WidthType, AlignmentType
} from 'docx';
import { bahttext } from 'bahttext';

const getBahtText = (amount: number): string => {
  return bahttext(amount);
};

interface Item {
  item_code?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

interface Invoice {
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  discount: number;
  grand_total: number;
  items: Item[];
}

export interface DocxPayload {
  department: string;
  intro_course: string;
  regulatory_text: string;
  requester_name: string;
  requester_position: string;
  requester_date: string;
  approver_name: string;
  approver_position: string;
  approver_date: string;
  invoices: Invoice[];
}

export async function generateWordDocument(data: DocxPayload): Promise<Blob> {
  const FONT_NAME = 'TH SarabunPSK';
  const FONT_SIZE = 32; // 16pt in half-points

  // Flatten all items across invoices
  const allItems: { idx: string; description: string; qty: number; unit: string; unitPrice: number; totalPrice: number }[] = [];
  let counter = 1;

  data.invoices.forEach((inv, invIdx) => {
    inv.items.forEach((item, itemIdx) => {
      const desc = item.item_code ? `${item.item_code} ${item.description}` : item.description;
      allItems.push({
        idx: data.invoices.length > 1 ? `${invIdx + 1}.${itemIdx + 1}` : `${counter++}`,
        description: desc,
        qty: item.quantity,
        unit: item.unit || 'ชิ้น',
        unitPrice: item.unit_price,
        totalPrice: item.total_price
      });
    });
  });

  const grandTotal = data.invoices.reduce((acc, inv) => acc + (inv.grand_total || 0), 0);
  const bahtTextStr = getBahtText(grandTotal);

  // Build Table Rows
  const tableRows: TableRow[] = [
    // Header Row
    new TableRow({
      children: [
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ลำดับ", font: FONT_NAME, size: FONT_SIZE, bold: true })] })]
        }),
        new TableCell({
          width: { size: 45, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "รายการพัสดุ", font: FONT_NAME, size: FONT_SIZE, bold: true })] })]
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "จำนวน", font: FONT_NAME, size: FONT_SIZE, bold: true })] })]
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ราคา/หน่วย (บาท)", font: FONT_NAME, size: FONT_SIZE, bold: true })] })]
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "จำนวนเงิน (บาท)", font: FONT_NAME, size: FONT_SIZE, bold: true })] })]
        })
      ]
    }),
    // Data Rows
    ...allItems.map(item => new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.idx, font: FONT_NAME, size: FONT_SIZE })] })]
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: item.description, font: FONT_NAME, size: FONT_SIZE })] })]
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.qty} ${item.unit}`, font: FONT_NAME, size: FONT_SIZE })] })]
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: item.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 }), font: FONT_NAME, size: FONT_SIZE })] })]
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: item.totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 }), font: FONT_NAME, size: FONT_SIZE })] })]
        })
      ]
    })),
    // Total Row
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `รวมทั้งสิ้น (${bahtTextStr})`, font: FONT_NAME, size: FONT_SIZE, bold: true })] })]
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 }), font: FONT_NAME, size: FONT_SIZE, bold: true })] })]
        })
      ]
    })
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          }
        },
        children: [
          // Header: บันทึกข้อความ
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "บันทึกข้อความ",
                font: FONT_NAME,
                size: 58,
                bold: true
              })
            ]
          }),

          // Header details
          new Paragraph({
            children: [
              new TextRun({ text: "ส่วนราชการ  ", font: FONT_NAME, size: FONT_SIZE, bold: true }),
              new TextRun({ text: data.department || "สำนักบริหารเครือข่ายและสร้างความตระหนัก (สบร.)", font: FONT_NAME, size: FONT_SIZE })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "ที่  ", font: FONT_NAME, size: FONT_SIZE, bold: true }),
              new TextRun({ text: ".........................................................................  ", font: FONT_NAME, size: FONT_SIZE }),
              new TextRun({ text: "วันที่  ", font: FONT_NAME, size: FONT_SIZE, bold: true }),
              new TextRun({ text: "...........................................................", font: FONT_NAME, size: FONT_SIZE })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "เรื่อง  ", font: FONT_NAME, size: FONT_SIZE, bold: true }),
              new TextRun({ text: `รายงานขอความเห็นชอบจัดซื้อจัดจ้างพัสดุ ${data.intro_course}`, font: FONT_NAME, size: FONT_SIZE })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "เรียน  ", font: FONT_NAME, size: FONT_SIZE, bold: true }),
              new TextRun({ text: `ผู้อำนวยการ${data.department || 'สบร.'}`, font: FONT_NAME, size: FONT_SIZE })
            ]
          }),

          new Paragraph({ text: "" }),

          // Paragraph 1: Intro
          new Paragraph({
            indent: { firstLine: 720 },
            children: [
              new TextRun({
                text: `ด้วย ${data.department || 'สบร.'} ได้ดำเนินการ${data.intro_course} และมีความจำเป็นต้องจัดซื้อพัสดุอุปกรณ์เพื่อใช้ในการดำเนินงานดังกล่าว รวมเป็นเงินทั้งสิ้น ${grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท (${bahtTextStr}) โดยมีรายละเอียดดังต่อไปนี้`,
                font: FONT_NAME,
                size: FONT_SIZE
              })
            ]
          }),

          new Paragraph({ text: "" }),

          // Items Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows
          }),

          new Paragraph({ text: "" }),

          // Paragraph 2: Regulations
          new Paragraph({
            indent: { firstLine: 720 },
            children: [
              new TextRun({
                text: `ในการนี้ เพื่อให้การดำเนินการดังกล่าวเป็นไปด้วยความเรียบร้อยและถูกต้องตาม ${data.regulatory_text} จึงใคร่ขอความเห็นชอบจัดซื้อพัสดุดังกล่าวข้างต้น`,
                font: FONT_NAME,
                size: FONT_SIZE
              })
            ]
          }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),

          // Sign Block: Requester
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: "ลงชื่อ.........................................................................ผู้ขออนุมัติ\n", font: FONT_NAME, size: FONT_SIZE }),
              new TextRun({ text: `( ${data.requester_name || '...................................................'} )\n`, font: FONT_NAME, size: FONT_SIZE }),
              new TextRun({ text: `ตำแหน่ง ${data.requester_position || 'เจ้าหน้าที่ผู้รับผิดชอบ'}\n`, font: FONT_NAME, size: FONT_SIZE }),
              new TextRun({ text: `วันที่ ${data.requester_date || '   /            / 2568'}\n`, font: FONT_NAME, size: FONT_SIZE })
            ]
          }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),

          // Sign Block: Approver
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: "ลงชื่อ.........................................................................ผู้ลงนามอนุมัติ\n", font: FONT_NAME, size: FONT_SIZE }),
              new TextRun({ text: `( ${data.approver_name || '...................................................'} )\n`, font: FONT_NAME, size: FONT_SIZE }),
              new TextRun({ text: `ตำแหน่ง ${data.approver_position || 'ผอ.สคร.'}\n`, font: FONT_NAME, size: FONT_SIZE }),
              new TextRun({ text: `วันที่ ${data.approver_date || '   /            / 2568'}\n`, font: FONT_NAME, size: FONT_SIZE })
            ]
          })
        ]
      }
    ]
  });

  return await Packer.toBlob(doc);
}
