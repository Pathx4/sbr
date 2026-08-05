/**
 * ระบบรายงานการจัดซื้อจัดจ้างสำหรับผู้บริหาร (Executive Procurement Dashboard)
 * พัฒนาโดยใช้ Google Apps Script & HTML Service
 * ดึงข้อมูลเฉพาะเจาะจงแยกแยะตามแผ่นงาน (ไม่เกิน 5 แสน และ เกิน 5 แสน)
 * เพื่อรองรับการแสดงผลข้อมูลแบบไดนามิกบนหน้าจอแดชบอร์ด
 */

function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) ? e.parameter.page.toString().toLowerCase() : 'index';
  const templateFile = (page === 'index2') ? 'index2' : 'index';
  return HtmlService.createTemplateFromFile(templateFile)
    .evaluate()
    .setTitle('แดชบอร์ดจัดซื้อจัดจ้างสำหรับผู้บริหาร')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * ฟังก์ชันสร้างเมนูบน Google Sheets เพื่อให้กดเปิดหน้า Dashboard ได้สะดวกขึ้น
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📊 แดชบอร์ดผู้บริหาร')
    .addItem('เปิดหน้า Dashboard', 'openDashboardSidebar')
    .addItem('💡 สร้างข้อมูลจำลอง (เพื่อทดสอบ)', 'generateSampleData')
    .addToUi();
}

/**
 * เปิดแดชบอร์ด in รูปแบบ Sidebar ทางขวามือของ Google Sheets
 */
function openDashboardSidebar() {
  const html = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Dashboard จัดซื้อจัดจ้าง')
    .setWidth(800);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * ฟังก์ชันทำความสะอาดข้อมูลตัวเลข ป้องกัน Error จากเครื่องหมายคอมมาหรือหน่วยเงินบาท
 */
function cleanNumber(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  // ลบเครื่องหมายคอมมา, สัญลักษณ์เงิน, เว้นวรรค, และอักษรไทยออกเพื่อคำนวณสะสม
  const cleanStr = val.toString().replace(/[^\d.-]/g, '');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}

/**
 * ค้นหาแถวที่เป็นหัวข้อตาราง (Header Row) ที่แท้จริงโดยการตรวจจับคำสำคัญ
 */
function findHeaderRow(values) {
  let bestRowIndex = 0;
  let maxScore = -1;
  const keywords = ["โครงการ", "งบประมาณ", "สถานะ", "ฝ่าย", "จำนวนเงิน", "ตกลง", "สัญญา", "เลขที่", "ผู้ชนะ", "วันที่", "ลำดับ"];
  const scanLimit = Math.min(values.length, 15);
  for (let i = 0; i < scanLimit; i++) {
    const row = values[i];
    let score = 0;
    row.forEach(cell => {
      if (!cell) return;
      const cellStr = cell.toString().toLowerCase();
      keywords.forEach(kw => {
        if (cellStr.includes(kw)) {
          score++;
        }
      });
    });
    if (score > maxScore) {
      maxScore = score;
      bestRowIndex = i;
    }
  }
  return maxScore > 0 ? bestRowIndex : 0;
}

/**
 * ดึงข้อมูลดิบจากชีตที่ระบุและประมวลผลส่งกลับให้หน้า Frontend
 * @param {string} targetSheetName ชื่อชีตเป้าหมายที่ต้องการเปิดแสดงผล
 */
function getDashboardData(targetSheetName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (targetSheetName === "จัดซื้อจัดจ้างทั้งหมด") {
      const dataUnder = getSheetDataByName(ss, "จัดซื้อจัดจ้าง 2569 (ไม่เกิน5แสน)");
      const dataOver = getSheetDataByName(ss, "จัดซื้อจัดจ้าง 2569 (เกิน5แสน)");
      
      let combinedData = [];
      if (dataUnder.status === "success") combinedData = combinedData.concat(dataUnder.data);
      if (dataOver.status === "success") combinedData = combinedData.concat(dataOver.data);
      
      combinedData.forEach((item, idx) => {
        item.id = idx + 1;
      });
      
      return {
        status: "success",
        data: combinedData,
        sheetName: "จัดซื้อจัดจ้างทั้งหมด [ภาพรวม]",
        isAll: true
      };
    } else {
      return getSheetDataByName(ss, targetSheetName || "จัดซื้อจัดจ้าง 2569 (ไม่เกิน5แสน)");
    }
  } catch (error) {
    return {
      status: "error",
      message: "เกิดข้อผิดพลาดคลาวด์เซิร์ฟเวอร์: " + error.toString()
    };
  }
}

/**
 * ดึงข้อมูลสเปรดชีตจัดวางพิกัดตรงตามโครงสร้างของแผ่นงานจริง
 */
function getSheetDataByName(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return { status: "empty", message: "ไม่พบแผ่นงานชื่อ '" + sheetName + "'" };
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { status: "empty", data: [] };
  }
  
  // โหลดคอลัมน์กว้าง 24 คอลัมน์ (A ถึง X) ครอบคลุมพิกัดข้อมูลที่จำเป็นทั้งหมด
  const range = sheet.getRange(1, 1, lastRow, 24);
  const values = range.getValues();
  const headerRowIndex = findHeaderRow(values);
  const dataRows = values.slice(headerRowIndex + 1);
  const formattedData = [];
  
  dataRows.forEach((row, i) => {
    // กำหนดโครงสร้างตัวแปรรับค่าหลักตามสเปกของแต่ละหน้าเมนูจัดซื้อจัดจ้าง
    let projectId = "";
    let docNo = "";
    let requestNo = "";
    let projectName = "";
    let period = "";
    let installments = "";
    let contractAmount = 0;
    let contractAmountK = 0;
    let contractAmountP = 0;
    let department = "";
    let status = "";
    let method = "";
    let vendor = "";
    let date = "";
    let budget = 0;
    let rawRowValues = [];

    // เซฟแถว A ถึง M ทั้งหมดเพื่อส่งกลับไปเรนเดอร์ในโหมดสรุปแบบละเอียดของแผ่นงาน เกิน 5 แสน
    for (let c = 0; c < Math.min(row.length, 13); c++) {
      rawRowValues.push(row[c] ? row[c].toString().trim() : "");
    }
    
    // ดึงค่าสัญญาจริงจากทั้ง คอลัมน์ K และ คอลัมน์ P เผื่อสับเปลี่ยนการคำนวณเชิงลึกแบบคู่ขนาน
    contractAmountK = cleanNumber(row[10]); // คอลัมน์ K (Index 10)
    contractAmountP = cleanNumber(row[15]); // คอลัมน์ P (Index 15)
    
    if (sheetName.includes("ไม่เกิน5แสน")) {
      projectId = row[0] ? row[0].toString().trim() : "";       // A: เลขที่โครงการ / ลำดับสะสม
      docNo = row[1] ? row[1].toString().trim() : "";           // B: เลขที่เอกสาร
      requestNo = row[7] ? row[7].toString().trim() : "";       // H: เลขที่ รายงานขอซื้อ/จ้าง
      projectName = row[8] ? row[8].toString().trim() : "";     // I: รายการ
      period = row[10] ? row[10].toString().trim() : "-";       // K: ระยะเวลาดำเนินการ
      installments = row[11] ? row[11].toString().trim() : "-"; // L: จำนวนงวด / ฝ่ายวิเคราะห์
      contractAmount = cleanNumber(row[10]);                    // K: วงเงินสัญญาจริง ดึงจากคอลัมน์ K (Index 10)
      department = row[11] ? row[11].toString().trim() : "ไม่ระบุฝ่าย"; // L: ฝ่ายรับผิดชอบจัดจ้าง
      status = row[12] ? row[12].toString().trim() : "อยู่ระหว่างกระบวนการจัดจ้าง"; // M: สถานะของงาน
      
      method = row[5] ? row[5].toString().trim() : "วิธีเฉพาะเจาะจง";
      vendor = row[6] ? row[6].toString().trim() : "ยังไม่ได้ทำสัญญา";
      date = row[8] ? row[8].toString().trim() : "-";
      budget = cleanNumber(row[2]);
    } else if (sheetName.includes("เกิน5แสน")) {
      // คอลัม B (Index 1) : เลขที่เอกสาร  PS/PO (ระบบ AX)
      // คอลัม G (Index 6) : รายการ 
      // คอลัม E (Index 4) : เลขที่ รายงานขอซื้อ/จ้าง
      // คอลัม M (Index 12) : ระยะเวลาดำเนินการ
      // คอลัม N (Index 13) : จำนวนงวด
      // คอลัม K (Index 10) : จำนวนเงิน / วงเงินสัญญาจริง (แก้ไขให้ดึงจากดัชนี 10 แทนคอลัมน์ P Index 15 เดิม)
      // ฝ่าย -> คอลัมน์ L (Index 11)
      // สถานะ -> คอลัมน์ X (Index 23)
      projectId = row[1] ? row[1].toString().trim() : "";       // B: เลขที่เอกสาร
      docNo = row[1] ? row[1].toString().trim() : "";           // B: เลขที่เอกสาร PS/PO (ระบบ AX)
      projectName = row[6] ? row[6].toString().trim() : "";     // G: รายการ
      requestNo = row[4] ? row[4].toString().trim() : "";       // E: เลขที่ รายงานขอซื้อ/จ้าง
      period = row[12] ? row[12].toString().trim() : "-";       // M: ระยะเวลาดำเนินการ
      installments = row[13] ? row[13].toString().trim() : "-"; // N: จำนวนงวด
      contractAmount = cleanNumber(row[10]);                    // K: จำนวนเงินสัญญา (Index 10)
      department = row[11] ? row[11].toString().trim() : "ไม่ระบุฝ่าย"; // L: ฝ่าย
      status = row[23] ? row[23].toString().trim() : "อยู่ระหว่างกระบวนการจัดจ้าง"; // X: สถานะของงาน
      
      method = row[5] ? row[5].toString().trim() : "วิธี e-Bidding";
      vendor = row[7] ? row[7].toString().trim() : "ยังไม่ได้ทำสัญญา";
      date = row[16] ? row[16].toString().trim() : "-";         // Q: วันลงนาม
      budget = cleanNumber(row[2]);
    } else {
      projectId = row[0] ? row[0].toString().trim() : "";
      docNo = row[1] ? row[1].toString().trim() : "";
      projectName = row[8] || row[6] || "";
      contractAmount = cleanNumber(row[13]) || cleanNumber(row[15]);
      department = row[11] || row[22] || "ไม่ระบุ";
      status = row[12] || row[23] || "เตรียมการ";
    }
    
    // ข้ามแถวเปล่าที่ไม่มีข้อมูลสำคัญจริงเพื่อความเสถียรของแดชบอร์ด
    if (!docNo && !projectName && contractAmount === 0) {
      return;
    }
    
    formattedData.push({
      id: i + 1,
      projectId: projectId,
      docNo: docNo,
      projectName: projectName,
      requestNo: requestNo,
      period: period,
      installments: installments,
      contractAmount: contractAmount,
      contractAmountK: contractAmountK,
      contractAmountP: contractAmountP,
      department: department,
      status: status,
      method: method,
      vendor: vendor,
      date: date,
      budget: budget,
      rawRowValues: rawRowValues,
      sheetType: sheetName.includes("เกิน5แสน") ? "over" : "under"
    });
  });
  
  return {
    status: "success",
    data: formattedData,
    sheetName: sheetName
  };
}

/**
 * ฟังก์ชันสำหรับบันทึกข้อมูลโครงการใหม่ลงใน Google Sheets
 */
function appendRecordToSheet(rowData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetName = rowData.targetSheet;
    
    if (sheetName === "จัดซื้อจัดจ้างทั้งหมด") {
      sheetName = (cleanNumber(rowData.contractAmount) > 500000) ? 
        "จัดซื้อจัดจ้าง 2569 (เกิน5แสน)" : "จัดซื้อจัดจ้าง 2569 (ไม่เกิน5แสน)";
    }
    
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return { success: false, message: "ไม่พบแผ่นงานชื่อ '" + sheetName + "' บน Google Sheets" };
    }
    
    const newRow = Array(24).fill("");
    
    newRow[0] = rowData.projectId;       // A: เลขที่โครงการ
    newRow[1] = rowData.projectName;     // B: ชื่อโครงการ
    newRow[2] = cleanNumber(rowData.budget); // C: งบประมาณตั้งต้น
    newRow[3] = cleanNumber(rowData.budget); // D: ราคากลาง
    newRow[5] = rowData.method;          // F: วิธีการจัดหา
    newRow[7] = rowData.vendor;          // H: คู่สัญญา/ผู้ชนะ
    newRow[8] = rowData.date;            // I: วันลงนาม
    
    if (sheetName.includes("เกิน5แสน")) {
      newRow[10] = cleanNumber(rowData.contractAmount); // K: จำนวนเงินสัญญา เกิน 5 แสน
      newRow[11] = rowData.department;     // L: ฝ่ายรับผิดชอบ
      newRow[23] = rowData.status;         // X: สถานะของงาน
    } else {
      newRow[10] = cleanNumber(rowData.contractAmount);  // K: จำนวนเงินสัญญา ไม่เกิน 5 แสน
      newRow[11] = rowData.department;     // L: ฝ่ายรับผิดชอบ
      newRow[12] = rowData.status;         // M: สถานะของงาน
    }
    
    sheet.appendRow(newRow);
    return { success: true, message: "บันทึกโครงการ " + rowData.projectId + " เรียบร้อยแล้ว" };
    
  } catch (error) {
    return { success: false, message: "เกิดข้อผิดพลาดในการเขียนสเปรดชีต: " + error.toString() };
  }
}

/**
 * สร้างข้อมูลจำลองแยกเป็น 3 ชีตอิงโครงสร้างคอลัมน์สัมบูรณ์ (Absolute Columns)
 * เพื่อให้สลับเมนูดูรายงานบนแดชบอร์ดได้ทันทีอย่างสมบูรณ์แบบ
 */
function generateSampleData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const check = Browser.msgBox("ยืนยันการทำจำลองข้อมูล", "ระบบจะทำการสร้างแผ่นงานสรุปชุดข้อมูลเป้าหมายใหม่ หากมีข้อมูลเดิมอยู่จะถูกเขียนทับทันทีเพื่อทดสอบ ต้องการดำเนินการต่อหรือไม่?", Browser.Buttons.YES_NO);
  if (check === "no") return;

  const mockDepts = ["ฝ่ายเทคโนโลยีสารสนเทศ", "ฝ่ายบริหารงานทั่วไป", "ฝ่ายจัดส่งและคลังสินค้า", "ฝ่ายทรัพยากรบุคคล", "ฝ่ายบัญชีและการเงิน"];
  const standardStatuses = [
    "อยู่ระหว่างกระบวนการจัดจ้าง", "งานระหว่างทำ", "ส่งมอบงานแล้ว รอตรวจรับ", 
    "อยู่ระหว่าง คกก. ตรวจรับ", "ส่งรายงานตรวจรับแล้ว", "รอพัสดุตรวจ", 
    "อนุมัติรายงานตรวจรับแล้ว", "เบิกจ่ายแล้ว/จบงาน", "ดำเนินงานงวด 1", 
    "ดำเนินงานงวด 2", "ดำเนินงานงวด 3", "ดำเนินงานงวดสุดท้าย"
  ];

  const mockAmountsUnder = [
    175000.00, 150000.00, 45000.00, 95000.00, 210000.00, 
    35000.00, 88000.00, 142000.00, 55000.00, 75000.00, 
    185000.00, 120000.00, 65000.00, 240000.00, 92000.00, 
    58000.00, 115000.00, 165000.00, 98000.00, 62000.00, 
    220000.00, 42000.00, 110000.00, 135000.00, 85000.00, 
    70000.00, 487642.12
  ];

  const mockAmountsOver = [
    1250000.00, 3400000.00, 1500000.00, 850000.00, 920000.00,
    1150000.00, 620000.00, 780000.00, 2450000.00, 1850000.00,
    3200000.00, 1480000.00
  ];

  const projectsUnder = [
    "จัดซื้อวัสดุไอทีและคอมพิวเตอร์พกพาฝ่ายวิเคราะห์ข้อมูล", "ซ่อมบำรุงพื้นปูนและทางเดินส่วนหน้าตึกสำนักงาน",
    "จัดหาเครื่องสแกนบาร์โค้ดฝ่ายบัญชีงบประมาณ", "จ้างซ่อมระบบปรับอากาศท่อระบายความร้อนอาคารเอ",
    "จ้างอบรมสัมมนาจัดซื้อภาครัฐยุคใหม่ประจำปี", "จัดซื้อตู้เย็นประหยัดพลังงานเบอร์ 5 ส่วนกลาง",
    "ติดตั้งประตูอัตโนมัติห้องควบคุมพัสดุ", "จัดซื้อป้ายจราจรและแนวป้องกันแรงกระแทก",
    "จัดหาถังดับเพลิงมาตรฐานประจำจุดปฏิบัติงาน", "จ้างบำรุงรักษาคอมพิวเตอร์พนักงานขายส่วนหน้า",
    "จัดหาเสื้อยืดสะท้อนแสงพนักงานลานคลังสินค้า", "จ้างตรวจสภาพความปลอดภัยโครงสร้างชั้นวางครุภัณฑ์",
    "จัดซื้อซอฟต์แวร์ประมวลคำสากลรายปี", "ติดตั้งชุดตรวจจับความร้อนอัตโนมัติห้องเซิร์ฟเวอร์",
    "จัดซื้อเครื่องวัดฝุ่นละออง PM 2.5 ป้องกันความปลอดภัย", "จ้างโปรแกรมตรวจสุขภาพพนักงานขับขี่ทางไกล",
    "จ้างบริการทำลายเอกสารความลับไม่ใช้งานทั่วไป", "จัดงานสร้างความสัมพันธ์สานต่อบุคลากรยุคใหม่",
    "จัดซื้อคอมพิวเตอร์แท็บเล็ตสแกนรับสินค้าคลังสินค้า", "จัดหาโต๊ะพนักงานต้อนรับ Ergonomic ด่านหน้า",
    "จ้างปรับแต่งโปรแกรมแดชบอร์ดสรุปงานจัดสรรงบประมาณ", "จ้างผู้ชำนาญการทดสอบเครื่องปั่นไฟฉุกเฉิน",
    "ซ่อมแซมและเปลี่ยนถ่ายเครื่องยนต์กลุ่มรถขนส่ง", "จ้างลอกท่อระบายน้ำป้องกันปัญหาน้ำท่วมรอบโรงงาน",
    "จัดซื้อแท็บเล็ตพกพาระบบปฏิบัติการแอนดรอยด์", "จัดซื้อกล้องวีดีโอความคมชัดสูงบันทึกการเรียนรู้",
    "โครงการพัฒนาระบบคลังแช่ประตูลานเย็นควบคุมดิจิทัล"
  ];

  const projectsOver = [
    "โครงการปรับปรุงเซิร์ฟเวอร์คลาวด์องค์กรรวมระยะที่ 3", "โครงการจัดซื้อแพลตฟอร์ม ERP จัดสรรงบประมาณองค์กรใหญ่",
    "โครงการเปลี่ยนหลอดไฟถนนทางเข้าทั้งหมดเป็นแบบ LED อัจฉริยะ", "จ้างพัฒนาระบบไฟร์วอลล์ความปลอดภัยเครือข่ายความมั่นคงสูง",
    "จัดจ้างเหมาติดตั้งระบบพลังงานแสงอาทิตย์ Solar Roof คลังสินค้าใหญ่", "จ้างขัดหน้าปูนปรับผิวถนนรถยกโฟล์คลิฟท์ลานจอดรถ",
    "จัดหาชุดแบตเตอรี่สำรองไฟเสถียรสูงป้อนห้องระบบศูนย์กลางสำนักงาน", "จ้างรื้อถอนและทำลายซากพัสดุครุภัณฑ์โรงงานเก่าที่ปลดระวาง",
    "จัดหาครุภัณฑ์คอมพิวเตอร์พกพาเจ้าหน้าที่ระดับหัวหน้าส่วนงานทั้งหมด", "จ้างจัดงานประชุมวิชาการระดับผู้นำธุรกิจนานาชาติสัมมนาใหญ่",
    "โครงการขยายระบบระเบียบจัดส่งโลจิสติกส์สาขาตะวันออก", "จ้างพัฒนาระบบรักษาความลับข้อมูลแบบเข้ารหัสภายในหน่วยงาน"
  ];

  const writeSheetData = (sheetName, datasetAmounts, datasetProjects) => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    sheet.clear();
    
    const isOver = sheetName.includes("เกิน5แสน");
    
    // จัดวางหัวข้อคอลัมน์ A ถึง Z
    const headers = [];
    for (let i = 0; i < 24; i++) {
      const char = String.fromCharCode(65 + i);
      if (i === 0) headers.push("เลขที่โครงการ (A)");
      else if (i === 1) headers.push("เลขที่เอกสาร (B)");
      else if (i === 2) headers.push("งบประมาณตั้งต้น (C)");
      else if (i === 3) headers.push("ราคากลาง (D)");
      else if (i === 4) headers.push("เลขที่ รายงานขอซื้อ/จ้าง (E)");
      else if (i === 5) headers.push(isOver ? "วิธีการจัดหา (F)" : "วิธีการจัดหา (F)");
      else if (i === 6) headers.push(isOver ? "รายการ (G)" : "ผู้ชนะการเสนอราคา (G)");
      else if (i === 7) headers.push(isOver ? "ระยะเวลาดำเนินการ (H)" : "เลขที่ รายงานขอซื้อ/จ้าง (H)");
      else if (i === 8) headers.push(isOver ? "จำนวนงวด (I)" : "รายการ (I)");
      else if (i === 9) headers.push(isOver ? "เลขที่สัญญา (J)" : "จำนวนเงินตามสัญญา (J)");
      else if (i === 10) headers.push(isOver ? "จำนวนเงินตามสัญญา (K)" : "ระยะเวลาดำเนินการ (K)");
      else if (i === 11) headers.push(isOver ? "ฝ่ายที่เกี่ยวข้อง (L)" : "ฝ่ายผู้รับผิดชอบ / จำนวนงวด (L)");
      else if (i === 12) headers.push(isOver ? "ระยะเวลาดำเนินการสำรอง (M)" : "status (M)");
      else if (i === 13) headers.push("จำนวนงวด เกิน 5 แสน (N)");
      else if (i === 15) headers.push("จำนวนเงินสัญญา เกิน 5 แสน (P)");
      else if (i === 16) headers.push("วันลงนาม (Q)");
      else if (i === 21) headers.push("ฝ่ายที่เกี่ยวข้อง เกิน 5 แสน (V)");
      else if (i === 22) headers.push("ฝ่าย (W)");
      else if (i === 23) headers.push("สถานะจัดซื้อ (X)");
      else headers.push(`คอลัมน์เสริม (${char})`);
    }
    sheet.appendRow(headers);

    for (let i = 0; i < datasetAmounts.length; i++) {
      const row = Array(24).fill("");
      row[0] = i + 1; // A: ลำดับ
      row[1] = isOver ? `DOC-OVER-69${String(i+1).padStart(3, '0')}` : `DOC-UNDER-69${String(i+1).padStart(3, '0')}`; // B
      row[2] = datasetAmounts[i] * 1.05; // C: งบตั้งต้น
      row[3] = datasetAmounts[i] * 1.02; // D: ราคากลาง
      
      if (isOver) {
        row[4] = `REQ-OVER-69${String(i+1).padStart(3, '0')}`; // E
        row[5] = "วิธี e-Bidding"; // F
        row[6] = datasetProjects[i]; // G: รายการ
        row[7] = `${90 + (i * 10)} วัน`; // H: ระยะเวลาดำเนินการ
        row[8] = `${2 + (i % 3)} งวด`; // I: จำนวนงวด
        row[9] = `CN-OVER-${100 + i}`; // J: เลขที่สัญญา
        row[10] = datasetAmounts[i]; // K: จำนวนเงินสัญญา
        row[11] = mockDepts[i % mockDepts.length]; // L: ฝ่าย
        row[12] = `${90 + (i * 10)} วัน`; // M
        row[13] = `${2 + (i % 3)} งวด`; // N
        row[15] = datasetAmounts[i]; // P: จำนวนเงินตามสัญญา
        row[22] = mockDepts[i % mockDepts.length]; // W: ฝ่าย
        row[23] = standardStatuses[i % standardStatuses.length]; // X: สถานะ
      } else {
        row[5] = "วิธีเฉพาะเจาะจง"; // F
        row[6] = `ร้านผู้ชนะจำลองที่ ${i+1}`; // G
        row[7] = `REQ-UNDER-69${String(i+1).padStart(3, '0')}`; // H
        row[8] = datasetProjects[i]; // I: รายการ
        row[9] = datasetAmounts[i]; // J: จำนวนเงินสัญญา
        row[10] = datasetAmounts[i]; // K: วงเงินสัญญาจริง (ผลรวมจากคอลัมน์ K)
        row[11] = mockDepts[i % mockDepts.length]; // L: ฝ่าย
        row[12] = standardStatuses[i % standardStatuses.length]; // M: สถานะ
      }
      sheet.appendRow(row);
    }
    
    sheet.getRange(1, 1, 1, 24).setFontWeight("bold").setFontColor("#FFFFFF").setBackgroundColor("#1E3A8A").setHorizontalAlignment("center");
    sheet.getRange(2, 3, datasetAmounts.length, 2).setNumberFormat("#,##0.00");
    if (isOver) {
      sheet.getRange(2, 11, datasetAmounts.length, 1).setNumberFormat("#,##0.00");
      sheet.getRange(2, 16, datasetAmounts.length, 1).setNumberFormat("#,##0.00");
    } else {
      sheet.getRange(2, 10, datasetAmounts.length, 2).setNumberFormat("#,##0.00");
    }
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, 24);
  };

  writeSheetData("จัดซื้อจัดจ้าง 2569 (ไม่เกิน5แสน)", mockAmountsUnder, projectsUnder);
  writeSheetData("จัดซื้อจัดจ้าง 2569 (เกิน5แสน)", mockAmountsOver, projectsOver);

  SpreadsheetApp.getUi().alert("สร้างชีตจำลองตามพิกัดคอลัมน์เรียบร้อย!", "แผ่นงานพร้อมรองรับการอ่านรายงานแบบไดนามิกบน Dashboard แล้วครับ", SpreadsheetApp.getUi().ButtonSet.OK);
}