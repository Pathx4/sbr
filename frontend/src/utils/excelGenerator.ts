import ExcelJS from 'exceljs';
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
  photo?: string;
}

interface Invoice {
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  discount: number;
  grand_total: number;
  items: Item[];
}

export interface ExcelPayload {
  department: string;
  intro_course: string;
  regulatory_text: string;
  excel_date_range: string;
  excel_location: string;
  invoices: Invoice[];
  is_illustration?: boolean;
}

/**
 * Clean, Pure ExcelJS Workbook Generator (Zero corruption, 100% valid Excel open)
 */
export async function generateExcelDocument(data: ExcelPayload): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SBR Budget System';
  workbook.lastModifiedBy = 'SBR Budget System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const isIllustration = !!data.is_illustration;

  // Flatten items across all invoices
  const flatItems: {
    idx: string;
    description: string;
    qty: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    vendor: string;
    invNum: string;
    invDate: string;
    photo?: string;
  }[] = [];

  let counter = 1;
  data.invoices.forEach((inv, invIdx) => {
    inv.items.forEach((item, itemIdx) => {
      const desc = item.item_code ? `${item.item_code} ${item.description}` : item.description;
      flatItems.push({
        idx: data.invoices.length > 1 ? `${invIdx + 1}.${itemIdx + 1}` : `${counter++}`,
        description: desc,
        qty: item.quantity || 1,
        unit: item.unit || 'ชิ้น',
        unitPrice: item.unit_price || 0,
        totalPrice: item.total_price || 0,
        vendor: inv.vendor_name || 'ร้านค้า/บริษัทผู้ขาย',
        invNum: inv.invoice_number || '-',
        invDate: inv.invoice_date || '-',
        photo: item.photo
      });
    });
  });

  const grandSubtotal = flatItems.reduce((acc, i) => acc + i.totalPrice, 0);
  const totalDiscount = data.invoices.reduce((acc, inv) => acc + (inv.discount || 0), 0);
  const grandTotalPaid = grandSubtotal - totalDiscount;
  const bahtTextStr = getBahtText(grandTotalPaid);

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'D0D0D0' } },
    left: { style: 'thin', color: { argb: 'D0D0D0' } },
    bottom: { style: 'thin', color: { argb: 'D0D0D0' } },
    right: { style: 'thin', color: { argb: 'D0D0D0' } }
  };

  if (isIllustration) {
    // ---------------------------------------------
    // Illustration Sheet (ภาพประกอบ.xlsx)
    // ---------------------------------------------
    const ws = workbook.addWorksheet('ภาพประกอบ');

    // Title Row 1
    ws.addRow(['ภาพประกอบ']);
    ws.mergeCells('A1:P1');
    const titleCell = ws.getCell('A1');
    titleCell.font = { name: 'TH SarabunPSK', size: 20, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 35;

    // Header Row 2
    ws.addRow(['ลำดับ', 'รายละเอียดพัสดุ', '', '', '', '', '', '', '', '', '', '', '', '', '', 'ภาพประกอบ']);
    ws.mergeCells('B2:O2');
    ws.getRow(2).height = 30;

    ws.getCell('A2').font = { name: 'TH SarabunPSK', size: 16, bold: true };
    ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell('A2').border = thinBorder;
    ws.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F4F8' } };

    ws.getCell('B2').font = { name: 'TH SarabunPSK', size: 16, bold: true };
    ws.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell('B2').border = thinBorder;
    ws.getCell('B2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F4F8' } };

    ws.getCell('P2').font = { name: 'TH SarabunPSK', size: 16, bold: true };
    ws.getCell('P2').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell('P2').border = thinBorder;
    ws.getCell('P2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F4F8' } };

    let rowIdx = 3;
    flatItems.forEach((item) => {
      ws.addRow([item.idx, item.description]);
      ws.mergeCells(`B${rowIdx}:O${rowIdx}`);
      ws.getRow(rowIdx).height = 110;

      const cellA = ws.getCell(`A${rowIdx}`);
      cellA.font = { name: 'TH SarabunPSK', size: 14 };
      cellA.alignment = { horizontal: 'center', vertical: 'top' };
      cellA.border = thinBorder;

      const cellB = ws.getCell(`B${rowIdx}`);
      cellB.font = { name: 'TH SarabunPSK', size: 14 };
      cellB.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      cellB.border = thinBorder;

      const cellP = ws.getCell(`P${rowIdx}`);
      cellP.border = thinBorder;

      if (item.photo && item.photo.startsWith('data:image')) {
        try {
          const imageId = workbook.addImage({
            base64: item.photo,
            extension: 'jpeg'
          });
          ws.addImage(imageId, {
            tl: { col: 15, row: rowIdx - 1 },
            ext: { width: 140, height: 100 }
          });
        } catch (e) {
          console.warn("Failed to embed image:", e);
        }
      }
      rowIdx++;
    });

    ws.getColumn(1).width = 10;
    ws.getColumn(2).width = 35;
    ws.getColumn(16).width = 25;

  } else {
    // ---------------------------------------------
    // Summary Expense Sheet (สรุปค่าใช้จ่าย_เบิกเงินค่าพัสดุ.xlsx)
    // ---------------------------------------------
    const ws = workbook.addWorksheet('สรุปค่าใช้จ่าย_เบิกเงินค่าพัสดุ');

    // Title Row 1
    const titleText = data.intro_course 
      ? `ตารางสรุปค่าใช้จ่ายในการจัดซื้อวัสดุสำหรับการจัด ${data.intro_course}`
      : 'ตารางสรุปค่าใช้จ่ายในการจัดซื้อจัดจ้างพัสดุ';

    ws.addRow([titleText]);
    ws.mergeCells('A1:H1');
    const cellA1 = ws.getCell('A1');
    cellA1.font = { name: 'TH SarabunPSK', size: 18, bold: true };
    cellA1.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 32;

    // Subtitle Row 2
    const locStr = data.excel_location ? ` ณ ${data.excel_location}` : '';
    const dateStr = data.excel_date_range ? ` ระหว่างวันที่ ${data.excel_date_range}` : '';
    const subTitleText = `${locStr}${dateStr}`.trim() || 'สำนักบริหารเครือข่ายและสร้างความตระหนัก (สบร.)';

    ws.addRow([subTitleText]);
    ws.mergeCells('A2:H2');
    const cellA2 = ws.getCell('A2');
    cellA2.font = { name: 'TH SarabunPSK', size: 16 };
    cellA2.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 26;

    ws.addRow([]); // Blank spacing

    // Header Row 4
    const headerRow = ws.addRow([
      'ลำดับ', 
      'รายการพัสดุ', 
      'จำนวน', 
      'หน่วย', 
      'ราคา/หน่วย (บาท)', 
      'จำนวนเงิน (บาท)', 
      'ร้านค้า/ผู้ขาย', 
      'เลขที่ใบเสร็จ/วันที่'
    ]);
    headerRow.height = 28;

    headerRow.eachCell((cell) => {
      cell.font = { name: 'TH SarabunPSK', size: 16, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E9ECEF' } };
      cell.border = thinBorder;
    });

    // Data Rows
    flatItems.forEach((item) => {
      const row = ws.addRow([
        item.idx,
        item.description,
        item.qty,
        item.unit,
        item.unitPrice,
        item.totalPrice,
        item.vendor,
        `เลขที่ ${item.invNum} ลงวันที่ ${item.invDate}`
      ]);
      row.height = 24;

      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(8).alignment = { horizontal: 'left', vertical: 'middle' };

      row.getCell(5).numFmt = '#,##0.00';
      row.getCell(6).numFmt = '#,##0.00';

      row.eachCell((cell) => {
        cell.font = { name: 'TH SarabunPSK', size: 14 };
        cell.border = thinBorder;
      });
    });

    // Total Row
    const totalRow = ws.addRow([
      '', 
      `รวมเป็นเงินทั้งสิ้น (${bahtTextStr})`, 
      '', 
      '', 
      '', 
      grandTotalPaid
    ]);
    totalRow.height = 28;

    ws.mergeCells(`B${totalRow.number}:E${totalRow.number}`);

    totalRow.eachCell((cell) => {
      cell.font = { name: 'TH SarabunPSK', size: 16, bold: true };
      cell.border = thinBorder;
    });

    const labelCell = totalRow.getCell(2);
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' };

    const amountCell = totalRow.getCell(6);
    amountCell.alignment = { horizontal: 'right', vertical: 'middle' };
    amountCell.numFmt = '#,##0.00';

    // Set Column Widths
    ws.getColumn(1).width = 10;  // ลำดับ
    ws.getColumn(2).width = 45;  // รายการพัสดุ
    ws.getColumn(3).width = 10;  // จำนวน
    ws.getColumn(4).width = 12;  // หน่วย
    ws.getColumn(5).width = 18;  // ราคา/หน่วย
    ws.getColumn(6).width = 18;  // จำนวนเงิน
    ws.getColumn(7).width = 30;  // ร้านค้า
    ws.getColumn(8).width = 35;  // เลขที่ใบเสร็จ
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
