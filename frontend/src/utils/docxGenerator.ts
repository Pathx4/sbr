import { 
  Document, Packer, Paragraph, TextRun, 
  AlignmentType
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
  requester_date?: string;
  approver_name: string;
  approver_position: string;
  approver_date?: string;
  invoices: Invoice[];
}

/**
 * Formats price number to Thai comma style string (e.g. 1,580.00 or 98)
 */
function formatPrice(val: number): string {
  if (val % 1 === 0) {
    return val.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } else {
    return val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

/**
 * Formats vendor name with 'จาก' / 'จากบริษัท' prefix cleanly without duplicate 'บริษัท'
 */
function formatVendorWithPrefix(vendor: string): string {
  if (!vendor) return '';
  const trimmed = vendor.trim();
  if (
    trimmed.startsWith('บริษัท') ||
    trimmed.startsWith('ร้าน') ||
    trimmed.startsWith('ห้างหุ้นส่วน') ||
    trimmed.startsWith('หจก.') ||
    trimmed.startsWith('บจก.')
  ) {
    return `จาก${trimmed}`;
  }
  return `จากบริษัท ${trimmed}`;
}

/**
 * Generates Official Thai Government Memo Document (.docx) matching the exact template layout
 */
export async function generateWordDocument(data: DocxPayload): Promise<Blob> {
  const FONT_NAME = 'TH SarabunPSK';
  const FONT_SIZE = 32; // 16pt in half-points

  // Flatten all items across invoices
  const flatItems: {
    idx: number;
    code: string;
    description: string;
    qty: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    vendor: string;
    invNum: string;
    invDate: string;
    invoiceIdx: number;
  }[] = [];

  const invoiceRanges: {
    invoiceIdx: number;
    start: number;
    end: number;
    subtotal: number;
    discount: number;
    grandTotal: number;
  }[] = [];

  let globalCounter = 1;

  data.invoices.forEach((inv, invIdx) => {
    const startIdx = globalCounter;
    let invSubtotal = 0;

    inv.items.forEach(item => {
      const desc = item.description;
      const code = item.item_code || '';
      invSubtotal += item.total_price || 0;

      flatItems.push({
        idx: globalCounter++,
        code,
        description: desc,
        qty: item.quantity || 1,
        unit: item.unit || 'ชิ้น',
        unitPrice: item.unit_price || 0,
        totalPrice: item.total_price || 0,
        vendor: inv.vendor_name || 'ร้านค้า/บริษัทผู้ขาย',
        invNum: inv.invoice_number || '-',
        invDate: inv.invoice_date || '-',
        invoiceIdx: invIdx
      });
    });

    const endIdx = globalCounter - 1;
    const discount = Number(inv.discount || 0);
    const grandTotal = Math.max(0, invSubtotal - discount);

    invoiceRanges.push({
      invoiceIdx: invIdx,
      start: startIdx,
      end: endIdx,
      subtotal: invSubtotal,
      discount,
      grandTotal
    });
  });

  const totalItemsCount = flatItems.length;
  const grandSubtotal = flatItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalDiscount = invoiceRanges.reduce((sum, r) => sum + r.discount, 0);
  const grandTotalPaid = grandSubtotal - totalDiscount;
  const thaiTextAmount = getBahtText(grandTotalPaid);

  const deptText = data.department || 'สำนักบริหารเครือข่ายและสร้างความตระหนัก (สบร.)';
  const introCourseText = data.intro_course || 'จัดซื้อวัสดุสำหรับการจัดกิจกรรมและดำเนินงานโครงการ';
  const regText = data.regulatory_text || 'หนังสือคณะกรรมการวินิจฉัยปัญหาการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ กรมบัญชีกลาง ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว 119 ลงวันที่ 7 มีนาคม 2561 ตาราง 1 ลำดับที่ 3';

  const paragraphs: Paragraph[] = [
    // 1. Header Title: บันทึกข้อความ (Bold 29pt / 58 half-pts)
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: "บันทึกข้อความ",
          font: FONT_NAME,
          size: 58,
          bold: true
        })
      ]
    }),

    // 2. ส่วนราชการ
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({ text: "ส่วนราชการ  ", font: FONT_NAME, size: FONT_SIZE, bold: true }),
        new TextRun({ text: `${deptText}  โทร. 033 005 833`, font: FONT_NAME, size: FONT_SIZE })
      ]
    }),

    // 3. ที่ และ วันที่
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({ text: "ที่  ", font: FONT_NAME, size: FONT_SIZE, bold: true }),
        new TextRun({ text: "สคร.             /2568", font: FONT_NAME, size: FONT_SIZE }),
        new TextRun({ text: "\t\t\t\tวันที่  ", font: FONT_NAME, size: FONT_SIZE, bold: true }),
        new TextRun({ text: ` ${data.requester_date || '   /            / 2568'} `, font: FONT_NAME, size: FONT_SIZE })
      ]
    }),

    // 4. เรื่อง
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({ text: "เรื่อง  ", font: FONT_NAME, size: FONT_SIZE, bold: true }),
        new TextRun({ text: `รายงานขอความเห็นชอบการจัดซื้อจัดจ้าง  จำนวน ${totalItemsCount}  รายการ`, font: FONT_NAME, size: FONT_SIZE, bold: true })
      ]
    }),

    // 5. เรียน
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({ text: "เรียน  ", font: FONT_NAME, size: FONT_SIZE, bold: true }),
        new TextRun({ text: `${data.approver_position || 'ผอ.สคร.'}  ผ่าน รก.หน.ฝถท.`, font: FONT_NAME, size: FONT_SIZE })
      ]
    }),

    // Blank spacing line
    new Paragraph({ children: [new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE })] }),

    // 6. Intro Paragraph (Official Thai Government Intro Style)
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({ text: "\t\tด้วย ", font: FONT_NAME, size: FONT_SIZE }),
        new TextRun({ text: deptText, font: FONT_NAME, size: FONT_SIZE }),
        new TextRun({ text: `  ได้ดำเนินการจัดซื้อวัสดุสำหรับการจัด  ${introCourseText}  จำนวน  ${totalItemsCount}  รายการ  โดยใช้งบประมาณโครงการจัดกิจกรรมพัฒนาเครือข่ายและสร้างความตระหนัก  ซึ่งมีรายละเอียดดังต่อไปนี้`, font: FONT_NAME, size: FONT_SIZE })
      ]
    })
  ];

  // 7. Add Item Paragraphs (Official Item Format matching Template)
  flatItems.forEach((item) => {
    const descText = item.code ? `${item.code} ${item.description}` : item.description;
    const priceStr = formatPrice(item.totalPrice);

    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({ text: `\t${item.idx}. ค่า `, font: FONT_NAME, size: FONT_SIZE }),
          new TextRun({ text: descText, font: FONT_NAME, size: FONT_SIZE, bold: true }),
          new TextRun({ text: `  จำนวน  ${item.qty}  ${item.unit}  เป็นเงิน  ${priceStr}  บาท  ${formatVendorWithPrefix(item.vendor)}  ตามใบเสร็จรับเงิน/ใบกำกับภาษี เลขที่ ${item.invNum} ลงวันที่ ${item.invDate}`, font: FONT_NAME, size: FONT_SIZE })
        ]
      })
    );

    // If item is end of an invoice with discount, add discount note paragraph
    const matchingRange = invoiceRanges.find(r => r.end === item.idx && r.discount > 0);
    if (matchingRange) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          children: [
            new TextRun({ 
              text: `\t   หมายเหตุ : รายการที่ ${matchingRange.start}-${matchingRange.end} มีส่วนลดสุทธิ ${formatPrice(matchingRange.discount)} บาท รวมเป็นเงินทั้งสิ้น ${formatPrice(matchingRange.grandTotal)} บาท`, 
              font: FONT_NAME, 
              size: FONT_SIZE, 
              italics: true 
            })
          ]
        })
      );
    }
  });

  // 8. Total Summary Paragraph
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({ 
          text: `\tรวม ${totalItemsCount} รายการ เป็นเงินทั้งสิ้น ${formatPrice(grandTotalPaid)} บาท (${thaiTextAmount})`, 
          font: FONT_NAME, 
          size: FONT_SIZE, 
          bold: true 
        })
      ]
    })
  );

  // 9. Regulatory Reference Paragraph
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({ 
          text: `\tการจัดซื้อจัดจ้างดังกล่าว เป็นการดำเนินการตาม ${regText}`, 
          font: FONT_NAME, 
          size: FONT_SIZE 
        })
      ]
    })
  );

  // Blank spacing lines
  paragraphs.push(new Paragraph({ children: [new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE })] }));

  // 10. Conclusion & Signature Blocks (Right Aligned Official Format)
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({ text: "\tจึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ", font: FONT_NAME, size: FONT_SIZE })
      ]
    })
  );

  paragraphs.push(new Paragraph({ children: [new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE })] }));
  paragraphs.push(new Paragraph({ children: [new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE })] }));

  // Requester Signature Block
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: `( ${data.requester_name || 'นางสาวศิริพักตร์  เสมียนคิด'} )     `, font: FONT_NAME, size: FONT_SIZE, bold: true })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: `${data.requester_position || 'เจ้าหน้าที่ผู้รับผิดชอบ'}     `, font: FONT_NAME, size: FONT_SIZE })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: `${data.requester_date || '   /            / 2568'}     `, font: FONT_NAME, size: FONT_SIZE })
      ]
    })
  );

  paragraphs.push(new Paragraph({ children: [new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE })] }));
  paragraphs.push(new Paragraph({ children: [new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE })] }));

  // Approver Signature Block
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: `( ${data.approver_name || 'นางสาวปราณปริยา   วงค์ษา'} )     `, font: FONT_NAME, size: FONT_SIZE, bold: true })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: `${data.approver_position || 'ผอ.สคร.'}     `, font: FONT_NAME, size: FONT_SIZE })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: `${data.approver_date || '   /            / 2568'}     `, font: FONT_NAME, size: FONT_SIZE })
      ]
    })
  );

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
        children: paragraphs
      }
    ]
  });

  return await Packer.toBlob(doc);
}
