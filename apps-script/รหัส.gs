/**
 * ระบบรวมศูนย์แดชบอร์ดบริหารงบประมาณ & จัดซื้อจัดจ้าง (Unified Google Apps Script Backend)
 * 1. index.html = ระบบบริหารงบประมาณและกิจกรรม
 * 2. รายงานจัดซื้อจัดจ้าง.html = แดชบอร์ดจัดซื้อจัดจ้างสำหรับผู้บริหาร
 */

// 🟢 ID ของ Google Sheet ใบที่ 1 (ระบบบริหารงบประมาณและกิจกรรม)
const BUDGET_SHEET_ID = "1eWkRl_E_PCYWZ_EGRo7_ZC7gP5XlAC_bFVeH2VhD4Tc";

// 🔴 ID ของ Google Sheet ใบที่ 2 (ระบบรายงานจัดซื้อจัดจ้าง)
// (หากใช้ไฟล์เดียวกัน ให้ใช้ ID เดียวกัน หรือเปลี่ยนเป็น ID ของไฟล์จัดซื้อจัดจ้างได้เลย)
const PROCUREMENT_SHEET_ID = "1XtlZ878S-3UXudK9dAtLvjGQMYYn0jKCcEF14sCGp9Y";

function getSpreadsheetDoc(type) {
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    if (doc) return doc;
  } catch (e) {}
  
  var targetId = (type === 'procurement') ? PROCUREMENT_SHEET_ID : BUDGET_SHEET_ID;
  return SpreadsheetApp.openById(targetId);
}

/**
 * 1. ฟังก์ชันเปิดหน้าเว็บ (Dynamic Page Loader)
 * รองรับการสลับหน้า index.html (งบประมาณ) และ รายงานจัดซื้อจัดจ้าง.html
 */
function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) ? e.parameter.page.toString().toLowerCase() : 'index';
  var webAppUrl = ScriptApp.getService().getUrl();
  
  if (page === 'procurement' || page === 'index2' || page === 'รายงานจัดซื้อจัดจ้าง' || page === 'report') {
    try {
      var t2 = HtmlService.createTemplateFromFile('Index2');
      t2.webAppUrl = webAppUrl;
      return t2.evaluate()
          .setTitle('แดชบอร์ดจัดซื้อจัดจ้างสำหรับผู้บริหาร')
          .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err) {
      var tReport = HtmlService.createTemplateFromFile('รายงานจัดซื้อจัดจ้าง');
      tReport.webAppUrl = webAppUrl;
      return tReport.evaluate()
          .setTitle('แดชบอร์ดจัดซื้อจัดจ้างสำหรับผู้บริหาร')
          .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  }

  var t1 = HtmlService.createTemplateFromFile('Index');
  t1.webAppUrl = webAppUrl;
  return t1.evaluate()
      .setTitle('ระบบแดชบอร์ดอัจฉริยะ สบร.')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * ฟังก์ชันสร้างเมนูบน Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📊 แดชบอร์ดผู้บริหาร')
    .addItem('เปิดหน้า Dashboard หลัก', 'openDashboardSidebar')
    .addItem('💡 สร้างข้อมูลจัดซื้อจัดจ้างจำลอง', 'generateSampleData')
    .addToUi();
}

function openDashboardSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Dashboard บริหารงบประมาณ')
    .setWidth(800);
  SpreadsheetApp.getUi().showSidebar(html);
}

// =================================================================
// 🟢 ส่วนที่ 1: ฟังก์ชันสำหรับระบบบริหารงบประมาณ (index.html)
// =================================================================

function getSheetData() {
  try {
    var doc = getSpreadsheetDoc();
    var actSheet = doc.getSheetByName("กิจกรรม") || doc.getSheets()[0];
    var actData = actSheet ? actSheet.getDataRange().getDisplayValues() : [];
    
    var kpiSheet = doc.getSheetByName("ตัวชี้วัด สำนัก");
    if (!kpiSheet) {
      var sheets = doc.getSheets();
      for (var i = 0; i < sheets.length; i++) {
        var name = sheets[i].getName().replace(/\s+/g, "");
        if (name === "ตัวชี้วัดสำนัก") {
          kpiSheet = sheets[i];
          break;
        }
      }
    }
    var kpiData = kpiSheet ? kpiSheet.getDataRange().getDisplayValues() : [];
    
    return {
      activities: actData,
      kpiData: kpiData
    };
  } catch (e) {
    return { activities: [], kpiData: [] };
  }
}

function saveActivityData(data) {
  try {
    var doc = getSpreadsheetDoc();
    var sheet = doc.getSheetByName("กิจกรรม") || doc.getSheets()[0];

    var dateThai = "";
    if (data.startDate) {
      var startParts = data.startDate.split("-");
      if (startParts.length === 3) {
        var startD = parseInt(startParts[2]);
        var startM = parseInt(startParts[1]);
        var startY = parseInt(startParts[0]) + 543;
        dateThai = startD + "/" + startM + "/" + startY;
        
        if (data.endDate && data.startDate !== data.endDate) {
          var endParts = data.endDate.split("-");
          if (endParts.length === 3) {
            var endD = parseInt(endParts[2]);
            var endM = parseInt(endParts[1]);
            var endY = parseInt(endParts[0]) + 543;
            if (startM === endM && startY === endY) {
              dateThai = startD + "-" + endD + "/" + startM + "/" + startY;
            } else {
              dateThai = startD + "/" + startM + "/" + startY + " - " + endD + "/" + endM + "/" + endY;
            }
          }
        }
      }
    }

    // --- 🛠️ หาแถวสุดท้ายที่แท้จริงที่มีข้อมูล (อ้างอิงจากคอลัมน์ A) ---
    var columnA = sheet.getRange("A:A").getValues();
    var trueLastRow = 0;
    
    for (var i = columnA.length - 1; i >= 0; i--) {
      if (columnA[i][0] !== "") {
        trueLastRow = i + 1;
        break;
      }
    }
    
    // ป้องกันกรณีชีทว่างเปล่าทั้งหมด ให้เริ่มแถวที่ 1 (หรือ 2 ถ้ามีหัวตาราง)
    if (trueLastRow === 0) {
      trueLastRow = 1; 
    }

    // รันเลข ID คอลัมน์ A ถัดไป
    var nextId = 1;
    if (trueLastRow > 1) {
      var lastIdVal = sheet.getRange(trueLastRow, 1).getValue();
      var lastId = parseInt(lastIdVal);
      // หากพบว่าค่าก่อนหน้าไม่ใช่ตัวเลข ให้ใช้ลำดับตามแถวปัจจุบัน
      nextId = isNaN(lastId) ? trueLastRow : lastId + 1;
    }

    // จัดเรียงข้อมูลเพื่อส่งลงคอลัมน์ A - P
    var newRow = [];
    newRow[0] = nextId;                                         // คอลัมน์ A: ลำดับที่
    newRow[1] = dateThai;                                       // คอลัมน์ B: วัน/เดือน/ปี
    newRow[2] = data.activityName || "";                        // คอลัมน์ C: ชื่อกิจกรรม/โครงการ
    newRow[3] = data.section || "";                             // คอลัมน์ D: ฝ่าย
    newRow[4] = "";                                             // คอลัมน์ E: (ลิงก์แนบ)
    newRow[5] = Number(data.outputPeople) || 0;                 // คอลัมน์ F: ผลผลิต_คน
    newRow[6] = Number(data.outputUnit) || 0;                   // คอลัมน์ G: ผลผลิต_หน่วยงาน
    newRow[7] = Number(data.revenue) || 0;                      // คอลัมน์ H: รายได้
    newRow[8] = Number(data.socialValue) || 0;                  // คอลัมน์ I: มูลค่าทางสังคม
    newRow[9] = data.category || "";                            // คอลัมน์ J: ประเภทกิจกรรม
    newRow[10] = data.workload || data.responsiblePerson || ""; // คอลัมน์ K: ผู้รับผิดชอบ (Workload)
    newRow[11] = data.kpi || data.primaryKpi || "";             // คอลัมน์ L: ตัวชี้วัดหลัก
    newRow[12] = "";                                            // คอลัมน์ M: ตัวชี้วัดรอง
    newRow[13] = data.note || "";                               // คอลัมน์ N: หมายเหตุ
    newRow[14] = Number(data.rewardPeople) || 0;                // คอลัมน์ O: สิทธิ์สมนาคุณ (คน)
    newRow[15] = Number(data.rewardValue) || 0;                 // คอลัมน์ P: สิทธิ์สมนาคุณ (บาท)

    // --- 🛠️ นำข้อมูลไปวางต่อท้ายในแถวที่ว่างจริงๆ (trueLastRow + 1) ---
    sheet.getRange(trueLastRow + 1, 1, 1, newRow.length).setValues([newRow]);
    
    return { status: "success" };
    
  } catch(e) {
    return { status: "error", message: e.toString() };
  }
}

// 4. ฟังก์ชันสำหรับการยิงข้อมูลจากที่อื่นแบบ REST API (POST Request)
function doPost(e) {
  try {
    // กำหนด ID ตาราง Google Sheets ของคุณโดยตรง
    var doc = getSpreadsheetDoc();
    var sheet = doc.getSheetByName("กิจกรรม");
    
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "ไม่พบข้อมูลที่ส่งมา" }))
        .setMimeType(ContentService.MimeType.JSON)
        .addHeader("Access-Control-Allow-Origin", "*");
    }
    
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    
    // จัดตำแหน่งคอลัมน์ตามที่คุณกำหนดอย่างแม่นยำ (A ถึง P)
    var rowData = [
      "",                         // คอลัมน์ A (เว้นว่างไว้)
      data.date || "-",           // คอลัมน์ B: วันที่จัดกิจกรรม (วันที่เริ่ม หรือ วันที่เริ่ม-วันที่สิ้นสุด)
      data.title || "-",          // คอลัมน์ C: ชื่อกิจกรรม / ชื่อโครงการ
      data.dept || "-",           // คอลัมน์ D: ฝ่ายรับผิดชอบ
      data.projectCode || "-",    // คอลัมน์ E: รหัสโครงการ
      data.people || 0,           // คอลัมน์ F: ผลผลิต_คน
      data.orgs || 0,             // คอลัมน์ G: ผลผลิต_หน่วยงาน
      data.income || 0,           // คอลัมน์ H: รายได้ (บาท)
      data.social || 0,           // คอลัมน์ I: มูลค่าทางสังคม (บาท)
      data.category || "-",       // คอลัมน์ J: ประเภทกิจกรรม
      data.responsible || "-",    // คอลัมน์ K: ผู้รับผิดชอบ (กรองตามฝ่ายที่เลือก)
      data.kpi || "-",            // คอลัมน์ L: KPI_สำนัก
      data.notes || "",           // คอลัมน์ M: หมายเหตุ
      "",                         // คอลัมน์ N (เว้นว่าง)
      data.privPeople || 0,       // คอลัมน์ O: สิทธิ์สมนาคุณ จำนวนคน
      data.privValue || 0         // คอลัมน์ P: สิทธิ์สมนาคุณ มูลค่า (บาท)
    ];
    
    sheet.appendRow(rowData);
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON)
      .addHeader("Access-Control-Allow-Origin", "*");
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .addHeader("Access-Control-Allow-Origin", "*");
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("")
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// 5. ฟังก์ชันสำหรับบันทึกข้อมูลจากหน้าเว็บโดยตรง
function addRecord(data) {
  try {
    var doc = getSpreadsheetDoc();
    var sheet = doc.getSheetByName("กิจกรรม") || doc.getSheets()[0];
    
    // หาลำดับ ID (คอลัมน์ A)
    var columnA = sheet.getRange("A:A").getValues();
    var trueLastRow = 0;
    for (var i = columnA.length - 1; i >= 0; i--) {
      if (columnA[i][0] !== "") {
        trueLastRow = i + 1;
        break;
      }
    }
    
    var nextId = 1;
    if (trueLastRow > 1) {
      var lastIdVal = sheet.getRange(trueLastRow, 1).getValue();
      var lastId = parseInt(lastIdVal);
      nextId = isNaN(lastId) ? trueLastRow : lastId + 1;
    }
    if (trueLastRow === 0) trueLastRow = 1;

    var rowData = [
      nextId,                     // คอลัมน์ A (ลำดับที่)
      data.date || "-",           // คอลัมน์ B: วันที่จัดกิจกรรม
      data.title || "-",          // คอลัมน์ C: ชื่อกิจกรรม / ชื่อโครงการ
      data.dept || "-",           // คอลัมน์ D: ฝ่ายรับผิดชอบ
      data.projectCode || "-",    // คอลัมน์ E: รหัสโครงการ
      data.people || 0,           // คอลัมน์ F: ผลผลิต_คน
      data.orgs || 0,             // คอลัมน์ G: ผลผลิต_หน่วยงาน
      data.income || 0,           // คอลัมน์ H: รายได้ (บาท)
      data.social || 0,           // คอลัมน์ I: มูลค่าทางสังคม (บาท)
      data.category || "-",       // คอลัมน์ J: ประเภทกิจกรรม
      data.responsible || "-",    // คอลัมน์ K: ผู้รับผิดชอบ 
      data.kpi || "-",            // คอลัมน์ L: KPI_สำนัก
      data.note || "",            // คอลัมน์ M: หมายเหตุ
      "",                         // คอลัมน์ N (เว้นว่าง)
      data.privPeople || 0,       // คอลัมน์ O: สิทธิ์สมนาคุณ จำนวนคน
      data.privValue || 0         // คอลัมน์ P: สิทธิ์สมนาคุณ มูลค่า (บาท)
    ];
    
    sheet.getRange(trueLastRow + 1, 1, 1, rowData.length).setValues([rowData]);
    return { status: "success" };
  } catch(error) {
    return { status: "error", message: error.toString() };
  }
}

// 6. ฟังก์ชันดึงข้อมูลจากตาราง "ตัวชี้วัด สำนัก"
function getKpiSheetData() {
  try {
    var doc = getSpreadsheetDoc('budget');
    var sheet = doc.getSheetByName("ตัวชี้วัด สำนัก");
    if (!sheet) {
      var sheets = doc.getSheets();
      for (var i = 0; i < sheets.length; i++) {
        var name = sheets[i].getName().replace(/\s+/g, "");
        if (name === "ตัวชี้วัดสำนัก") {
          sheet = sheets[i];
          break;
        }
      }
    }
    
    if (!sheet) return [];
    return sheet.getDataRange().getDisplayValues();
  } catch (e) {
    return [];
  }
}

// =================================================================
// 🔴 ส่วนที่ 2: ฟังก์ชันสำหรับแดชบอร์ดจัดซื้อจัดจ้าง (รายงานจัดซื้อจัดจ้าง.html)
// =================================================================

function cleanNumber(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const cleanStr = val.toString().replace(/[^\d.-]/g, '');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}

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
        if (cellStr.includes(kw)) score++;
      });
    });
    if (score > maxScore) {
      maxScore = score;
      bestRowIndex = i;
    }
  }
  return maxScore > 0 ? bestRowIndex : 0;
}

function getDashboardData(targetSheetName) {
  try {
    const ss = getSpreadsheetDoc('procurement');
    
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
      message: "เกิดข้อผิดพลาด: " + error.toString()
    };
  }
}

function getSheetDataByName(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return { status: "empty", message: "ไม่พบแผ่นงานชื่อ '" + sheetName + "'" };
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { status: "empty", data: [] };
  }
  
  const range = sheet.getRange(1, 1, lastRow, 24);
  const values = range.getValues();
  const headerRowIndex = findHeaderRow(values);
  const dataRows = values.slice(headerRowIndex + 1);
  const formattedData = [];
  
  dataRows.forEach((row, i) => {
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

    for (let c = 0; c < Math.min(row.length, 13); c++) {
      rawRowValues.push(row[c] ? row[c].toString().trim() : "");
    }
    
    contractAmountK = cleanNumber(row[10]);
    contractAmountP = cleanNumber(row[15]);
    
    if (sheetName.includes("ไม่เกิน5แสน")) {
      projectId = row[0] ? row[0].toString().trim() : "";
      docNo = row[1] ? row[1].toString().trim() : "";
      requestNo = row[7] ? row[7].toString().trim() : "";
      projectName = row[8] ? row[8].toString().trim() : "";
      period = row[10] ? row[10].toString().trim() : "-";
      installments = row[11] ? row[11].toString().trim() : "-";
      contractAmount = cleanNumber(row[10]);
      department = row[11] ? row[11].toString().trim() : "ไม่ระบุฝ่าย";
      status = row[12] ? row[12].toString().trim() : "อยู่ระหว่างกระบวนการจัดจ้าง";
      
      method = row[5] ? row[5].toString().trim() : "วิธีเฉพาะเจาะจง";
      vendor = row[6] ? row[6].toString().trim() : "ยังไม่ได้ทำสัญญา";
      date = row[8] ? row[8].toString().trim() : "-";
      budget = cleanNumber(row[2]);
    } else if (sheetName.includes("เกิน5แสน")) {
      projectId = row[1] ? row[1].toString().trim() : "";
      docNo = row[1] ? row[1].toString().trim() : "";
      projectName = row[6] ? row[6].toString().trim() : "";
      requestNo = row[4] ? row[4].toString().trim() : "";
      period = row[12] ? row[12].toString().trim() : "-";
      installments = row[13] ? row[13].toString().trim() : "-";
      contractAmount = cleanNumber(row[10]);
      department = row[11] ? row[11].toString().trim() : "ไม่ระบุฝ่าย";
      status = row[23] ? row[23].toString().trim() : "อยู่ระหว่างกระบวนการจัดจ้าง";
      
      method = row[5] ? row[5].toString().trim() : "วิธี e-Bidding";
      vendor = row[7] ? row[7].toString().trim() : "ยังไม่ได้ทำสัญญา";
      date = row[16] ? row[16].toString().trim() : "-";
      budget = cleanNumber(row[2]);
    } else {
      projectId = row[0] ? row[0].toString().trim() : "";
      docNo = row[1] ? row[1].toString().trim() : "";
      projectName = row[8] || row[6] || "";
      contractAmount = cleanNumber(row[13]) || cleanNumber(row[15]);
      department = row[11] || row[22] || "ไม่ระบุ";
      status = row[12] || row[23] || "เตรียมการ";
    }
    
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

function appendRecordToSheet(rowData) {
  try {
    const ss = getSpreadsheetDoc('procurement');
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
    
    newRow[0] = rowData.projectId;
    newRow[1] = rowData.projectName;
    newRow[2] = cleanNumber(rowData.budget);
    newRow[3] = cleanNumber(rowData.budget);
    newRow[5] = rowData.method;
    newRow[7] = rowData.vendor;
    newRow[8] = rowData.date;
    
    if (sheetName.includes("เกิน5แสน")) {
      newRow[10] = cleanNumber(rowData.contractAmount);
      newRow[11] = rowData.department;
      newRow[23] = rowData.status;
    } else {
      newRow[10] = cleanNumber(rowData.contractAmount);
      newRow[11] = rowData.department;
      newRow[12] = rowData.status;
    }
    
    sheet.appendRow(newRow);
    return { success: true, message: "บันทึกโครงการ " + rowData.projectId + " เรียบร้อยแล้ว" };
  } catch (error) {
    return { success: false, message: "เกิดข้อผิดพลาดในการเขียนสเปรดชีต: " + error.toString() };
  }
}

function generateSampleData() {
  const ss = getSpreadsheetDoc('procurement');
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
      row[0] = i + 1;
      row[1] = isOver ? `DOC-OVER-69${String(i+1).padStart(3, '0')}` : `DOC-UNDER-69${String(i+1).padStart(3, '0')}`;
      row[2] = datasetAmounts[i] * 1.05;
      row[3] = datasetAmounts[i] * 1.02;
      
      if (isOver) {
        row[4] = `REQ-OVER-69${String(i+1).padStart(3, '0')}`;
        row[5] = "วิธี e-Bidding";
        row[6] = datasetProjects[i];
        row[7] = `${90 + (i * 10)} วัน`;
        row[8] = `${2 + (i % 3)} งวด`;
        row[9] = `CN-OVER-${100 + i}`;
        row[10] = datasetAmounts[i];
        row[11] = mockDepts[i % mockDepts.length];
        row[12] = `${90 + (i * 10)} วัน`;
        row[13] = `${2 + (i % 3)} งวด`;
        row[15] = datasetAmounts[i];
        row[22] = mockDepts[i % mockDepts.length];
        row[23] = standardStatuses[i % standardStatuses.length];
      } else {
        row[5] = "วิธีเฉพาะเจาะจง";
        row[6] = `ร้านผู้ชนะจำลองที่ ${i+1}`;
        row[7] = `REQ-UNDER-69${String(i+1).padStart(3, '0')}`;
        row[8] = datasetProjects[i];
        row[9] = datasetAmounts[i];
        row[10] = datasetAmounts[i];
        row[11] = mockDepts[i % mockDepts.length];
        row[12] = standardStatuses[i % standardStatuses.length];
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
}