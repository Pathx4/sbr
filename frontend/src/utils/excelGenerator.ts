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
 * Generates Official Excel Workbook (.xlsx) using the official template layout
 */
export async function generateExcelDocument(data: ExcelPayload): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
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

  // Try fetching the official Excel template file from public/templates/
  let loadedFromTemplate = false;
  try {
    const templateRes = await fetch('./templates/สรุปค่าใช้จ่าย_เบิกเงินค่าพัสดุ.xlsx');
    if (templateRes.ok) {
      const buffer = await templateRes.arrayBuffer();
      await workbook.xlsx.load(buffer);
      loadedFromTemplate = true;
    }
  } catch (e) {
    console.warn("Could not load template file, falling back to programmatic ExcelJS generation:", e);
  }

  if (loadedFromTemplate) {
    // ---------------------------------------------
    // Populate Official Excel Template
    // ---------------------------------------------
    if (isIllustration) {
      // Illustration Sheet (Sheet 2)
      const ws = workbook.worksheets[1] || workbook.worksheets[0];
      
      // Update Header Title if needed
      let rowIdx = 5;
      flatItems.forEach(item => {
        const row = ws.getRow(rowIdx);
        row.getCell(1).value = item.idx;
        row.getCell(2).value = item.description;
        row.height = 100;

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
          } catch (err) {
            console.warn("Failed to embed image:", err);
          }
        }
        rowIdx++;
      });
    } else {
      // Summary Expense Sheet (Sheet 1)
      const ws = workbook.worksheets[0];

      // Update Title & Date Location headers
      if (data.intro_course) {
        ws.getCell('A1').value = `ตารางสรุปค่าใช้จ่ายในการจัดซื้อวัสดุสำหรับการจัด ${data.intro_course}`;
      }
      if (data.excel_location || data.excel_date_range) {
        const locStr = data.excel_location ? ` ณ ${data.excel_location}` : '';
        const dateStr = data.excel_date_range ? ` ระหว่างวันที่ ${data.excel_date_range}` : '';
        ws.getCell('A2').value = `${locStr}${dateStr}`.trim();
      }

      // Populate Data Rows starting at Row 5
      let startRow = 5;
      flatItems.forEach((item, idx) => {
        const row = ws.getRow(startRow + idx);
        row.getCell(1).value = item.idx;
        row.getCell(2).value = item.description;
        row.getCell(3).value = item.qty;
        row.getCell(4).value = item.unit;
        row.getCell(5).value = item.unitPrice;
        row.getCell(6).value = item.totalPrice;
        row.getCell(7).value = item.vendor;
        row.getCell(8).value = `เลขที่ ${item.invNum} ลงวันที่ ${item.invDate}`;
      });

      // Total Row
      const totalRowIdx = startRow + flatItems.length;
      const totalRow = ws.getRow(totalRowIdx);
      totalRow.getCell(2).value = `รวมเป็นเงินทั้งสิ้น (${bahtTextStr})`;
      totalRow.getCell(6).value = grandTotalPaid;
    }
  } else {
    // ---------------------------------------------
    // Programmatic Fallback Excel Generation
    // ---------------------------------------------
    if (isIllustration) {
      const ws = workbook.addWorksheet('ภาพประกอบ');
      ws.addRow(['ภาพประกอบ']);
      ws.mergeCells('A1:P1');
      ws.getCell('A1').font = { name: 'TH SarabunPSK', size: 20, bold: true };
      ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

      ws.addRow(['ลำดับ', 'รายละเอียดพัสดุ', '', '', '', '', '', '', '', '', '', '', '', '', '', 'ภาพประกอบ']);
      ws.mergeCells('B2:O2');

      let rowIdx = 3;
      flatItems.forEach(item => {
        ws.addRow([item.idx, item.description]);
        ws.mergeCells(`B${rowIdx}:O${rowIdx}`);
        ws.getRow(rowIdx).height = 100;
        ws.getCell(`A${rowIdx}`).font = { name: 'TH SarabunPSK', size: 14 };
        ws.getCell(`A${rowIdx}`).alignment = { horizontal: 'center', vertical: 'top' };
        ws.getCell(`B${rowIdx}`).font = { name: 'TH SarabunPSK', size: 14 };
        ws.getCell(`B${rowIdx}`).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

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
          } catch (err) {
            console.warn("Failed to embed image:", err);
          }
        }
        rowIdx++;
      });
    } else {
      const ws = workbook.addWorksheet('สรุปค่าใช้จ่าย_เบิกเงินค่าพัสดุ');
      
      // Header Title
      const titleText = data.intro_course 
        ? `ตารางสรุปค่าใช้จ่ายในการจัดซื้อวัสดุสำหรับการจัด ${data.intro_course}`
        : 'ตารางสรุปค่าใช้จ่ายในการจัดซื้อจัดจ้างพัสดุ';

      ws.addRow([titleText]);
      ws.mergeCells('A1:H1');
      ws.getCell('A1').font = { name: 'TH SarabunPSK', size: 18, bold: true };
      ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

      const subTitleText = `${data.excel_location ? ' ณ ' + data.excel_location : ''}${data.excel_date_range ? ' ระหว่างวันที่ ' + data.excel_date_range : ''}`;
      ws.addRow([subTitleText]);
      ws.mergeCells('A2:H2');
      ws.getCell('A2').font = { name: 'TH SarabunPSK', size: 16 };
      ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

      ws.addRow([]); // Blank spacing

      // Table Header Row
      const headerRow = ws.addRow(['ลำดับ', 'รายการพัสดุ', 'จำนวน', 'หน่วย', 'ราคา/หน่วย', 'จำนวนเงิน', 'ร้านค้า/ผู้ขาย', 'เลขที่ใบเสร็จ/วันที่']);
      headerRow.font = { name: 'TH SarabunPSK', size: 16, bold: true };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Data Rows
      flatItems.forEach(item => {
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
        row.font = { name: 'TH SarabunPSK', size: 14 };
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(3).alignment = { horizontal: 'center' };
        row.getCell(4).alignment = { horizontal: 'center' };
        row.getCell(5).numFmt = '#,##0.00';
        row.getCell(6).numFmt = '#,##0.00';
      });

      // Total Row
      const totalRow = ws.addRow(['', `รวมเป็นเงินทั้งสิ้น (${bahtTextStr})`, '', '', '', grandTotalPaid]);
      ws.mergeCells(`B${totalRow.number}:E${totalRow.number}`);
      totalRow.font = { name: 'TH SarabunPSK', size: 16, bold: true };
      totalRow.getCell(6).numFmt = '#,##0.00';
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
