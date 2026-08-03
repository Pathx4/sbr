import ExcelJS from 'exceljs';

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
  advance_amount?: number;
  contract_no?: string;
}

/**
 * Clean, Pure ExcelJS Workbook Generator (Zero text clipping, perfect alignment)
 */
export async function generateExcelDocument(data: ExcelPayload): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SBR Budget System';
  workbook.lastModifiedBy = 'SBR Budget System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const isIllustration = !!data.is_illustration;

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'D0D0D0' } },
    left: { style: 'thin', color: { argb: 'D0D0D0' } },
    bottom: { style: 'thin', color: { argb: 'D0D0D0' } },
    right: { style: 'thin', color: { argb: 'D0D0D0' } }
  };

  if (isIllustration) {
    // ---------------------------------------------
    // Illustration Sheet (ภาพประกอบ.xlsx Layout)
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
    ws.addRow(['ลำดับ', 'รายละเอียด', '', '', '', '', '', '', '', '', '', '', '', '', '', 'ภาพ']);
    ws.mergeCells('B2:O2');
    ws.getRow(2).height = 30;

    const cellA2 = ws.getCell('A2');
    cellA2.font = { name: 'TH SarabunPSK', size: 16, bold: true };
    cellA2.alignment = { horizontal: 'center', vertical: 'middle' };
    cellA2.border = thinBorder;
    cellA2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F4F8' } };

    const cellB2 = ws.getCell('B2');
    cellB2.font = { name: 'TH SarabunPSK', size: 16, bold: true };
    cellB2.alignment = { horizontal: 'center', vertical: 'middle' };
    cellB2.border = thinBorder;
    cellB2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F4F8' } };

    const cellP2 = ws.getCell('P2');
    cellP2.font = { name: 'TH SarabunPSK', size: 16, bold: true };
    cellP2.alignment = { horizontal: 'center', vertical: 'middle' };
    cellP2.border = thinBorder;
    cellP2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F4F8' } };

    let currentRowIdx = 3;

    data.invoices.forEach((inv, invIdx) => {
      const storeNumber = invIdx + 1;
      const storeName = inv.vendor_name || 'ร้านค้า/บริษัทผู้ขาย';

      // Store Header Group Row
      const storeRow = ws.getRow(currentRowIdx);
      storeRow.getCell(1).value = storeNumber;
      storeRow.getCell(2).value = storeName;
      ws.mergeCells(`B${currentRowIdx}:N${currentRowIdx}`);
      storeRow.height = 26;

      const storeCellA = storeRow.getCell(1);
      storeCellA.font = { name: 'TH SarabunPSK', size: 14, bold: true };
      storeCellA.alignment = { horizontal: 'center', vertical: 'middle' };
      storeCellA.border = thinBorder;

      const storeCellB = storeRow.getCell(2);
      storeCellB.font = { name: 'TH SarabunPSK', size: 14, bold: true };
      storeCellB.alignment = { horizontal: 'left', vertical: 'middle' };
      storeCellB.border = thinBorder;

      currentRowIdx++;

      // Items under this store
      inv.items.forEach((item, itemIdx) => {
        const itemIndexStr = `${storeNumber}.${itemIdx + 1}`;
        const descText = item.item_code ? `${item.item_code} ${item.description}` : item.description;
        const unitPrice = item.unit_price || 0;
        const qty = item.quantity || 1;
        const unitStr = item.unit || 'ชิ้น';
        const totalPrice = item.total_price || (unitPrice * qty);

        const itemRow = ws.getRow(currentRowIdx);
        itemRow.height = 100;

        itemRow.getCell(1).value = itemIndexStr; // A: ลำดับ 1.1
        itemRow.getCell(2).value = descText;      // B: รายละเอียด
        itemRow.getCell(4).value = '(';           // D: (
        itemRow.getCell(5).value = unitPrice;     // E: ราคา/หน่วย
        itemRow.getCell(6).value = 'บาท * ';      // F: บาท * 
        itemRow.getCell(7).value = qty;           // G: จำนวน
        itemRow.getCell(8).value = unitStr;       // H: หน่วย
        itemRow.getCell(9).value = ')';           // I: )
        itemRow.getCell(13).value = '=';          // M: =
        itemRow.getCell(14).value = totalPrice;   // N: รวมเงิน
        itemRow.getCell(15).value = 'บาท';        // O: บาท

        ws.mergeCells(`B${currentRowIdx}:C${currentRowIdx}`);

        itemRow.getCell(1).font = { name: 'TH SarabunPSK', size: 14 };
        itemRow.getCell(1).alignment = { horizontal: 'center', vertical: 'top' };
        itemRow.getCell(1).border = thinBorder;

        itemRow.getCell(2).font = { name: 'TH SarabunPSK', size: 14 };
        itemRow.getCell(2).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        itemRow.getCell(2).border = thinBorder;

        itemRow.getCell(4).font = { name: 'TH SarabunPSK', size: 14 };
        itemRow.getCell(4).alignment = { horizontal: 'center', vertical: 'top' };
        
        itemRow.getCell(5).font = { name: 'TH SarabunPSK', size: 14 };
        itemRow.getCell(5).alignment = { horizontal: 'right', vertical: 'top' };
        itemRow.getCell(5).numFmt = '#,##0.00';

        itemRow.getCell(6).font = { name: 'TH SarabunPSK', size: 14 };
        itemRow.getCell(6).alignment = { horizontal: 'center', vertical: 'top' };

        itemRow.getCell(7).font = { name: 'TH SarabunPSK', size: 14 };
        itemRow.getCell(7).alignment = { horizontal: 'center', vertical: 'top' };

        itemRow.getCell(8).font = { name: 'TH SarabunPSK', size: 14 };
        itemRow.getCell(8).alignment = { horizontal: 'center', vertical: 'top' };

        itemRow.getCell(9).font = { name: 'TH SarabunPSK', size: 14 };
        itemRow.getCell(9).alignment = { horizontal: 'center', vertical: 'top' };

        itemRow.getCell(13).font = { name: 'TH SarabunPSK', size: 14 };
        itemRow.getCell(13).alignment = { horizontal: 'center', vertical: 'top' };

        itemRow.getCell(14).font = { name: 'TH SarabunPSK', size: 14 };
        itemRow.getCell(14).alignment = { horizontal: 'right', vertical: 'top' };
        itemRow.getCell(14).numFmt = '#,##0.00';

        itemRow.getCell(15).font = { name: 'TH SarabunPSK', size: 14 };
        itemRow.getCell(15).alignment = { horizontal: 'center', vertical: 'top' };

        const photoCell = itemRow.getCell(16);
        photoCell.border = thinBorder;

        if (item.photo && item.photo.startsWith('data:image')) {
          try {
            const imageId = workbook.addImage({
              base64: item.photo,
              extension: 'jpeg'
            });
            ws.addImage(imageId, {
              tl: { col: 15, row: currentRowIdx - 1 },
              ext: { width: 140, height: 95 }
            });
          } catch (e) {
            console.warn("Failed to embed image:", e);
          }
        }

        currentRowIdx++;
      });
    });

    ws.getColumn(1).width = 10;   // A: ลำดับ
    ws.getColumn(2).width = 25;   // B: รายละเอียด
    ws.getColumn(3).width = 25;   // C: รายละเอียดต่อ
    ws.getColumn(4).width = 4;    // D: (
    ws.getColumn(5).width = 12;   // E: ราคา
    ws.getColumn(6).width = 10;   // F: บาท * 
    ws.getColumn(7).width = 8;    // G: จำนวน
    ws.getColumn(8).width = 8;    // H: หน่วย
    ws.getColumn(9).width = 4;    // I: )
    ws.getColumn(13).width = 4;   // M: =
    ws.getColumn(14).width = 14;  // N: รวมเงิน
    ws.getColumn(15).width = 8;   // O: บาท
    ws.getColumn(16).width = 25;  // P: ภาพ

  } else {
    // ---------------------------------------------
    // Summary Expense Sheet (สรุปเบิกเงินค่าวัสดุ (ดล) / ตัวอย่าง.xlsx Layout)
    // ---------------------------------------------
    const ws = workbook.addWorksheet('สรุปเบิกเงินค่าวัสดุ (ดล)');

    // Show grid lines and configure page printing
    ws.views = [{ showGridLines: true }];
    ws.pageSetup = {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.39,
        right: 0.39,
        top: 0.39,
        bottom: 0.39,
        header: 0,
        footer: 0
      }
    };

    const headerBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      right: { style: 'thin', color: { argb: 'FFB0B0B0' } }
    };

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
    };

    const formatMergedRange = (
      startCol: number,
      startRow: number,
      endCol: number,
      endRow: number,
      font: Partial<ExcelJS.Font>,
      alignment: Partial<ExcelJS.Alignment>,
      border?: Partial<ExcelJS.Borders>,
      fillColor?: string,
      numFmt?: string
    ) => {
      ws.mergeCells(startRow, startCol, endRow, endCol);
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const cell = ws.getCell(r, c);
          if (font) cell.font = font;
          if (alignment) cell.alignment = alignment;
          if (border) cell.border = border;
          if (fillColor) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
          }
          if (numFmt) cell.numFmt = numFmt;
        }
      }
    };

    // Column Widths (A through U matching sample file)
    ws.getColumn(1).width = 7.0;    // A: ลำดับ
    ws.getColumn(2).width = 60.0;   // B: รายละเอียด
    ws.getColumn(3).width = 2.6;    // C: spacing
    ws.getColumn(4).width = 3.6;    // D: (
    ws.getColumn(5).width = 10.1;   // E: ราคา/หน่วย
    ws.getColumn(6).width = 8.2;    // F: บาท * 
    ws.getColumn(7).width = 5.2;    // G: จำนวน
    ws.getColumn(8).width = 10.0;   // H: หน่วย
    ws.getColumn(9).width = 2.0;    // I: )
    ws.getColumn(10).width = 2.8;   // J: spacing
    ws.getColumn(11).width = 2.7;   // K: spacing
    ws.getColumn(12).width = 1.7;   // L: spacing
    ws.getColumn(13).width = 13.0;  // M: =
    ws.getColumn(14).width = 15.8;  // N: จำนวนเงิน
    ws.getColumn(15).width = 5.4;   // O: บาท
    ws.getColumn(16).width = 17.5;  // P: รวมเงินร้าน
    ws.getColumn(17).width = 8.6;   // Q: บาท
    ws.getColumn(18).width = 2.3;   // R: รวมยกมา
    ws.getColumn(19).width = 5.8;   // S: ตารางล่าง
    ws.getColumn(20).width = 8.4;   // T: ตารางล่าง
    ws.getColumn(21).width = 44.1;  // U: หมายเหตุ

    // Row 1: Title
    ws.addRow(['สรุปค่าใช้จ่ายภายใน']);
    formatMergedRange(1, 1, 21, 1, { name: 'TH Sarabun New', size: 24, bold: true }, { horizontal: 'center', vertical: 'middle' });
    ws.getRow(1).height = 32;

    // Row 2: Course / Activity Subtitle
    let courseText = data.intro_course || 'จัดซื้อวัสดุสำหรับการจัดกิจกรรมและดำเนินงานโครงการ';
    if (!courseText.startsWith('รายการ') && !courseText.startsWith('ตารางสรุป')) {
      courseText = `รายการจัดซื้อวัสดุอุปกรณ์สนับสนุนการดำเนินงาน ${courseText}`;
    }
    ws.addRow([courseText]);
    formatMergedRange(1, 2, 21, 2, { name: 'TH Sarabun New', size: 24, bold: true }, { horizontal: 'center', vertical: 'middle' });
    ws.getRow(2).height = 32;

    let nextRowIdx = 3;

    // Optional Date & Location Row (Row 3 if present)
    if (data.excel_date_range || data.excel_location) {
      const dateLocText = `ระหว่างวันที่ ${data.excel_date_range || ''} ณ ${data.excel_location || ''}`.trim();
      ws.addRow([dateLocText]);
      formatMergedRange(1, nextRowIdx, 21, nextRowIdx, { name: 'TH Sarabun New', size: 24, bold: true }, { horizontal: 'center', vertical: 'middle' });
      ws.getRow(nextRowIdx).height = 32;
      nextRowIdx++;
    }

    // Department Subtitle Row
    const deptText = `ค่าใช้จ่ายของ${data.department || 'ฝ่ายพัสดุและอาคารสถานที่'}`;
    ws.addRow([deptText]);
    formatMergedRange(1, nextRowIdx, 21, nextRowIdx, { name: 'TH Sarabun New', size: 24, bold: true }, { horizontal: 'center', vertical: 'middle' });
    ws.getRow(nextRowIdx).height = 32;
    nextRowIdx++;

    // Table Header Row
    const headerRowIdx = nextRowIdx;
    const headerRow = ws.getRow(headerRowIdx);
    headerRow.height = 30;

    headerRow.getCell(1).value = 'ลำดับ';
    headerRow.getCell(1).font = { name: 'TH Sarabun New', size: 20, bold: true };
    headerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.getCell(1).border = headerBorder;
    headerRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F8' } };

    headerRow.getCell(2).value = 'รายละเอียด';
    formatMergedRange(2, headerRowIdx, 17, headerRowIdx, { name: 'TH Sarabun New', size: 28, bold: true }, { horizontal: 'left', vertical: 'middle' }, headerBorder, 'FFF2F4F8');

    headerRow.getCell(18).value = 'บาท';
    formatMergedRange(18, headerRowIdx, 20, headerRowIdx, { name: 'TH Sarabun New', size: 28, bold: true }, { horizontal: 'center', vertical: 'middle' }, headerBorder, 'FFF2F4F8');

    headerRow.getCell(21).value = 'หมายเหตุ';
    const cellHeaderU = headerRow.getCell(21);
    cellHeaderU.font = { name: 'TH Sarabun New', size: 28, bold: true };
    cellHeaderU.alignment = { horizontal: 'center', vertical: 'middle' };
    cellHeaderU.border = { ...headerBorder, right: { style: 'medium', color: { argb: 'FF000000' } } };
    cellHeaderU.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F8' } };

    let currentRow = headerRowIdx + 1;
    const storeHeaderRows: number[] = [];

    // Loop Invoices and Items
    data.invoices.forEach((inv, invIdx) => {
      const storeNum = invIdx + 1;
      const storeHeaderRow = currentRow;
      storeHeaderRows.push(storeHeaderRow);
      currentRow++; // Row for first item

      const itemStartRow = currentRow;

      inv.items.forEach((item, itemIdx) => {
        const itemNumStr = `${storeNum}.${itemIdx + 1}`;
        const descText = item.item_code ? `${item.item_code} ${item.description}` : item.description;
        const itemRow = ws.getRow(currentRow);
        
        itemRow.getCell(1).value = itemNumStr;
        itemRow.getCell(2).value = descText;
        itemRow.getCell(4).value = '(';
        itemRow.getCell(5).value = item.unit_price || 0;
        itemRow.getCell(6).value = 'บาท * ';
        itemRow.getCell(7).value = item.quantity || 1;
        itemRow.getCell(8).value = item.unit || 'ชิ้น';
        itemRow.getCell(9).value = ')';
        itemRow.getCell(13).value = '=';
        itemRow.getCell(14).value = { formula: `E${currentRow}*G${currentRow}` };
        itemRow.getCell(15).value = 'บาท';

        itemRow.getCell(1).font = { name: 'TH Sarabun New', size: 24 };
        itemRow.getCell(1).alignment = { horizontal: 'center', vertical: 'top' };
        itemRow.getCell(1).border = { left: { style: 'thin', color: { argb: 'FFD0D0D0' } }, right: { style: 'thin', color: { argb: 'FFD0D0D0' } } };

        itemRow.getCell(2).font = { name: 'TH Sarabun New', size: 24 };
        itemRow.getCell(2).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        itemRow.getCell(2).border = { left: { style: 'thin', color: { argb: 'FFD0D0D0' } } };

        itemRow.getCell(4).font = { name: 'TH Sarabun New', size: 24 };
        itemRow.getCell(4).alignment = { horizontal: 'right', vertical: 'top' };

        itemRow.getCell(5).font = { name: 'TH Sarabun New', size: 24 };
        itemRow.getCell(5).alignment = { horizontal: 'right', vertical: 'top' };
        itemRow.getCell(5).numFmt = '#,##0.00';

        itemRow.getCell(6).font = { name: 'TH Sarabun New', size: 24 };
        itemRow.getCell(6).alignment = { horizontal: 'center', vertical: 'top' };

        itemRow.getCell(7).font = { name: 'TH Sarabun New', size: 24 };
        itemRow.getCell(7).alignment = { horizontal: 'center', vertical: 'top' };

        itemRow.getCell(8).font = { name: 'TH Sarabun New', size: 24 };
        itemRow.getCell(8).alignment = { horizontal: 'left', vertical: 'top' };

        itemRow.getCell(9).font = { name: 'TH Sarabun New', size: 24 };
        itemRow.getCell(9).alignment = { horizontal: 'left', vertical: 'top' };

        itemRow.getCell(13).font = { name: 'TH Sarabun New', size: 24 };
        itemRow.getCell(13).alignment = { horizontal: 'right', vertical: 'top' };

        itemRow.getCell(14).font = { name: 'TH Sarabun New', size: 24 };
        itemRow.getCell(14).alignment = { horizontal: 'right', vertical: 'top' };
        itemRow.getCell(14).numFmt = '#,##0.00';

        itemRow.getCell(15).font = { name: 'TH Sarabun New', size: 24 };
        itemRow.getCell(15).alignment = { horizontal: 'center', vertical: 'top' };

        // Item note in Col U
        const cellU = itemRow.getCell(21);
        cellU.font = { name: 'TH Sarabun New', size: 24 };
        cellU.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        cellU.border = { right: { style: 'thin', color: { argb: 'FFD0D0D0' } } };

        itemRow.height = descText.length > 40 ? 42 : 32;

        currentRow++;
      });

      const itemEndRow = currentRow - 1;

      // Handle Store Discount if any
      const discountVal = Number(inv.discount || 0);
      let discRowIdx: number | null = null;

      if (discountVal > 0) {
        discRowIdx = currentRow;
        const discRow = ws.getRow(discRowIdx);
        discRow.getCell(2).value = 'ส่วนลด';
        discRow.getCell(5).value = discountVal;
        discRow.getCell(6).value = 'บาท';

        discRow.getCell(2).font = { name: 'TH Sarabun New', size: 24, bold: true };
        discRow.getCell(2).alignment = { horizontal: 'center', vertical: 'top' };

        discRow.getCell(5).font = { name: 'TH Sarabun New', size: 24, bold: true };
        discRow.getCell(5).alignment = { horizontal: 'right', vertical: 'top' };
        discRow.getCell(5).numFmt = '#,##0.00';

        discRow.getCell(6).font = { name: 'TH Sarabun New', size: 24, bold: true };
        discRow.getCell(6).alignment = { horizontal: 'left', vertical: 'top' };

        discRow.getCell(1).border = { left: { style: 'thin', color: { argb: 'FFD0D0D0' } } };
        discRow.getCell(21).border = { right: { style: 'thin', color: { argb: 'FFD0D0D0' } } };
        discRow.height = 32;

        currentRow++;
      }

      // Populate Store Header Group Row (Merge B:N for Store Name)
      const storeRow = ws.getRow(storeHeaderRow);
      storeRow.getCell(1).value = storeNum;
      storeRow.getCell(2).value = inv.vendor_name || 'ร้านค้า/บริษัทผู้ขาย';
      formatMergedRange(2, storeHeaderRow, 14, storeHeaderRow, { name: 'TH Sarabun New', size: 24, bold: true }, { horizontal: 'left', vertical: 'top', wrapText: true }, { left: { style: 'thin', color: { argb: 'FFD0D0D0' } } });

      storeRow.getCell(1).font = { name: 'TH Sarabun New', size: 24, bold: true };
      storeRow.getCell(1).alignment = { horizontal: 'center', vertical: 'top' };
      storeRow.getCell(1).border = { left: { style: 'thin', color: { argb: 'FFD0D0D0' } }, right: { style: 'thin', color: { argb: 'FFD0D0D0' } } };

      storeRow.getCell(15).value = '=';
      storeRow.getCell(15).font = { name: 'TH Sarabun New', size: 24 };
      storeRow.getCell(15).alignment = { horizontal: 'right', vertical: 'top' };

      const storeFormula = discRowIdx 
        ? `SUM(N${itemStartRow}:N${itemEndRow})-E${discRowIdx}` 
        : `SUM(N${itemStartRow}:N${itemEndRow})`;

      storeRow.getCell(16).value = { formula: storeFormula }; // Col P
      storeRow.getCell(16).font = { name: 'TH Sarabun New', size: 24, bold: true };
      storeRow.getCell(16).alignment = { horizontal: 'right', vertical: 'top' };
      storeRow.getCell(16).numFmt = '#,##0.00';

      storeRow.getCell(17).value = 'บาท';
      storeRow.getCell(17).font = { name: 'TH Sarabun New', size: 24 };
      storeRow.getCell(17).alignment = { horizontal: 'left', vertical: 'top' };
      storeRow.getCell(17).border = { right: { style: 'thin', color: { argb: 'FFD0D0D0' } } };

      formatMergedRange(18, storeHeaderRow, 20, storeHeaderRow, { name: 'TH Sarabun New', size: 24, bold: true }, { horizontal: 'right', vertical: 'top' }, { left: { style: 'thin', color: { argb: 'FFD0D0D0' } }, right: { style: 'thin', color: { argb: 'FFD0D0D0' } } }, undefined, '#,##0.00');
      storeRow.getCell(18).value = { formula: `P${storeHeaderRow}` }; // Col R

      storeRow.getCell(21).border = { right: { style: 'thin', color: { argb: 'FFD0D0D0' } } };
      storeRow.height = 36;
    });

    // Main Expense Total Row
    const totalRowIdx = currentRow;
    const totalRow = ws.getRow(totalRowIdx);
    totalRow.height = 35;

    totalRow.getCell(1).value = 'รวม';
    totalRow.getCell(1).font = { name: 'TH Sarabun New', size: 24, bold: true };
    totalRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    totalRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F8' } };
    totalRow.getCell(1).border = thinBorder;

    formatMergedRange(2, totalRowIdx, 17, totalRowIdx, { name: 'TH Sarabun New', size: 24, bold: true }, { horizontal: 'center', vertical: 'middle' }, thinBorder, 'FFF2F4F8');
    totalRow.getCell(2).value = { formula: `BAHTTEXT(R${totalRowIdx})` };

    formatMergedRange(18, totalRowIdx, 20, totalRowIdx, { name: 'TH Sarabun New', size: 24, bold: true }, { horizontal: 'center', vertical: 'middle' }, thinBorder, 'FFF2F4F8', '#,##0.00');
    const sumFormulaStr = storeHeaderRows.map(r => `R${r}`).join('+');
    totalRow.getCell(18).value = { formula: sumFormulaStr ? `SUM(${sumFormulaStr})` : `SUM(R${headerRowIdx + 1}:R${totalRowIdx - 1})` };

    totalRow.getCell(21).border = { right: { style: 'thin', color: { argb: 'FFD0D0D0' } } };

    currentRow++;

    // Blank Spacing Row
    ws.getRow(currentRow).height = 20;
    currentRow++;

    // Optional Regulatory / General Notes Row
    if (data.regulatory_text) {
      const regRow = ws.getRow(currentRow);
      regRow.getCell(1).value = `หมายเหตุ:  ${data.regulatory_text}`;
      formatMergedRange(1, currentRow, 21, currentRow, { name: 'TH Sarabun New', size: 25, bold: true }, { horizontal: 'left', vertical: 'middle' });
      regRow.height = 35;
      currentRow++;
    }

    // ---------------------------------------------
    // Reconciliation / Loan Summary Table (Bottom Table)
    // ---------------------------------------------
    const reconR0 = currentRow;

    // Header Row of Reconciliation Table
    const r0Row = ws.getRow(reconR0);
    r0Row.height = 26;

    r0Row.getCell(1).value = 'รายการ';
    formatMergedRange(1, reconR0, 18, reconR0, { name: 'TH Sarabun New', size: 20, bold: true }, { horizontal: 'center', vertical: 'middle' }, thinBorder);

    r0Row.getCell(19).value = 'จำนวน';
    formatMergedRange(19, reconR0, 20, reconR0, { name: 'TH Sarabun New', size: 20, bold: true }, { horizontal: 'center', vertical: 'middle' }, thinBorder);

    r0Row.getCell(21).value = 'หมายเหตุ';
    const cellR0U = r0Row.getCell(21);
    cellR0U.font = { name: 'TH Sarabun New', size: 20, bold: true };
    cellR0U.alignment = { horizontal: 'center', vertical: 'middle' };
    cellR0U.border = thinBorder;

    // Item 1: Loan Advance Amount
    const reconR1 = reconR0 + 1;
    const r1Row = ws.getRow(reconR1);
    r1Row.height = 28.5;
    r1Row.getCell(1).value = 1;
    r1Row.getCell(2).value = 'ยอดเงินยืม สทอภ. ';
    if (data.contract_no) r1Row.getCell(5).value = ` ${data.contract_no}`;
    
    formatMergedRange(19, reconR1, 20, reconR1, { name: 'TH Sarabun New', size: 24, bold: true }, { horizontal: 'center', vertical: 'middle' }, thinBorder, undefined, '#,##0.00');
    r1Row.getCell(19).value = data.advance_amount || 0;
    r1Row.getCell(21).value = 'หมายเหตุ ';

    [1, 2, 21].forEach(c => {
      const cell = r1Row.getCell(c);
      cell.font = { name: 'TH Sarabun New', size: 24, bold: c === 21 };
      cell.alignment = { horizontal: c === 2 ? 'left' : 'center', vertical: 'middle' };
      cell.border = thinBorder;
    });

    // Item 2: Withholding Tax
    const reconR2 = reconR0 + 2;
    const r2Row = ws.getRow(reconR2);
    r2Row.height = 35;
    r2Row.getCell(1).value = 2;
    r2Row.getCell(2).value = 'หักภาษี ณ ที่จ่าย (จะกรอกต่อเมื่อ มีการหักภาษี ณ ที่จ่าย จากสัญญายืมเงิน \nตั้งแต่ได้รับเงินยืม)';
    
    formatMergedRange(19, reconR2, 20, reconR2, { name: 'TH Sarabun New', size: 24 }, { horizontal: 'center', vertical: 'middle' }, thinBorder, undefined, '#,##0.00');
    r2Row.getCell(19).value = 0;

    [1, 2, 21].forEach(c => {
      const cell = r2Row.getCell(c);
      cell.font = { name: 'TH Sarabun New', size: 24 };
      cell.alignment = { horizontal: c === 2 ? 'left' : 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });

    // Item 3: Net Advance (1-2)
    const reconR3 = reconR0 + 3;
    const r3Row = ws.getRow(reconR3);
    r3Row.height = 28.5;
    r3Row.getCell(1).value = 3;
    r3Row.getCell(2).value = 'ยอดเงินสุทธิ (1-2)';
    
    formatMergedRange(19, reconR3, 20, reconR3, { name: 'TH Sarabun New', size: 24 }, { horizontal: 'center', vertical: 'middle' }, thinBorder, undefined, '#,##0.00');
    r3Row.getCell(19).value = { formula: `S${reconR1}-S${reconR2}` };

    [1, 2, 21].forEach(c => {
      const cell = r3Row.getCell(c);
      cell.font = { name: 'TH Sarabun New', size: 24 };
      cell.alignment = { horizontal: c === 2 ? 'left' : 'center', vertical: 'middle' };
      cell.border = thinBorder;
    });

    // Item 4: Total Expense
    const reconR4 = reconR0 + 4;
    const r4Row = ws.getRow(reconR4);
    r4Row.height = 28.5;
    r4Row.getCell(1).value = 4;
    r4Row.getCell(2).value = 'ค่าใช้จ่ายทั้งหมด';
    
    formatMergedRange(19, reconR4, 20, reconR4, { name: 'TH Sarabun New', size: 24 }, { horizontal: 'center', vertical: 'middle' }, thinBorder, undefined, '#,##0.00');
    r4Row.getCell(19).value = { formula: `R${totalRowIdx}` };

    [1, 2, 21].forEach(c => {
      const cell = r4Row.getCell(c);
      cell.font = { name: 'TH Sarabun New', size: 24 };
      cell.alignment = { horizontal: c === 2 ? 'left' : 'center', vertical: 'middle' };
      cell.border = thinBorder;
    });

    // Item 5: Advance Minus Expense (1-4)
    const reconR5 = reconR0 + 5;
    const r5Row = ws.getRow(reconR5);
    r5Row.height = 28.5;
    r5Row.getCell(1).value = 5;
    r5Row.getCell(2).value = 'เงินยืม หัก ยอดค่าใช้จ่าย  (1-4)';
    
    formatMergedRange(19, reconR5, 20, reconR5, { name: 'TH Sarabun New', size: 24 }, { horizontal: 'center', vertical: 'middle' }, thinBorder, undefined, '#,##0.00');
    r5Row.getCell(19).value = { formula: `S${reconR3}-S${reconR4}` };

    [1, 2, 21].forEach(c => {
      const cell = r5Row.getCell(c);
      cell.font = { name: 'TH Sarabun New', size: 24 };
      cell.alignment = { horizontal: c === 2 ? 'left' : 'center', vertical: 'middle' };
      cell.border = thinBorder;
    });

    // Item 6: Forex Gain/Loss
    const reconR6 = reconR0 + 6;
    const r6Row = ws.getRow(reconR6);
    r6Row.height = 28.5;
    r6Row.getCell(1).value = 6;
    r6Row.getCell(2).value = 'กำไร/ขาดทุนจากอัตราแลกเปลี่ยน ';
    
    formatMergedRange(19, reconR6, 20, reconR6, { name: 'TH Sarabun New', size: 24 }, { horizontal: 'center', vertical: 'middle' }, thinBorder, undefined, '#,##0.00');
    r6Row.getCell(19).value = 0;

    [1, 2, 21].forEach(c => {
      const cell = r6Row.getCell(c);
      cell.font = { name: 'TH Sarabun New', size: 24 };
      cell.alignment = { horizontal: c === 2 ? 'left' : 'center', vertical: 'middle' };
      cell.border = thinBorder;
    });

    // Final Refund / Remaining Return Row
    const reconR7 = reconR0 + 7;
    const r7Row = ws.getRow(reconR7);
    r7Row.height = 28.5;

    formatMergedRange(1, reconR7, 18, reconR7, { name: 'TH Sarabun New', size: 24, bold: true }, { horizontal: 'left', vertical: 'middle' }, thinBorder, 'FFF2F4F8');
    r7Row.getCell(2).value = 'คงเหลือเงินคืน สทอภ.   (5-6)';
    
    formatMergedRange(19, reconR7, 20, reconR7, { name: 'TH Sarabun New', size: 24, bold: true }, { horizontal: 'center', vertical: 'middle' }, thinBorder, 'FFF2F4F8', '#,##0.00');
    r7Row.getCell(19).value = { formula: `S${reconR5}-S${reconR6}` };

    r7Row.getCell(21).font = { name: 'TH Sarabun New', size: 24, bold: true };
    r7Row.getCell(21).border = thinBorder;
    r7Row.getCell(21).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F8' } };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
