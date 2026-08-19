import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import personnel from '../data/personnel.json';
import staffSbr from '../data/staff_sbr.json';
import contacts from '../data/contacts.json';
import directors from '../data/directors.json';

// Helper to get person's title and rate under GISTDA
const getGistdaAllowanceRate = (name: string, isExecutive: boolean, isDirector = false) => {
  if (isExecutive) {
    const exec = personnel.find(p => p.name === name);
    const title = exec ? exec.title : '';
    if (title === 'ผสทอภ.' || title === 'รอง ผสทอภ.') {
      return 800;
    }
    return 600; // Default executive rate (ผอ.สำนัก)
  } else if (isDirector || directors.some(d => d.name === name)) {
    return 600; // Directors get 600
  } else {
    const staff = staffSbr.find(s => s.name === name) || contacts.find(c => c.name === name);
    const title = staff ? (staff as any).title || (staff as any).position || '' : '';
    if (title.includes('ผู้อำนวยการสำนัก') || title.includes('ผู้อำนวยการ') || title.includes('ผอ.')) {
      return 600;
    }
    return 400; // Default staff rate
  }
};

const getGovAllowanceRate = (_name: string, isExecutive: boolean) => {
  if (isExecutive) {
    return 270; // Gov executive training allowance
  } else {
    return 240; // Gov staff training allowance
  }
};

// Helper to parse date string or return a list of days
const getThaiDayDates = (startDateStr: string, daysCount: number) => {
  const daysOfWeek = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const datesList: string[] = [];
  const baseDate = new Date(startDateStr);

  if (!isNaN(baseDate.getTime())) {
    for (let i = 0; i < daysCount; i++) {
      const targetDate = new Date(baseDate);
      targetDate.setDate(baseDate.getDate() + i);

      const dayName = daysOfWeek[targetDate.getDay()];
      const dayNum = targetDate.getDate();
      const monthName = months[targetDate.getMonth()];
      const yearTh = targetDate.getFullYear() + 543;

      datesList.push(`${dayName}ที่ ${dayNum} ${monthName} ${yearTh}`);
    }
  } else {
    for (let i = 1; i <= daysCount; i++) {
      datesList.push(`วันปฏิบัติการวันที่ ${i}`);
    }
  }
  return datesList;
};

export const exportToExcel = async (formData: any, _calculationResult: any) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('ประมาณการ (2)');

  // Enable gridlines
  worksheet.views = [{ showGridLines: true }];

  // Page setup for printing (A4, Portrait, Fit all columns to 1 page wide)
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.03937,
      right: 0.03937,
      top: 0.03937,
      bottom: 0.03937,
      header: 0,
      footer: 0
    }
  };

  // Column settings matching template
  worksheet.columns = [
    { key: 'colA', width: 4.57 },
    { key: 'colB', width: 45.71 },
    { key: 'colC', width: 25.71 },
    { key: 'colD', width: 2.57 },
    { key: 'colE', width: 13.43 },
    { key: 'colF', width: 4.86 },
    { key: 'colG', width: 1.86 },
    { key: 'colH', width: 14.0 },
    { key: 'colI', width: 5.43 },
    { key: 'colJ', width: 15.86 },
    { key: 'colK', width: 20.71 },
  ];

  // Helper for applying TH SarabunPSK styling
  const applyCellStyle = (cell: ExcelJS.Cell, size = 16, bold = false, alignHorizontal: 'left' | 'center' | 'right' = 'left') => {
    const colNum = typeof cell.col === 'number' ? cell.col : parseInt(cell.col);
    // Only wrap text for columns B (2) and C (3) which contain long project descriptions
    const shouldWrap = colNum === 2 || colNum === 3;

    cell.font = {
      name: 'TH Sarabun New',
      size: size,
      bold: bold
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: alignHorizontal,
      wrapText: shouldWrap
    };
  };

  const stripNickname = (n: string) => n.replace(/\s*\([^)]*\)/g, '').trim();

  const applyCellFill = (cell: ExcelJS.Cell, color = 'D8D8D8') => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF' + color }
    };
  };

  const applyBorders = (cell: ExcelJS.Cell) => {
    const colNum = typeof cell.col === 'number' ? cell.col : parseInt(cell.col);
    const rowNum = typeof cell.row === 'number' ? cell.row : parseInt(cell.row as any);
    const row = worksheet.getRow(rowNum);

    // Check if the row has a value in column A (Item numbers, headers, totals)
    const valA = row.getCell('A').value;
    const isMainRow = valA !== null && valA !== undefined && valA !== '';

    const thinBorder = { style: 'thin', color: { argb: 'FFB0B0B0' } };

    // Determine horizontal borders (Headers, Totals, and Main Row headers get Top/Bottom)
    let topBorder: any = undefined;
    let bottomBorder: any = undefined;

    if (isMainRow || rowNum === 3) {
      topBorder = thinBorder;
      bottomBorder = thinBorder;
    }

    // Determine vertical borders
    let leftBorder: any = undefined;
    let rightBorder: any = undefined;

    if (colNum === 1) { // A
      leftBorder = thinBorder;
      rightBorder = thinBorder;
    } else if (colNum === 2) { // B
      leftBorder = thinBorder;
      rightBorder = undefined;
    } else if (colNum >= 3 && colNum <= 9) { // C-I
      leftBorder = undefined;
      rightBorder = undefined;
    } else if (colNum === 10) { // J
      leftBorder = thinBorder;
      rightBorder = thinBorder;
    } else if (colNum === 11) { // K
      leftBorder = thinBorder;
      rightBorder = thinBorder;
    }

    cell.border = {
      top: topBorder,
      bottom: bottomBorder,
      left: leftBorder,
      right: rightBorder
    };
  };

  // Row 1: Title
  worksheet.mergeCells('A1:K1');
  const titleRow = worksheet.getRow(1);
  titleRow.height = 30;
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'ประมาณการค่าใช้จ่าย';
  applyCellStyle(titleCell, 16, true, 'center');

  // Row 2: Project subtitle & details
  worksheet.mergeCells('A2:K2');
  const subtitleRow = worksheet.getRow(2);
  subtitleRow.height = 70;
  const subtitleCell = worksheet.getCell('A2');

  const daysCount = parseInt(formData.days) || 1;
  const projectName = formData.projectName || (formData.activityType === 'meeting' ? 'การประชุม' : formData.activityType === 'field_trip' ? 'การลงพื้นที่ภาคสนาม' : 'โครงการฝึกอบรม');
  const dateRangeStr = formData.date ? `${formData.date}` : 'ตลอดระยะเวลาโครงการ';
  const activityTitlePrefix = formData.activityType === 'meeting' ? 'การประชุม' : formData.activityType === 'field_trip' ? 'การลงพื้นที่ภาคสนาม' : 'การอบรมเชิงปฏิบัติการ';

  subtitleCell.value = `${activityTitlePrefix} ${projectName}\n${dateRangeStr} (รวมระยะเวลา ${daysCount} วัน)\nณ ${formData.location || ''}`;
  applyCellStyle(subtitleCell, 16, true, 'center');

  // Row 3: Headers
  const headerRow = worksheet.getRow(3);
  headerRow.height = 25;

  worksheet.mergeCells('B3:I3');

  const cellA3 = worksheet.getCell('A3'); cellA3.value = 'ที่'; applyCellStyle(cellA3, 16, true, 'center'); applyBorders(cellA3);
  const cellB3 = worksheet.getCell('B3'); cellB3.value = 'รายละเอียด'; applyCellStyle(cellB3, 16, true, 'center');
  for (let c = 2; c <= 9; c++) { applyBorders(worksheet.getCell(3, c)); } // Apply borders for B3:I3 merged range

  const cellJ3 = worksheet.getCell('J3'); cellJ3.value = 'บาท'; applyCellStyle(cellJ3, 16, true, 'center'); applyBorders(cellJ3);
  const cellK3 = worksheet.getCell('K3'); cellK3.value = 'หมายเหตุ'; applyCellStyle(cellK3, 16, true, 'center'); applyBorders(cellK3);

  for (let c = 1; c <= 11; c++) {
    applyCellFill(worksheet.getCell(3, c));
  }

  // Setup rates based on regulation
  const isGistda = formData.regulation === 'ระเบียบ สทอภ. (GISTDA)';
  const rates = {
    foodBreak: isGistda ? 100 : 35, // 100 per meal, 2 breaks = 200/day
    foodLunch: isGistda ? 400 : 300,
    foodReception: isGistda ? 1000 : 500,
    speakerThaiNormal: isGistda ? 1200 : 600,
    speakerThaiExpert: isGistda ? 3000 : 1200,
    speakerForeign: isGistda ? 5000 : 2000,
    travelFee: 5000,
    staffRoomDouble: isGistda ? 1400 : 900,
    staffRoomSingle: isGistda ? 1400 : 1200,
    execRoom: isGistda ? 1400 : 1400,
    speakerRoom: isGistda ? 1400 : 1400
  };

  const datesTh = getThaiDayDates(formData.date, daysCount);
  let rIndex = 4; // Data rows start at 4
  const itemTotalRowRefs: string[] = []; // Stores cell references for Grand Total

  if (formData.activityType === 'training') {
    // ==========================================
    // ITEM 1: เบี้ยเลี้ยง ผู้บริหารและเจ้าหน้าที่
    // ==========================================
    const staffNames = [...(formData.staffNames || []), ...(formData.otherStaffNames || [])];
    const executiveNames = formData.executiveNames || [];
    const directorNames = formData.directorNames || [];

    if (staffNames.length > 0 || executiveNames.length > 0 || directorNames.length > 0) {
      const item1StartRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`A${rIndex}`).value = 1;
      worksheet.getCell(`B${rIndex}`).value = 'ค่าเบี้ยเลี้ยง ผู้บริหารและเจ้าหน้าที่ สทอภ. ';

      // Draw cells styling for header row
      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 1 ? 'center' : (c === 10 ? 'right' : 'left'));
        applyBorders(cell);
      }
      rIndex++;

      const subtotalRows: number[] = [];

      // Loop through days
      for (let d = 0; d < daysCount; d++) {
        const dayHeaderRow = rIndex;
        subtotalRows.push(dayHeaderRow);
        worksheet.getRow(rIndex).height = 22;
        worksheet.getCell(`B${rIndex}`).value = datesTh[d];
        worksheet.getCell(`H${rIndex}`).value = ''; // Will fill formula later
        worksheet.getCell(`I${rIndex}`).value = 'บาท';

        for (let c = 1; c <= 11; c++) {
          const cell = worksheet.getCell(rIndex, c);
          applyCellStyle(cell, 16, true, c === 8 ? 'right' : 'left');
          applyBorders(cell);
        }
        rIndex++;

        const pStart = rIndex;

        // Executives
        executiveNames.forEach((name: string) => {
          const rate = isGistda ? getGistdaAllowanceRate(name, true) : getGovAllowanceRate(name, true);
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ` - ${stripNickname(name)}`;
          worksheet.getCell(`C${row}`).value = `(${rate.toLocaleString()}บาท*1วัน*1คน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rate}*1*1` };
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        });

        // Directors
        directorNames.forEach((name: string) => {
          const rate = isGistda ? getGistdaAllowanceRate(name, false, true) : getGovAllowanceRate(name, true);
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ` - ${stripNickname(name)}`;
          worksheet.getCell(`C${row}`).value = `(${rate.toLocaleString()}บาท*1วัน*1คน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rate}*1*1` };
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        });

        // Staff
        staffNames.forEach((name: string) => {
          const rate = isGistda ? getGistdaAllowanceRate(name, false) : getGovAllowanceRate(name, false);
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ` - ${stripNickname(name)}`;
          worksheet.getCell(`C${row}`).value = `(${rate.toLocaleString()}บาท*1วัน*1คน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rate}*1*1` };
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        });

        const pEnd = rIndex - 1;

        // Update day subtotal formula
        if (pEnd >= pStart) {
          worksheet.getCell(`H${dayHeaderRow}`).value = { formula: `SUM(E${pStart}:E${pEnd})` };
          worksheet.getCell(`H${dayHeaderRow}`).numFmt = '#,##0.00';
        } else {
          worksheet.getCell(`H${dayHeaderRow}`).value = 0;
        }
      }

      // Set item total in column J of start row
      if (subtotalRows.length > 0) {
        const sumStr = subtotalRows.map(r => `H${r}`).join('+');
        worksheet.getCell(`J${item1StartRow}`).value = { formula: sumStr };
        worksheet.getCell(`J${item1StartRow}`).numFmt = '#,##0.00';
        itemTotalRowRefs.push(`J${item1StartRow}`);
      }
    }

    // ==========================================
    // ITEM 2: ค่าสมนาคุณวิทยากร
    // ==========================================
    const spkThaiNorm = parseInt(formData.speakerThaiNormal) || 0;
    const spkThaiExp = parseInt(formData.speakerThaiExpert) || 0;
    const spkForeign = parseInt(formData.speakerForeign) || 0;
    const totalSpeakers = spkThaiNorm + spkThaiExp + spkForeign;

    if (totalSpeakers > 0) {
      const item2StartRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`A${rIndex}`).value = itemTotalRowRefs.length + 1;
      worksheet.getCell(`B${rIndex}`).value = 'ค่าสมนาคุณวิทยากร';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 1 ? 'center' : (c === 10 ? 'right' : 'left'));
        applyBorders(cell);
      }
      rIndex++;

      const subtotalRows: number[] = [];

      for (let d = 0; d < daysCount; d++) {
        const dayHeaderRow = rIndex;
        subtotalRows.push(dayHeaderRow);
        worksheet.getRow(rIndex).height = 22;
        worksheet.getCell(`B${rIndex}`).value = datesTh[d];
        worksheet.getCell(`H${rIndex}`).value = '';
        worksheet.getCell(`I${rIndex}`).value = 'บาท';

        for (let c = 1; c <= 11; c++) {
          const cell = worksheet.getCell(rIndex, c);
          applyCellStyle(cell, 16, true, c === 8 ? 'right' : 'left');
          applyBorders(cell);
        }
        rIndex++;

        const pStart = rIndex;

        // Normal Thai Speaker
        if (spkThaiNorm > 0) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - ค่าสมนาคุณวิทยากรไทย (ปกติ)';
          worksheet.getCell(`C${row}`).value = `(${rates.speakerThaiNormal.toLocaleString()}บาท*6ชม.*${spkThaiNorm}คน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rates.speakerThaiNormal}*6*${spkThaiNorm}` };
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        // Expert Thai Speaker
        if (spkThaiExp > 0) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - ค่าสมนาคุณวิทยากรไทย (เชี่ยวชาญ)';
          worksheet.getCell(`C${row}`).value = `(${rates.speakerThaiExpert.toLocaleString()}บาท*6ชม.*${spkThaiExp}คน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rates.speakerThaiExpert}*6*${spkThaiExp}` };
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        // Foreign Speaker
        if (spkForeign > 0) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - ค่าสมนาคุณวิทยากรต่างประเทศ';
          worksheet.getCell(`C${row}`).value = `(${rates.speakerForeign.toLocaleString()}บาท*6ชม.*${spkForeign}คน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rates.speakerForeign}*6*${spkForeign}` };
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        const pEnd = rIndex - 1;
        if (pEnd >= pStart) {
          worksheet.getCell(`H${dayHeaderRow}`).value = { formula: `SUM(E${pStart}:E${pEnd})` };
          worksheet.getCell(`H${dayHeaderRow}`).numFmt = '#,##0.00';
        } else {
          worksheet.getCell(`H${dayHeaderRow}`).value = 0;
        }
      }

      if (subtotalRows.length > 0) {
        const sumStr = subtotalRows.map(r => `H${r}`).join('+');
        worksheet.getCell(`J${item2StartRow}`).value = { formula: sumStr };
        worksheet.getCell(`J${item2StartRow}`).numFmt = '#,##0.00';
        itemTotalRowRefs.push(`J${item2StartRow}`);
      }
    }

    // ==========================================
    // ITEM 3: ค่าที่พัก วิทยากร และ จนท.สทอภ.
    // ==========================================
    const nightsCount = Math.max(0, daysCount - 1);
    const staffNeedsRoom = formData.staffNeedsRoom;
    const executivesNeedRoom = formData.executivesNeedRoom;
    const directorsNeedRoom = formData.directorsNeedRoom;
    const dRooms = parseInt(formData.staffDoubleRooms) || 0;
    const sRooms = parseInt(formData.staffSingleRooms) || 0;
    const execRooms = executivesNeedRoom ? executiveNames.length : 0;
    const dirRooms = directorsNeedRoom ? directorNames.length : 0;
    const spkRooms = totalSpeakers; // Assume speakers need individual rooms

    if (nightsCount > 0 && (staffNeedsRoom || executivesNeedRoom || directorsNeedRoom || totalSpeakers > 0)) {
      const item3StartRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`A${rIndex}`).value = itemTotalRowRefs.length + 1;
      worksheet.getCell(`B${rIndex}`).value = 'ค่าที่พัก วิทยากร และ จนท.สทอภ. ';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 1 ? 'center' : (c === 10 ? 'right' : 'left'));
        applyBorders(cell);
      }
      rIndex++;

      const subtotalRows: number[] = [];

      // Loop through nights
      for (let n = 1; n <= nightsCount; n++) {
        const nightHeaderRow = rIndex;
        subtotalRows.push(nightHeaderRow);
        worksheet.getRow(rIndex).height = 22;
        worksheet.getCell(`B${rIndex}`).value = `ที่พักคืนวันที่ ${n}`;
        worksheet.getCell(`H${rIndex}`).value = '';
        worksheet.getCell(`I${rIndex}`).value = 'บาท';

        for (let c = 1; c <= 11; c++) {
          const cell = worksheet.getCell(rIndex, c);
          applyCellStyle(cell, 16, true, c === 8 ? 'right' : 'left');
          applyBorders(cell);
        }
        rIndex++;

        const pStart = rIndex;

        // Speaker Lodging
        if (spkRooms > 0) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - ค่าที่พักวิทยากร';
          worksheet.getCell(`C${row}`).value = `(${rates.speakerRoom.toLocaleString()}บาท*${spkRooms}ห้อง*1คืน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rates.speakerRoom}*${spkRooms}*1` };
          worksheet.getCell(`F${row}`).value = 'บาท';
          worksheet.getCell(`K${row}`).value = 'วิทยากร (ห้องเดี่ยว)';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        // Executive Lodging
        if (execRooms > 0) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - ค่าที่พักผู้บริหาร';
          worksheet.getCell(`C${row}`).value = `(${rates.execRoom.toLocaleString()}บาท*${execRooms}ห้อง*1คืน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rates.execRoom}*${execRooms}*1` };
          worksheet.getCell(`F${row}`).value = 'บาท';
          worksheet.getCell(`K${row}`).value = 'ผู้บริหาร (ห้องเดี่ยว)';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        // Director Lodging
        if (dirRooms > 0) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - ค่าที่พักผู้อำนวยการ';
          worksheet.getCell(`C${row}`).value = `(${rates.execRoom.toLocaleString()}บาท*${dirRooms}ห้อง*1คืน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rates.execRoom}*${dirRooms}*1` };
          worksheet.getCell(`F${row}`).value = 'บาท';
          worksheet.getCell(`K${row}`).value = 'ผู้อำนวยการ (ห้องเดี่ยว)';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        // Staff Twin/Double Lodging
        if (staffNeedsRoom && dRooms > 0) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - ค่าที่พักเจ้าหน้าที่ (ห้องคู่)';
          worksheet.getCell(`C${row}`).value = `(${rates.staffRoomDouble.toLocaleString()}บาท*${dRooms}ห้อง*1คืน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rates.staffRoomDouble}*${dRooms}*1` };
          worksheet.getCell(`F${row}`).value = 'บาท';
          worksheet.getCell(`K${row}`).value = 'พักคู่';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        // Staff Single Lodging
        if (staffNeedsRoom && sRooms > 0) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - ค่าที่พักเจ้าหน้าที่ (ห้องเดี่ยว)';
          worksheet.getCell(`C${row}`).value = `(${rates.staffRoomSingle.toLocaleString()}บาท*${sRooms}ห้อง*1คืน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rates.staffRoomSingle}*${sRooms}*1` };
          worksheet.getCell(`F${row}`).value = 'บาท';
          worksheet.getCell(`K${row}`).value = 'พักเดี่ยว';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        const pEnd = rIndex - 1;
        if (pEnd >= pStart) {
          worksheet.getCell(`H${nightHeaderRow}`).value = { formula: `SUM(E${pStart}:E${pEnd})` };
          worksheet.getCell(`H${nightHeaderRow}`).numFmt = '#,##0.00';
        } else {
          worksheet.getCell(`H${nightHeaderRow}`).value = 0;
        }
      }

      if (subtotalRows.length > 0) {
        const sumStr = subtotalRows.map(r => `H${r}`).join('+');
        worksheet.getCell(`J${item3StartRow}`).value = { formula: sumStr };
        worksheet.getCell(`J${item3StartRow}`).numFmt = '#,##0.00';
        itemTotalRowRefs.push(`J${item3StartRow}`);
      }
    }

    // ==========================================
    // ITEM 4: ค่าพาหนะวิทยากร
    // ==========================================
    const flightFees = (formData.speakerForeignFlightFees || []).map((f: any) => parseFloat(f) || 0);
    const totalFlightFee = flightFees.reduce((acc: number, val: number) => acc + val, 0);
    const taxiRate = formData.speakerTaxiFee ? (parseFloat(formData.speakerTaxiFee) || 0) : 1000;

    if (totalSpeakers > 0 && (formData.speakerNeedsTravel || totalFlightFee > 0)) {
      const item4StartRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`A${rIndex}`).value = itemTotalRowRefs.length + 1;
      worksheet.getCell(`B${rIndex}`).value = 'ค่าพาหนะวิทยากร';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 1 ? 'center' : (c === 10 ? 'right' : 'left'));
        applyBorders(cell);
      }
      rIndex++;

      const subtotalRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`B${rIndex}`).value = ' - ค่าพาหนะวิทยากรเดินทาง (ไป-กลับ)';
      worksheet.getCell(`H${rIndex}`).value = '';
      worksheet.getCell(`I${rIndex}`).value = 'บาท';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 8 ? 'right' : 'left');
        applyBorders(cell);
      }
      rIndex++;

      const pStart = rIndex;

      if (formData.speakerNeedsTravel) {
        // 1. Normal Thai Speakers
        for (let i = 1; i <= spkThaiNorm; i++) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = `   - ค่าพาหนะวิทยากรไทย (ปกติ) ท่านที่ ${i}`;
          worksheet.getCell(`C${row}`).value = taxiRate > 0 ? `(${taxiRate.toLocaleString()}บาท/คน)` : '';
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = taxiRate > 0 ? taxiRate : '';
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        // 2. Expert Thai Speakers
        for (let i = 1; i <= spkThaiExp; i++) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = `   - ค่าพาหนะวิทยากรไทย (เชี่ยวชาญ) ท่านที่ ${i}`;
          worksheet.getCell(`C${row}`).value = taxiRate > 0 ? `(${taxiRate.toLocaleString()}บาท/คน)` : '';
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = taxiRate > 0 ? taxiRate : '';
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        // 3. Foreign Speakers
        for (let i = 1; i <= spkForeign; i++) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = `   - ค่าพาหนะวิทยากรต่างประเทศ ท่านที่ ${i}`;
          worksheet.getCell(`C${row}`).value = taxiRate > 0 ? `(${taxiRate.toLocaleString()}บาท/คน)` : '';
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = taxiRate > 0 ? taxiRate : '';
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }
      }

      // 4. Foreign Speaker Flight Tickets (per speaker)
      flightFees.forEach((fee: number, idx: number) => {
        if (fee > 0) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = `   - ค่าบัตรโดยสารเครื่องบินวิทยากรต่างประเทศ ท่านที่ ${idx + 1} (ไป-กลับ)`;
          worksheet.getCell(`C${row}`).value = '(ตามจ่ายจริง)';
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = fee;
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }
      });

      const pEnd = rIndex - 1;
      if (pEnd >= pStart) {
        // Filter out empty rows when summing in excel (so SUM is correct)
        const sumRange = `E${pStart}:E${pEnd}`;
        worksheet.getCell(`H${subtotalRow}`).value = { formula: `SUM(${sumRange})` };
        worksheet.getCell(`H${subtotalRow}`).numFmt = '#,##0.00';
      } else {
        worksheet.getCell(`H${subtotalRow}`).value = 0;
      }

      worksheet.getCell(`J${item4StartRow}`).value = { formula: `H${subtotalRow}` };
      worksheet.getCell(`J${item4StartRow}`).numFmt = '#,##0.00';
      itemTotalRowRefs.push(`J${item4StartRow}`);
    }

    // ==========================================
    // ITEM 5: ค่าทางด่วนสำหรับวิทยากร
    // ==========================================
    const tollFee = parseInt(formData.tollFee) || 0;
    if (tollFee > 0) {
      const item5StartRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`A${rIndex}`).value = itemTotalRowRefs.length + 1;
      worksheet.getCell(`B${rIndex}`).value = 'ค่าทางด่วนสำหรับวิทยากร';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 1 ? 'center' : (c === 10 ? 'right' : 'left'));
        applyBorders(cell);
      }
      rIndex++;

      const subtotalRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`B${rIndex}`).value = ' - ค่าทางด่วน';
      worksheet.getCell(`H${rIndex}`).value = '';
      worksheet.getCell(`I${rIndex}`).value = 'บาท';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 8 ? 'right' : 'left');
        applyBorders(cell);
      }
      rIndex++;

      const pRow = rIndex++;
      worksheet.getRow(pRow).height = 22;
      worksheet.getCell(`B${pRow}`).value = '   - ด่านทางด่วนสถานที่จัดงาน';
      worksheet.getCell(`C${pRow}`).value = 'ตามจ่ายจริง';
      worksheet.getCell(`D${pRow}`).value = '=';
      worksheet.getCell(`E${pRow}`).value = tollFee;
      worksheet.getCell(`F${pRow}`).value = 'บาท';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(pRow, c);
        applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
        if (c === 5) cell.numFmt = '#,##0.00';
        applyBorders(cell);
      }

      worksheet.getCell(`H${subtotalRow}`).value = { formula: `SUM(E${pRow}:E${pRow})` };
      worksheet.getCell(`H${subtotalRow}`).numFmt = '#,##0.00';

      worksheet.getCell(`J${item5StartRow}`).value = { formula: `H${subtotalRow}` };
      worksheet.getCell(`J${item5StartRow}`).numFmt = '#,##0.00';
      itemTotalRowRefs.push(`J${item5StartRow}`);
    }

    // ==========================================
    // ITEM 6: ค่าอาหารว่าง - เครื่องดื่ม และ อาหารกลางวัน
    // ==========================================
    const totalAttendees = parseInt(formData.totalAttendees) || 0;
    const staffCount = parseInt(formData.staffCount) || 0;
    const totalPeople = totalAttendees + staffCount + executiveNames.length + directorNames.length;

    if (totalPeople > 0 && (formData.foodBreakMorning || formData.foodBreakAfternoon || formData.foodLunch || formData.foodReception)) {
      const item6StartRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`A${rIndex}`).value = itemTotalRowRefs.length + 1;
      worksheet.getCell(`B${rIndex}`).value = 'ค่าอาหารว่าง - เครื่องดื่ม และ อาหารกลางวัน  (สถานที่ราชการ)';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 1 ? 'center' : (c === 10 ? 'right' : 'left'));
        applyBorders(cell);
      }
      rIndex++;

      const subtotalRows: number[] = [];

      for (let d = 0; d < daysCount; d++) {
        const dayHeaderRow = rIndex;
        subtotalRows.push(dayHeaderRow);
        worksheet.getRow(rIndex).height = 22;
        worksheet.getCell(`B${rIndex}`).value = datesTh[d];
        worksheet.getCell(`H${rIndex}`).value = '';
        worksheet.getCell(`I${rIndex}`).value = 'บาท';

        for (let c = 1; c <= 11; c++) {
          const cell = worksheet.getCell(rIndex, c);
          applyCellStyle(cell, 16, true, c === 8 ? 'right' : 'left');
          applyBorders(cell);
        }
        rIndex++;

        const pStart = rIndex;

        // Morning Food Break (Snack)
        if (formData.foodBreakMorning && formData.foodBreakMorningDays.includes(d + 1)) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - ค่าอาหารว่าง - เครื่องดื่ม (เช้า)';
          worksheet.getCell(`C${row}`).value = `(${rates.foodBreak}บาท*${totalPeople}คน*1มื้อ*1วัน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rates.foodBreak}*${totalPeople}*1*1` };
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        // Afternoon Food Break (Snack)
        if (formData.foodBreakAfternoon && formData.foodBreakAfternoonDays.includes(d + 1)) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - ค่าอาหารว่าง - เครื่องดื่ม (บ่าย)';
          worksheet.getCell(`C${row}`).value = `(${rates.foodBreak}บาท*${totalPeople}คน*1มื้อ*1วัน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rates.foodBreak}*${totalPeople}*1*1` };
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        // Lunch
        if (formData.foodLunch && formData.foodLunchDays.includes(d + 1)) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - อาหารกลางวัน';
          worksheet.getCell(`C${row}`).value = `(${rates.foodLunch}บาท*${totalPeople}คน*1วัน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rates.foodLunch}*${totalPeople}*1` };
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        // Reception / Dinner
        if (formData.foodReception && formData.foodReceptionDays.includes(d + 1)) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - อาหารเลี้ยงรับรอง';
          worksheet.getCell(`C${row}`).value = `(${rates.foodReception}บาท*${totalPeople}คน*1วัน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rates.foodReception}*${totalPeople}*1` };
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        const pEnd = rIndex - 1;
        if (pEnd >= pStart) {
          worksheet.getCell(`H${dayHeaderRow}`).value = { formula: `SUM(E${pStart}:E${pEnd})` };
          worksheet.getCell(`H${dayHeaderRow}`).numFmt = '#,##0.00';
        } else {
          worksheet.getCell(`H${dayHeaderRow}`).value = 0;
        }
      }

      const otherFoodAmount = parseFloat(formData.foodOthersAmount) || 0;
      if (otherFoodAmount > 0) {
        const otherHeaderRow = rIndex++;
        subtotalRows.push(otherHeaderRow);
        worksheet.getRow(otherHeaderRow).height = 22;
        worksheet.getCell(`B${otherHeaderRow}`).value = ' - ' + (formData.foodOthersDetails || 'ค่าอาหารและเครื่องดื่มอื่นๆ (เพิ่มเติม)');
        worksheet.getCell(`H${otherHeaderRow}`).value = otherFoodAmount;
        worksheet.getCell(`I${otherHeaderRow}`).value = 'บาท';

        for (let c = 1; c <= 11; c++) {
          const cell = worksheet.getCell(otherHeaderRow, c);
          applyCellStyle(cell, 16, true, c === 8 ? 'right' : 'left');
          if (c === 8) cell.numFmt = '#,##0.00';
          applyBorders(cell);
        }
      }

      if (subtotalRows.length > 0) {
        const sumStr = subtotalRows.map(r => `H${r}`).join('+');
        worksheet.getCell(`J${item6StartRow}`).value = { formula: sumStr };
        worksheet.getCell(`J${item6StartRow}`).numFmt = '#,##0.00';
        itemTotalRowRefs.push(`J${item6StartRow}`);
      }
    }

    // ==========================================
    // ITEM 7: ค่าใช้จ่ายอื่นๆ (ระบุชื่อรายการและจำนวนเงิน)
    // ==========================================
    const customOtherAmount = parseFloat(formData.otherExpenseAmount) || 0;
    const customOtherList = formData.otherExpenses || [];
    const hasCustomOthers = customOtherAmount > 0 || customOtherList.some((e: any) => (parseFloat(e.amount) || 0) > 0);

    if (hasCustomOthers) {
      const item7StartRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`A${rIndex}`).value = itemTotalRowRefs.length + 1;
      worksheet.getCell(`B${rIndex}`).value = 'ค่าใช้จ่ายอื่นๆ';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 1 ? 'center' : (c === 10 ? 'right' : 'left'));
        applyBorders(cell);
      }
      rIndex++;

      const subtotalRows: number[] = [];

      if (customOtherAmount > 0) {
        const row = rIndex++;
        subtotalRows.push(row);
        worksheet.getRow(row).height = 22;
        worksheet.getCell(`B${row}`).value = ' - ' + (formData.otherExpenseName || 'ค่าใช้จ่ายอื่นๆ');
        worksheet.getCell(`C${row}`).value = 'ตามจ่ายจริง';
        worksheet.getCell(`D${row}`).value = '=';
        worksheet.getCell(`E${row}`).value = customOtherAmount;
        worksheet.getCell(`F${row}`).value = 'บาท';
        worksheet.getCell(`H${row}`).value = customOtherAmount;
        worksheet.getCell(`I${row}`).value = 'บาท';

        for (let c = 1; c <= 11; c++) {
          const cell = worksheet.getCell(row, c);
          applyCellStyle(cell, 16, false, c === 4 || c === 5 || c === 8 ? (c === 8 ? 'right' : 'center') : 'left');
          if (c === 5 || c === 8) cell.numFmt = '#,##0.00';
          applyBorders(cell);
        }
      }

      customOtherList.forEach((item: any) => {
        const amt = parseFloat(item.amount) || 0;
        if (amt > 0) {
          const row = rIndex++;
          subtotalRows.push(row);
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - ' + (item.name || 'ค่าใช้จ่ายอื่นๆ');
          worksheet.getCell(`C${row}`).value = 'ตามจ่ายจริง';
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = amt;
          worksheet.getCell(`F${row}`).value = 'บาท';
          worksheet.getCell(`H${row}`).value = amt;
          worksheet.getCell(`I${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 || c === 8 ? (c === 8 ? 'right' : 'center') : 'left');
            if (c === 5 || c === 8) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }
      });

      if (subtotalRows.length > 0) {
        const sumStr = subtotalRows.map(r => `H${r}`).join('+');
        worksheet.getCell(`J${item7StartRow}`).value = { formula: sumStr };
        worksheet.getCell(`J${item7StartRow}`).numFmt = '#,##0.00';
        itemTotalRowRefs.push(`J${item7StartRow}`);
      }
    }
  } else if (formData.activityType === 'meeting' || formData.activityType === 'field_trip') {
    // ==========================================
    // MEETING & FIELD TRIP EXPORT CODE
    // ==========================================
    const committeeCount = parseInt(formData.committeeCount) || 0;
    const allowanceRate = isGistda ? 400 : 240;

    // 1. Committee Allowance
    if (committeeCount > 0) {
      const item1StartRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`A${rIndex}`).value = itemTotalRowRefs.length + 1;
      worksheet.getCell(`B${rIndex}`).value = 'ค่าเบี้ยเลี้ยงผู้ปฏิบัติงาน';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 1 ? 'center' : (c === 10 ? 'right' : 'left'));
        applyBorders(cell);
      }
      rIndex++;

      const subtotalRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`B${rIndex}`).value = ' - ค่าเบี้ยเลี้ยงคณะทำงาน';
      worksheet.getCell(`H${rIndex}`).value = '';
      worksheet.getCell(`I${rIndex}`).value = 'บาท';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 8 ? 'right' : 'left');
        applyBorders(cell);
      }
      rIndex++;

      const row = rIndex++;
      worksheet.getRow(row).height = 22;
      worksheet.getCell(`B${row}`).value = `   - ค่าเบี้ยเลี้ยงคณะทำงาน`;
      worksheet.getCell(`C${row}`).value = `(${allowanceRate.toLocaleString()}บาท*${daysCount}วัน*${committeeCount}คน)`;
      worksheet.getCell(`D${row}`).value = '=';
      worksheet.getCell(`E${row}`).value = { formula: `${allowanceRate}*${daysCount}*${committeeCount}` };
      worksheet.getCell(`F${row}`).value = 'บาท';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(row, c);
        applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
        if (c === 5) cell.numFmt = '#,##0.00';
        applyBorders(cell);
      }

      worksheet.getCell(`H${subtotalRow}`).value = { formula: `E${row}` };
      worksheet.getCell(`H${subtotalRow}`).numFmt = '#,##0.00';

      worksheet.getCell(`J${item1StartRow}`).value = { formula: `H${subtotalRow}` };
      worksheet.getCell(`J${item1StartRow}`).numFmt = '#,##0.00';
      itemTotalRowRefs.push(`J${item1StartRow}`);
    }

    // 2. F&B for meeting (using committeeCount)
    if (committeeCount > 0 && (formData.foodBreakMorning || formData.foodBreakAfternoon || formData.foodLunch || formData.foodReception)) {
      const item2StartRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`A${rIndex}`).value = itemTotalRowRefs.length + 1;
      worksheet.getCell(`B${rIndex}`).value = 'ค่าอาหารว่างและเครื่องดื่ม และอาหารกลางวัน';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 1 ? 'center' : (c === 10 ? 'right' : 'left'));
        applyBorders(cell);
      }
      rIndex++;

      const subtotalRows: number[] = [];

      for (let d = 0; d < daysCount; d++) {
        const dayHeaderRow = rIndex;
        subtotalRows.push(dayHeaderRow);
        worksheet.getRow(rIndex).height = 22;
        worksheet.getCell(`B${rIndex}`).value = datesTh[d];
        worksheet.getCell(`H${rIndex}`).value = '';
        worksheet.getCell(`I${rIndex}`).value = 'บาท';

        for (let c = 1; c <= 11; c++) {
          const cell = worksheet.getCell(rIndex, c);
          applyCellStyle(cell, 16, true, c === 8 ? 'right' : 'left');
          applyBorders(cell);
        }
        rIndex++;

        const pStart = rIndex;

        // Morning Break
        if (formData.foodBreakMorning && formData.foodBreakMorningDays.includes(d + 1)) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - ค่าอาหารว่างและเครื่องดื่ม (เช้า)';
          worksheet.getCell(`C${row}`).value = `(${rates.foodBreak}บาท*${committeeCount}คน*1มื้อ*1วัน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rates.foodBreak}*${committeeCount}*1*1` };
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        // Afternoon Break
        if (formData.foodBreakAfternoon && formData.foodBreakAfternoonDays.includes(d + 1)) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - ค่าอาหารว่างและเครื่องดื่ม (บ่าย)';
          worksheet.getCell(`C${row}`).value = `(${rates.foodBreak}บาท*${committeeCount}คน*1มื้อ*1วัน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rates.foodBreak}*${committeeCount}*1*1` };
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        // Lunch
        if (formData.foodLunch && formData.foodLunchDays.includes(d + 1)) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - ค่าอาหารกลางวัน';
          worksheet.getCell(`C${row}`).value = `(${rates.foodLunch}บาท*${committeeCount}คน*1วัน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rates.foodLunch}*${committeeCount}*1` };
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        // Reception
        if (formData.foodReception && formData.foodReceptionDays.includes(d + 1)) {
          const row = rIndex++;
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - ค่าอาหารเลี้ยงรับรอง';
          worksheet.getCell(`C${row}`).value = `(${rates.foodReception}บาท*${committeeCount}คน*1วัน)`;
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = { formula: `${rates.foodReception}*${committeeCount}*1` };
          worksheet.getCell(`F${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
            if (c === 5) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }

        const pEnd = rIndex - 1;
        if (pEnd >= pStart) {
          worksheet.getCell(`H${dayHeaderRow}`).value = { formula: `SUM(E${pStart}:E${pEnd})` };
          worksheet.getCell(`H${dayHeaderRow}`).numFmt = '#,##0.00';
        } else {
          worksheet.getCell(`H${dayHeaderRow}`).value = 0;
        }
      }

      const otherFoodAmount = parseFloat(formData.foodOthersAmount) || 0;
      if (otherFoodAmount > 0) {
        const otherHeaderRow = rIndex++;
        subtotalRows.push(otherHeaderRow);
        worksheet.getRow(otherHeaderRow).height = 22;
        worksheet.getCell(`B${otherHeaderRow}`).value = ' - ' + (formData.foodOthersDetails || 'ค่าอาหารและเครื่องดื่มอื่นๆ (เพิ่มเติม)');
        worksheet.getCell(`H${otherHeaderRow}`).value = otherFoodAmount;
        worksheet.getCell(`I${otherHeaderRow}`).value = 'บาท';

        for (let c = 1; c <= 11; c++) {
          const cell = worksheet.getCell(otherHeaderRow, c);
          applyCellStyle(cell, 16, true, c === 8 ? 'right' : 'left');
          if (c === 8) cell.numFmt = '#,##0.00';
          applyBorders(cell);
        }
      }

      if (subtotalRows.length > 0) {
        const sumStr = subtotalRows.map(r => `H${r}`).join('+');
        worksheet.getCell(`J${item2StartRow}`).value = { formula: sumStr };
        worksheet.getCell(`J${item2StartRow}`).numFmt = '#,##0.00';
        itemTotalRowRefs.push(`J${item2StartRow}`);
      }
    }

    // 3. Toll fee
    const tollFee = parseInt(formData.tollFee) || 0;
    if (tollFee > 0) {
      const itemStartRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`A${rIndex}`).value = itemTotalRowRefs.length + 1;
      worksheet.getCell(`B${rIndex}`).value = 'ค่าทางด่วน';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 1 ? 'center' : (c === 10 ? 'right' : 'left'));
        applyBorders(cell);
      }
      rIndex++;

      const subtotalRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`B${rIndex}`).value = ' - ค่าทางด่วน';
      worksheet.getCell(`H${rIndex}`).value = '';
      worksheet.getCell(`I${rIndex}`).value = 'บาท';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 8 ? 'right' : 'left');
        applyBorders(cell);
      }
      rIndex++;

      const row = rIndex++;
      worksheet.getRow(row).height = 22;
      worksheet.getCell(`B${row}`).value = '   - ค่าทางด่วนสำหรับการเดินทาง';
      worksheet.getCell(`C${row}`).value = 'ตามจ่ายจริง';
      worksheet.getCell(`D${row}`).value = '=';
      worksheet.getCell(`E${row}`).value = tollFee;
      worksheet.getCell(`F${row}`).value = 'บาท';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(row, c);
        applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
        if (c === 5) cell.numFmt = '#,##0.00';
        applyBorders(cell);
      }

      worksheet.getCell(`H${subtotalRow}`).value = { formula: `E${row}` };
      worksheet.getCell(`H${subtotalRow}`).numFmt = '#,##0.00';

      worksheet.getCell(`J${itemStartRow}`).value = { formula: `H${subtotalRow}` };
      worksheet.getCell(`J${itemStartRow}`).numFmt = '#,##0.00';
      itemTotalRowRefs.push(`J${itemStartRow}`);
    }

    // 4. Room Rental
    const roomRental = parseInt(formData.roomRental) || 0;
    if (roomRental > 0) {
      const itemStartRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`A${rIndex}`).value = itemTotalRowRefs.length + 1;
      worksheet.getCell(`B${rIndex}`).value = 'ค่าเช่าห้องประชุม';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 1 ? 'center' : (c === 10 ? 'right' : 'left'));
        applyBorders(cell);
      }
      rIndex++;

      const subtotalRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`B${rIndex}`).value = ' - ค่าเช่าสถานที่จัดประชุม';
      worksheet.getCell(`H${rIndex}`).value = '';
      worksheet.getCell(`I${rIndex}`).value = 'บาท';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 8 ? 'right' : 'left');
        applyBorders(cell);
      }
      rIndex++;

      const row = rIndex++;
      worksheet.getRow(row).height = 22;
      worksheet.getCell(`B${row}`).value = '   - ค่าเช่าห้องจัดประชุม';
      worksheet.getCell(`C${row}`).value = 'ตามจ่ายจริง';
      worksheet.getCell(`D${row}`).value = '=';
      worksheet.getCell(`E${row}`).value = roomRental;
      worksheet.getCell(`F${row}`).value = 'บาท';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(row, c);
        applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
        if (c === 5) cell.numFmt = '#,##0.00';
        applyBorders(cell);
      }

      worksheet.getCell(`H${subtotalRow}`).value = { formula: `E${row}` };
      worksheet.getCell(`H${subtotalRow}`).numFmt = '#,##0.00';

      worksheet.getCell(`J${itemStartRow}`).value = { formula: `H${subtotalRow}` };
      worksheet.getCell(`J${itemStartRow}`).numFmt = '#,##0.00';
      itemTotalRowRefs.push(`J${itemStartRow}`);
    }

    // 5. Car Rental
    const carRental = parseInt(formData.carRental) || 0;
    if (carRental > 0 && formData.activityType === 'field_trip') {
      const itemStartRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`A${rIndex}`).value = itemTotalRowRefs.length + 1;
      worksheet.getCell(`B${rIndex}`).value = 'ค่าเช่ารถและค่าน้ำมัน';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 1 ? 'center' : (c === 10 ? 'right' : 'left'));
        applyBorders(cell);
      }
      rIndex++;

      const subtotalRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`B${rIndex}`).value = ' - ค่าเช่าพาหนะสำหรับการลงพื้นที่';
      worksheet.getCell(`H${rIndex}`).value = '';
      worksheet.getCell(`I${rIndex}`).value = 'บาท';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 8 ? 'right' : 'left');
        applyBorders(cell);
      }
      rIndex++;

      const row = rIndex++;
      worksheet.getRow(row).height = 22;
      worksheet.getCell(`B${row}`).value = '   - ค่าเช่ารถตู้/รถบัส พร้อมน้ำมัน';
      worksheet.getCell(`C${row}`).value = 'ตามจ่ายจริง';
      worksheet.getCell(`D${row}`).value = '=';
      worksheet.getCell(`E${row}`).value = carRental;
      worksheet.getCell(`F${row}`).value = 'บาท';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(row, c);
        applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
        if (c === 5) cell.numFmt = '#,##0.00';
        applyBorders(cell);
      }

      worksheet.getCell(`H${subtotalRow}`).value = { formula: `E${row}` };
      worksheet.getCell(`H${subtotalRow}`).numFmt = '#,##0.00';

      worksheet.getCell(`J${itemStartRow}`).value = { formula: `H${subtotalRow}` };
      worksheet.getCell(`J${itemStartRow}`).numFmt = '#,##0.00';
      itemTotalRowRefs.push(`J${itemStartRow}`);
    }

    // 6. Insurance
    const insurance = parseInt(formData.insurance) || 0;
    if (insurance > 0 && formData.activityType === 'field_trip') {
      const itemStartRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`A${rIndex}`).value = itemTotalRowRefs.length + 1;
      worksheet.getCell(`B${rIndex}`).value = 'ค่าประกันภัยการเดินทาง';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 1 ? 'center' : (c === 10 ? 'right' : 'left'));
        applyBorders(cell);
      }
      rIndex++;

      const subtotalRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`B${rIndex}`).value = ' - ค่าเบี้ยประกันภัย';
      worksheet.getCell(`H${rIndex}`).value = '';
      worksheet.getCell(`I${rIndex}`).value = 'บาท';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 8 ? 'right' : 'left');
        applyBorders(cell);
      }
      rIndex++;

      const row = rIndex++;
      worksheet.getRow(row).height = 22;
      worksheet.getCell(`B${row}`).value = '   - ค่าเบี้ยประกันภัยกลุ่มเดินทาง';
      worksheet.getCell(`C${row}`).value = 'ตามจ่ายจริง';
      worksheet.getCell(`D${row}`).value = '=';
      worksheet.getCell(`E${row}`).value = insurance;
      worksheet.getCell(`F${row}`).value = 'บาท';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(row, c);
        applyCellStyle(cell, 16, false, c === 4 || c === 5 ? 'center' : 'left');
        if (c === 5) cell.numFmt = '#,##0.00';
        applyBorders(cell);
      }

      worksheet.getCell(`H${subtotalRow}`).value = { formula: `E${row}` };
      worksheet.getCell(`H${subtotalRow}`).numFmt = '#,##0.00';

      worksheet.getCell(`J${itemStartRow}`).value = { formula: `H${subtotalRow}` };
      worksheet.getCell(`J${itemStartRow}`).numFmt = '#,##0.00';
      itemTotalRowRefs.push(`J${itemStartRow}`);
    }

    // ==========================================
    // CUSTOM OTHER EXPENSES: ค่าใช้จ่ายอื่นๆ (ระบุชื่อรายการและจำนวนเงิน)
    // ==========================================
    const customOtherMeetingAmount = parseFloat(formData.otherExpenseAmount) || 0;
    const customOtherMeetingList = formData.otherExpenses || [];
    const hasCustomOthersMeeting = customOtherMeetingAmount > 0 || customOtherMeetingList.some((e: any) => (parseFloat(e.amount) || 0) > 0);

    if (hasCustomOthersMeeting) {
      const itemOtherStartRow = rIndex;
      worksheet.getRow(rIndex).height = 22;
      worksheet.getCell(`A${rIndex}`).value = itemTotalRowRefs.length + 1;
      worksheet.getCell(`B${rIndex}`).value = 'ค่าใช้จ่ายอื่นๆ';

      for (let c = 1; c <= 11; c++) {
        const cell = worksheet.getCell(rIndex, c);
        applyCellStyle(cell, 16, true, c === 1 ? 'center' : (c === 10 ? 'right' : 'left'));
        applyBorders(cell);
      }
      rIndex++;

      const subtotalRows: number[] = [];

      if (customOtherMeetingAmount > 0) {
        const row = rIndex++;
        subtotalRows.push(row);
        worksheet.getRow(row).height = 22;
        worksheet.getCell(`B${row}`).value = ' - ' + (formData.otherExpenseName || 'ค่าใช้จ่ายอื่นๆ');
        worksheet.getCell(`C${row}`).value = 'ตามจ่ายจริง';
        worksheet.getCell(`D${row}`).value = '=';
        worksheet.getCell(`E${row}`).value = customOtherMeetingAmount;
        worksheet.getCell(`F${row}`).value = 'บาท';
        worksheet.getCell(`H${row}`).value = customOtherMeetingAmount;
        worksheet.getCell(`I${row}`).value = 'บาท';

        for (let c = 1; c <= 11; c++) {
          const cell = worksheet.getCell(row, c);
          applyCellStyle(cell, 16, false, c === 4 || c === 5 || c === 8 ? (c === 8 ? 'right' : 'center') : 'left');
          if (c === 5 || c === 8) cell.numFmt = '#,##0.00';
          applyBorders(cell);
        }
      }

      customOtherMeetingList.forEach((item: any) => {
        const amt = parseFloat(item.amount) || 0;
        if (amt > 0) {
          const row = rIndex++;
          subtotalRows.push(row);
          worksheet.getRow(row).height = 22;
          worksheet.getCell(`B${row}`).value = ' - ' + (item.name || 'ค่าใช้จ่ายอื่นๆ');
          worksheet.getCell(`C${row}`).value = 'ตามจ่ายจริง';
          worksheet.getCell(`D${row}`).value = '=';
          worksheet.getCell(`E${row}`).value = amt;
          worksheet.getCell(`F${row}`).value = 'บาท';
          worksheet.getCell(`H${row}`).value = amt;
          worksheet.getCell(`I${row}`).value = 'บาท';

          for (let c = 1; c <= 11; c++) {
            const cell = worksheet.getCell(row, c);
            applyCellStyle(cell, 16, false, c === 4 || c === 5 || c === 8 ? (c === 8 ? 'right' : 'center') : 'left');
            if (c === 5 || c === 8) cell.numFmt = '#,##0.00';
            applyBorders(cell);
          }
        }
      });

      if (subtotalRows.length > 0) {
        const sumStr = subtotalRows.map(r => `H${r}`).join('+');
        worksheet.getCell(`J${itemOtherStartRow}`).value = { formula: sumStr };
        worksheet.getCell(`J${itemOtherStartRow}`).numFmt = '#,##0.00';
        itemTotalRowRefs.push(`J${itemOtherStartRow}`);
      }
    }

  }

  // ==========================================
  // GRAND TOTAL: รวม
  // ==========================================
  const grandTotalRow = rIndex;
  worksheet.getRow(grandTotalRow).height = 25;

  // Merge A{grandTotalRow}:I{grandTotalRow}
  worksheet.mergeCells(`A${grandTotalRow}:I${grandTotalRow}`);

  const cellGrandTotalLabel = worksheet.getCell(`A${grandTotalRow}`);
  cellGrandTotalLabel.value = 'รวม';
  applyCellStyle(cellGrandTotalLabel, 16, true, 'center');

  for (let c = 1; c <= 9; c++) {
    applyBorders(worksheet.getCell(grandTotalRow, c));
  }

  const cellGrandTotalValue = worksheet.getCell(`J${grandTotalRow}`);
  if (itemTotalRowRefs.length > 0) {
    cellGrandTotalValue.value = { formula: itemTotalRowRefs.join('+') };
  } else {
    cellGrandTotalValue.value = 0;
  }
  applyCellStyle(cellGrandTotalValue, 16, true, 'right');
  cellGrandTotalValue.numFmt = '#,##0.00';
  applyBorders(cellGrandTotalValue);

  const cellGrandTotalNote = worksheet.getCell(`K${grandTotalRow}`);
  cellGrandTotalNote.value = 'ถัวจ่ายทุกรายการ';
  applyCellStyle(cellGrandTotalNote, 16, true, 'left');
  applyBorders(cellGrandTotalNote);

  // Write file out
  const buffer = await workbook.xlsx.writeBuffer();
  const fileBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(fileBlob, `ประมาณการงบประมาณ_${projectName || 'อบรม'}.xlsx`);
};
