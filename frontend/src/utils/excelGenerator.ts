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

export async function generateExcelDocument(data: ExcelPayload): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const isIllustration = !!data.is_illustration;

  if (isIllustration) {
    // ---------------------------------------------
    // Illustration Sheet (ภาพประกอบ.xlsx)
    // ---------------------------------------------
    const ws = workbook.addWorksheet('ภาพประกอบ');

    // Title Row
    ws.addRow(['ภาพประกอบ']);
    ws.mergeCells('A1:P1');
    const titleCell = ws.getCell('A1');
    titleCell.font = { name: 'TH SarabunPSK', size: 20, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 35;

    // Header Row
    ws.addRow(['ลำดับ', 'รายละเอียด', '', '', '', '', '', '', '', '', '', '', '', '', '', 'ภาพ']);
    ws.mergeCells('B2:O2');
    ws.getRow(2).height = 40;

    ws.getCell('A2').font = { name: 'TH SarabunPSK', size: 16, bold: true };
    ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell('B2').font = { name: 'TH SarabunPSK', size: 16, bold: true };
    ws.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell('P2').font = { name: 'TH SarabunPSK', size: 16, bold: true };
    ws.getCell('P2').alignment = { horizontal: 'center', vertical: 'middle' };

    let rowIdx = 3;
    data.invoices.forEach((inv, invIdx) => {
      inv.items.forEach((item, itemIdx) => {
        const itemNumber = data.invoices.length > 1 ? `${invIdx + 1}.${itemIdx + 1}` : `${itemIdx + 1}`;
        const desc = item.item_code ? `${item.item_code} ${item.description}` : item.description;

        ws.addRow([itemNumber, desc]);
        ws.mergeCells(`B${rowIdx}:O${rowIdx}`);
        ws.getRow(rowIdx).height = 120;

        ws.getCell(`A${rowIdx}`).font = { name: 'TH SarabunPSK', size: 14 };
        ws.getCell(`A${rowIdx}`).alignment = { horizontal: 'center', vertical: 'top' };
        ws.getCell(`B${rowIdx}`).font = { name: 'TH SarabunPSK', size: 14 };
        ws.getCell(`B${rowIdx}`).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

        // Embed Base64 Photo if provided
        if (item.photo && item.photo.startsWith('data:image')) {
          try {
            const imageId = workbook.addImage({
              base64: item.photo,
              extension: 'jpeg'
            });
            ws.addImage(imageId, {
              tl: { col: 15, row: rowIdx - 1 },
              ext: { width: 150, height: 120 }
            });
          } catch (e) {
            console.warn("Failed to embed image:", e);
          }
        }
        rowIdx++;
      });
    });

    ws.getColumn('A').width = 8;
    ws.getColumn('B').width = 40;
    ws.getColumn('P').width = 25;

  } else {
    // ---------------------------------------------
    // Expense Summary Sheet (สรุปค่าใช้จ่าย_เบิกเงินค่าพัสดุ.xlsx)
    // ---------------------------------------------
    const ws = workbook.addWorksheet('สรุปค่าใช้จ่าย');

    // Title Rows
    ws.addRow(['สรุปค่าใช้จ่ายการเบิกเงินค่าพัสดุ']);
    ws.mergeCells('A1:U1');
    ws.getCell('A1').font = { name: 'TH SarabunPSK', size: 18, bold: true };
    ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    const courseName = data.intro_course ? `รายการจัดซื้อวัสดุอุปกรณ์สำหรับการดำเนินงาน ${data.intro_course}` : 'รายการจัดซื้อวัสดุอุปกรณ์';
    ws.addRow([courseName]);
    ws.mergeCells('A2:U2');
    ws.getCell('A2').font = { name: 'TH SarabunPSK', size: 16, bold: true };
    ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

    let dateLocText = '';
    if (data.excel_date_range) dateLocText += `ระหว่างวันที่ ${data.excel_date_range} `;
    if (data.excel_location) dateLocText += `ณ ${data.excel_location}`;
    ws.addRow([dateLocText]);
    ws.mergeCells('A3:U3');
    ws.getCell('A3').font = { name: 'TH SarabunPSK', size: 14, italic: true };
    ws.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.addRow([]); // Blank row 4

    // Table Header Row 5
    const headerRow = ws.addRow(['ลำดับ', 'รายการ / ร้านค้าผู้ขาย', '', '', '', '', '', '', '', '', '', '', '', '', '=', 'จำนวนเงิน (บาท)', 'บาท', 'ราคารวม', '', '', 'หมายเหตุ']);
    ws.mergeCells('B5:N5');
    ws.mergeCells('R5:T5');
    ws.getRow(5).height = 30;

    headerRow.eachCell((cell) => {
      cell.font = { name: 'TH SarabunPSK', size: 14, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F0FA' } };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'medium' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    let current = 6;

    data.invoices.forEach((inv, invIdx) => {
      const vendorRowIdx = current;

      // Vendor Header Row
      const vRow = ws.addRow([invIdx + 1, inv.vendor_name, '', '', '', '', '', '', '', '', '', '', '', '', '=', '', 'บาท', '']);
      ws.mergeCells(`B${vendorRowIdx}:N${vendorRowIdx}`);
      ws.mergeCells(`R${vendorRowIdx}:T${vendorRowIdx}`);
      ws.getRow(vendorRowIdx).height = 28;

      const invTotal = inv.items.reduce((s, item) => s + (item.total_price || 0), 0) - (inv.discount || 0);
      ws.getCell(`P${vendorRowIdx}`).value = invTotal;
      ws.getCell(`R${vendorRowIdx}`).value = invTotal;

      vRow.eachCell(cell => {
        cell.font = { name: 'TH SarabunPSK', size: 14, bold: true };
        cell.alignment = { vertical: 'middle' };
      });
      ws.getCell(`A${vendorRowIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(`P${vendorRowIdx}`).alignment = { horizontal: 'right', vertical: 'middle' };
      ws.getCell(`R${vendorRowIdx}`).alignment = { horizontal: 'right', vertical: 'middle' };

      current++;

      // Items Rows
      inv.items.forEach((item, itemIdx) => {
        const itemRowIdx = current;
        const desc = item.item_code ? `${item.item_code} ${item.description}` : item.description;

        const iRow = ws.addRow([
          `${invIdx + 1}.${itemIdx + 1}`,
          desc,
          '',
          '(',
          item.unit_price,
          'บาท *',
          item.quantity,
          item.unit || 'ชิ้น',
          ')',
          '', '', '', '=',
          item.total_price,
          'บาท'
        ]);

        ws.mergeCells(`B${itemRowIdx}:C${itemRowIdx}`);
        ws.getRow(itemRowIdx).height = 22;

        iRow.eachCell(cell => {
          cell.font = { name: 'TH SarabunPSK', size: 14 };
          cell.alignment = { vertical: 'middle' };
        });
        ws.getCell(`A${itemRowIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(`E${itemRowIdx}`).alignment = { horizontal: 'right', vertical: 'middle' };
        ws.getCell(`G${itemRowIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(`N${itemRowIdx}`).alignment = { horizontal: 'right', vertical: 'middle' };

        current++;
      });

      // Discount Row if any
      if (inv.discount > 0) {
        const discRowIdx = current;
        ws.addRow(['', 'ส่วนลด', '', '', inv.discount, 'บาท']);
        ws.mergeCells(`B${discRowIdx}:C${discRowIdx}`);
        current++;
      }
    });

    // Total Grand Row
    const grandRowIdx = current;
    const grandTotal = data.invoices.reduce((acc, inv) => {
      const invSum = inv.items.reduce((s, i) => s + (i.total_price || 0), 0);
      return acc + Math.max(0, invSum - (inv.discount || 0));
    }, 0);
    const bahtTextStr = getBahtText(grandTotal);

    const gRow = ws.addRow(['รวม', `(${bahtTextStr})`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', grandTotal]);
    ws.mergeCells(`B${grandRowIdx}:Q${grandRowIdx}`);
    ws.mergeCells(`R${grandRowIdx}:T${grandRowIdx}`);
    ws.getRow(grandRowIdx).height = 30;

    gRow.eachCell(cell => {
      cell.font = { name: 'TH SarabunPSK', size: 15, bold: true };
      cell.alignment = { vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
    });
    ws.getCell(`A${grandRowIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(`B${grandRowIdx}`).alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getCell(`R${grandRowIdx}`).alignment = { horizontal: 'right', vertical: 'middle' };

    // Column Widths
    ws.getColumn('A').width = 8;
    ws.getColumn('B').width = 30;
    ws.getColumn('E').width = 12;
    ws.getColumn('N').width = 15;
    ws.getColumn('P').width = 16;
    ws.getColumn('R').width = 16;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
