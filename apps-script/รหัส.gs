/**
 * ระบบรวมศูนย์แดชบอร์ดบริหารงบประมาณ & จัดซื้อจัดจ้าง (Unified Google Apps Script Backend)
 * 1. index.html = ระบบบริหารงบประมาณและกิจกรรม
 * 2. รายงานจัดซื้อจัดจ้าง.html = แดชบอร์ดจัดซื้อจัดจ้างสำหรับผู้บริหาร
 */

const SHEET_ID_BUDGET = "1eWkRl_E_PCYWZ_EGRo7_ZC7gP5XlAC_bFVeH2VhD4Tc";

function getSpreadsheetDoc() {
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    if (doc) return doc;
  } catch (e) {}
  return SpreadsheetApp.openById(SHEET_ID_BUDGET);
}

/**
 * 1. ฟังก์ชันเปิดหน้าเว็บ (Dynamic Page Loader)
 * รองรับการสลับหน้า index.html (งบประมาณ) และ รายงานจัดซื้อจัดจ้าง.html
 */
function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) ? e.parameter.page.toString().toLowerCase() : 'index';
  
  if (page === 'procurement' || page === 'index2' || page === 'รายงานจัดซื้อจัดจ้าง' || page === 'report') {
    return HtmlService.createHtmlOutputFromFile('รายงานจัดซื้อจัดจ้าง')
        .setTitle('แดชบอร์ดจัดซื้อจัดจ้างสำหรับผู้บริหาร')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService.createHtmlOutputFromFile('Index')
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
    var doc = getSpreadsheetDoc();
    var sheet = doc.getSheetByName("ตัวชี้วัด สำนัก");
    if (!sheet) {
      // ลองค้นหาโดยไม่สนใจ space เผื่อผู้ใช้พิมพ์มี space เกิน
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