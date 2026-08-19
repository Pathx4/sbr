/**
 * ══════════════════════════════════════════════════════════════════════════
 * 🏛️ ระบบรวมศูนย์แดชบอร์ดบริหารงบประมาณ & จัดซื้อจัดจ้าง สบร. (Unified GAS Backend)
 * สำนักบริการองค์ความรู้ (สบร.) - GISTDA
 * 
 * โมดูลหลัก:
 * 1. ระบบบริหารงบประมาณ กิจกรรม และผลผลิต (Budget & Activities Management)
 * 2. แดชบอร์ดและทะเบียนจัดซื้อจัดจ้างสำหรับผู้บริหาร (Procurement & Contracts)
 * 3. ทะเบียนกำลังคนและภาระงาน (Staff & Workload Matrix)
 * 4. รายงานสรุปเชิงวิเคราะห์ระดับผู้บริหาร (Executive Insights & Analytics)
 * ══════════════════════════════════════════════════════════════════════════
 */

//  ID สเปรดชีตหลัก (Google Sheet IDs)
const BUDGET_SHEET_ID = "1eWkRl_E_PCYWZ_EGRo7_ZC7gP5XlAC_bFVeH2VhD4Tc";
const PROCUREMENT_SHEET_ID = "1XtlZ878S-3UXudK9dAtLvjGQMYYn0jKCcEF14sCGp9Y";

// การตั้งค่าแคชระบบ (Cache Configuration)
const CACHE_TTL_SECONDS = 300; // แคชข้อมูล 5 นาที เพื่อความเร็วสูงสุดระดับ < 50ms
const CACHE_KEY_BUDGET = "sbr_budget_data_v2";
const CACHE_KEY_PROCUREMENT_PREFIX = "sbr_proc_v2_";

/**
 * ฟังก์ชันเปิดเชื่อมต่อ Google Spreadsheet อย่างปลอดภัยและยืดหยุ่น
 * รองรับทั้งแบบ Container-bound (ติดตั้งในชีต) และ Standalone Web App
 */
function getSpreadsheetDoc(type) {
  if (type === 'procurement' && PROCUREMENT_SHEET_ID) {
    try {
      var docProc = SpreadsheetApp.openById(PROCUREMENT_SHEET_ID);
      if (docProc) return docProc;
    } catch (e) {
      Logger.log("ไม่สามารถเปิด PROCUREMENT_SHEET_ID ได้: " + e.toString());
    }
  }
  
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    if (doc) return doc;
  } catch (e) {}
  
  var targetId = (type === 'procurement' && PROCUREMENT_SHEET_ID) ? PROCUREMENT_SHEET_ID : BUDGET_SHEET_ID;
  try {
    return SpreadsheetApp.openById(targetId);
  } catch (err) {
    return SpreadsheetApp.openById(BUDGET_SHEET_ID);
  }
}

/**
 * ฟังก์ชันแปลงและทำความสะอาดตัวเลข ป้องกันข้อผิดพลาดจากคอมม่า เครื่องหมายสกุลเงิน หรือข้อความ
 */
function cleanNumber(val) {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = val.toString().replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * ฟังก์ชันล้างแคชของระบบ (Cache Invalidation)
 */
function clearSystemCache(type) {
  try {
    var cache = CacheService.getScriptCache();
    if (!type || type === 'all' || type === 'budget') {
      cache.remove(CACHE_KEY_BUDGET);
    }
    if (!type || type === 'all' || type === 'procurement') {
      cache.remove(CACHE_KEY_PROCUREMENT_PREFIX + "all");
      cache.remove(CACHE_KEY_PROCUREMENT_PREFIX + "under");
      cache.remove(CACHE_KEY_PROCUREMENT_PREFIX + "over");
    }
  } catch (e) {
    Logger.log("Cache clear error: " + e.toString());
  }
}

/**
 * ══════════════════════════════════════════════════════════════════════════
 * 🌐 WEB APP ROUTING (doGet & doPost & doOptions)
 * ══════════════════════════════════════════════════════════════════════════
 */

/**
 * ฟังก์ชันเปิดหน้าเว็บ (Dynamic Page Loader)
 */
function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) ? e.parameter.page.toString().toLowerCase() : 'index';
  var format = (e && e.parameter && e.parameter.format) ? e.parameter.format.toString().toLowerCase() : '';
  var webAppUrl = ScriptApp.getService().getUrl();

  // รองรับการเรียกข้อมูลแบบ JSON API ผ่าน GET
  if (format === 'json' || page === 'api') {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'all';
    var responseData = {};
    if (action === 'budget') {
      responseData = getSheetData();
    } else if (action === 'procurement') {
      responseData = getDashboardData();
    } else if (action === 'summary') {
      responseData = getExecutiveSummaryData();
    } else {
      responseData = {
        budget: getSheetData(),
        procurement: getDashboardData(),
        summary: getExecutiveSummaryData()
      };
    }
    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  }
  
  // การโหลดหน้า Template
  var templateName = 'Index_modular';
  var title = 'ระบบแดชบอร์ดบริหารงบประมาณและจัดซื้อจัดจ้าง สบร. (Executive Cockpit 2569)';

  if (page === 'procurement' || page === 'index2' || page === 'รายงานจัดซื้อจัดจ้าง' || page === 'report') {
    try {
      var t2 = HtmlService.createTemplateFromFile('index2');
      t2.webAppUrl = webAppUrl;
      return t2.evaluate()
          .setTitle('แดชบอร์ดจัดซื้อจัดจ้างสำหรับผู้บริหาร')
          .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err) {
      // Fallback ไปใช้ Template รวม
    }
  }

  // พยายามโหลด Index_modular หรือ Index
  try {
    var template = HtmlService.createTemplateFromFile('Index_modular');
    template.webAppUrl = webAppUrl;
    return template.evaluate()
        .setTitle(title)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (errModular) {
    try {
      var tIndex = HtmlService.createTemplateFromFile('index');
      tIndex.webAppUrl = webAppUrl;
      return tIndex.evaluate()
          .setTitle(title)
          .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (errFinal) {
      return HtmlService.createHtmlOutput('<h2>ไม่พบเทมเพลตหน้าเว็บ กรุณาตรวจสอบไฟล์ใน Google Apps Script</h2>')
          .setTitle('Error - SBR Dashboard');
    }
  }
}

/**
 * ฟังก์ชัน Include มาตรฐานของ Google Apps Script สำหรับการแยกไฟล์ HTML, CSS, JS
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (e) {
    return '<!-- Error including ' + filename + ': ' + e.toString() + ' -->';
  }
}

/**
 * ฟังก์ชันรับคำขอ POST จากระบบภายนอก (REST API Endpoint พร้อม Action Routing)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "ไม่พบข้อมูลที่ส่งมา (Empty Request Body)" 
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
    }

    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action || "add_activity";
    var result = { status: "error", message: "Unknown action" };

    // รอคิว Lock ไม่เกิน 15 วินาที
    lock.waitLock(15000);

    if (action === "add_activity" || action === "save_activity") {
      result = addRecord(requestData.data || requestData);
    } else if (action === "update_activity") {
      result = updateActivityRecord(requestData.id, requestData.data || requestData);
    } else if (action === "delete_activity") {
      result = deleteActivityRecord(requestData.id);
    } else if (action === "add_procurement") {
      result = appendRecordToSheet(requestData.data || requestData);
    } else if (action === "update_procurement") {
      result = updateProcurementRecord(requestData.docNo || requestData.id, requestData.data || requestData);
    } else if (action === "delete_procurement") {
      result = deleteProcurementRecord(requestData.docNo || requestData.id, requestData.targetSheet);
    } else if (action === "clear_cache") {
      clearSystemCache('all');
      result = { status: "success", message: "ล้างแคชระบบเรียบร้อยแล้ว" };
    }

    // ล้างแคชเพื่อให้ข้อมูลอัปเดตทันที
    clearSystemCache('all');

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: error.toString() 
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

/**
 * ฟังก์ชันจัดการ CORS Preflight
 */
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

/**
 * ══════════════════════════════════════════════════════════════════════════
 * 📊 ส่วนที่ 1: ระบบบริหารงบประมาณและกิจกรรม (Budget & Activities)
 * ══════════════════════════════════════════════════════════════════════════
 */

/**
 * ดึงข้อมูลกิจกรรมและตัวชี้วัดทั้งหมด พร้อมระบบแคชความเร็วสูง
 */
function getSheetData(forceRefresh) {
  var cache = CacheService.getScriptCache();
  
  if (!forceRefresh) {
    var cached = cache.get(CACHE_KEY_BUDGET);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
  }

  try {
    var doc = getSpreadsheetDoc();
    var actSheet = doc.getSheetByName("กิจกรรม") || doc.getSheets()[0];
    var actData = actSheet ? actSheet.getDataRange().getDisplayValues() : [];
    
    // ค้นหาชีตตัวชี้วัดสำนัก
    var kpiSheet = doc.getSheetByName("ตัวชี้วัด สำนัก") || doc.getSheetByName("ตัวชี้วัดสำนัก") || doc.getSheetByName("ตัวชี้วัด_สำนัก");
    if (!kpiSheet) {
      var sheets = doc.getSheets();
      for (var i = 0; i < sheets.length; i++) {
        var name = sheets[i].getName().replace(/\s+/g, "");
        if (name.includes("ตัวชี้วัด")) {
          kpiSheet = sheets[i];
          break;
        }
      }
    }
    var kpiData = kpiSheet ? kpiSheet.getDataRange().getDisplayValues() : [];
    
    var response = {
      status: "success",
      activities: actData,
      kpiData: kpiData,
      timestamp: new Date().toISOString()
    };

    // บันทึกลงแคช (เฉพาะกรณีมีข้อมูล)
    if (actData && actData.length > 0) {
      try {
        var jsonStr = JSON.stringify(response);
        if (jsonStr.length < 100000) { // Google Cache Service limit คือ 100KB ต่อคีย์
          cache.put(CACHE_KEY_BUDGET, jsonStr, CACHE_TTL_SECONDS);
        }
      } catch (ce) {}
    }

    return response;
  } catch (e) {
    return { status: "error", message: e.toString(), activities: [], kpiData: [] };
  }
}

/**
 * บันทึกกิจกรรมใหม่ลงชีต "กิจกรรม" (Thread-safe ด้วย LockService + มาตรฐาน Schema คอลัมน์ A ถึง P)
 */
function addRecord(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    var doc = getSpreadsheetDoc();
    var sheet = doc.getSheetByName("กิจกรรม") || doc.getSheets()[0];
    
    // ค้นหาแถวสุดท้ายที่มีข้อมูลแท้จริงจากคอลัมน์ A
    var columnA = sheet.getRange("A:A").getValues();
    var trueLastRow = 0;
    for (var i = columnA.length - 1; i >= 0; i--) {
      if (columnA[i][0] !== "" && columnA[i][0] !== null) {
        trueLastRow = i + 1;
        break;
      }
    }
    
    // คำนวณรหัส ID ลำดับถัดไป
    var nextId = 1;
    if (trueLastRow > 1) {
      var lastIdVal = sheet.getRange(trueLastRow, 1).getValue();
      var lastId = parseInt(lastIdVal);
      nextId = isNaN(lastId) ? trueLastRow : lastId + 1;
    }
    if (trueLastRow === 0) trueLastRow = 1;

    // จัดรูปแบบวันที่ภาษาไทย
    var dateVal = data.date || data.startDate || "-";
    if (data.startDate && data.endDate && data.startDate !== data.endDate) {
      dateVal = formatThaiDateRange(data.startDate, data.endDate);
    } else if (data.startDate) {
      dateVal = formatThaiDateSingle(data.startDate);
    }

    // จัดเรียง Schema มาตรฐาน คอลัมน์ A ถึง P
    var rowData = [
      nextId,                                           // A: ลำดับที่
      dateVal,                                          // B: วัน/เดือน/ปี
      data.title || data.activityName || "-",           // C: ชื่อกิจกรรม / โครงการ
      data.dept || data.section || "-",                 // D: ฝ่าย
      data.projectCode || data.link || "-",             // E: รหัสโครงการ / ลิงก์
      cleanNumber(data.people || data.outputPeople),    // F: ผลผลิต_คน
      cleanNumber(data.orgs || data.outputUnit),        // G: ผลผลิต_หน่วยงาน
      cleanNumber(data.income || data.revenue),         // H: รายได้ (บาท)
      cleanNumber(data.social || data.socialValue),     // I: มูลค่าทางสังคม (บาท)
      data.category || "-",                             // J: ประเภทกิจกรรม
      data.responsible || data.workload || "-",         // K: ผู้รับผิดชอบ
      data.kpi || data.primaryKpi || "-",               // L: ตัวชี้วัดหลัก (KPI สำนัก)
      data.note || data.subKpi || "",                   // M: หมายเหตุ
      "",                                               // N: สำรอง
      cleanNumber(data.privPeople || data.rewardPeople),// O: สิทธิ์สมนาคุณ (คน)
      cleanNumber(data.privValue || data.rewardValue)   // P: สิทธิ์สมนาคุณ (บาท)
    ];
    
    sheet.getRange(trueLastRow + 1, 1, 1, rowData.length).setValues([rowData]);
    
    // ล้างแคชเพื่อให้ระบบดึงข้อมูลใหม่อัตโนมัติ
    clearSystemCache('budget');

    return { status: "success", id: nextId, message: "บันทึกกิจกรรมเรียบร้อยแล้ว" };
  } catch(error) {
    return { status: "error", message: error.toString() };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

/**
 * อัปเดต/แก้ไขกิจกรรมตามลำดับ ID (Thread-safe)
 */
function updateActivityRecord(targetId, data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    var doc = getSpreadsheetDoc();
    var sheet = doc.getSheetByName("กิจกรรม") || doc.getSheets()[0];
    var dataValues = sheet.getDataRange().getValues();
    var foundRow = -1;

    for (var i = 1; i < dataValues.length; i++) {
      if (dataValues[i][0].toString().trim() === targetId.toString().trim()) {
        foundRow = i + 1; // 1-indexed row in sheet
        break;
      }
    }

    if (foundRow === -1) {
      return { status: "error", message: "ไม่พบรายการกิจกรรม ID: " + targetId };
    }

    var dateVal = data.date || data.startDate || dataValues[foundRow - 1][1];
    if (data.startDate && data.endDate && data.startDate !== data.endDate) {
      dateVal = formatThaiDateRange(data.startDate, data.endDate);
    }

    var updatedRow = [
      targetId,
      dateVal,
      data.title || data.activityName || dataValues[foundRow - 1][2],
      data.dept || data.section || dataValues[foundRow - 1][3],
      data.projectCode !== undefined ? data.projectCode : dataValues[foundRow - 1][4],
      cleanNumber(data.people !== undefined ? data.people : dataValues[foundRow - 1][5]),
      cleanNumber(data.orgs !== undefined ? data.orgs : dataValues[foundRow - 1][6]),
      cleanNumber(data.income !== undefined ? data.income : dataValues[foundRow - 1][7]),
      cleanNumber(data.social !== undefined ? data.social : dataValues[foundRow - 1][8]),
      data.category || dataValues[foundRow - 1][9],
      data.responsible || dataValues[foundRow - 1][10],
      data.kpi || dataValues[foundRow - 1][11],
      data.note !== undefined ? data.note : dataValues[foundRow - 1][12],
      "",
      cleanNumber(data.privPeople !== undefined ? data.privPeople : dataValues[foundRow - 1][14]),
      cleanNumber(data.privValue !== undefined ? data.privValue : dataValues[foundRow - 1][15])
    ];

    sheet.getRange(foundRow, 1, 1, updatedRow.length).setValues([updatedRow]);
    clearSystemCache('budget');

    return { status: "success", message: "แก้ไขกิจกรรม ID: " + targetId + " เรียบร้อยแล้ว" };
  } catch(error) {
    return { status: "error", message: error.toString() };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

/**
 * ลบกิจกรรมตามลำดับ ID (Thread-safe)
 */
function deleteActivityRecord(targetId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    var doc = getSpreadsheetDoc();
    var sheet = doc.getSheetByName("กิจกรรม") || doc.getSheets()[0];
    var dataValues = sheet.getDataRange().getValues();
    var foundRow = -1;

    for (var i = 1; i < dataValues.length; i++) {
      if (dataValues[i][0].toString().trim() === targetId.toString().trim()) {
        foundRow = i + 1;
        break;
      }
    }

    if (foundRow === -1) {
      return { status: "error", message: "ไม่พบรายการกิจกรรม ID: " + targetId };
    }

    sheet.deleteRow(foundRow);
    clearSystemCache('budget');

    return { status: "success", message: "ลบกิจกรรม ID: " + targetId + " เรียบร้อยแล้ว" };
  } catch(error) {
    return { status: "error", message: error.toString() };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

/**
 * ══════════════════════════════════════════════════════════════════════════
 * 🛒 ส่วนที่ 2: ระบบรายงานจัดซื้อจัดจ้างสำหรับผู้บริหาร (Procurement Analytics)
 * ══════════════════════════════════════════════════════════════════════════
 */

/**
 * ค้นหาแถวที่เป็นหัวข้อตาราง (Header Row) ที่แท้จริง
 */
function findHeaderRow(values) {
  let bestRowIndex = 0;
  let maxScore = -1;
  const keywords = ["โครงการ", "งบประมาณ", "สถานะ", "ฝ่าย", "จำนวนเงิน", "ตกลง", "สัญญา", "เลขที่", "ผู้ชนะ", "วันที่", "ลำดับ", "รายการ"];
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
 * สกัดข้อความสถานะจัดซื้อจัดจ้างที่ถูกต้อง
 */
function extractValidStatus(v1, v2, v3) {
  function getFirstStatusPhrase(val) {
    if (!val) return "";
    var str = val.toString().trim();
    var phrases = str.split(/[\/\n\r,]+/);
    for (var i = 0; i < phrases.length; i++) {
      var phrase = phrases[i].trim();
      if (phrase && !phrase.includes("วัน") && isNaN(parseFloat(phrase))) {
        return phrase;
      }
    }
    return phrases[0] ? phrases[0].trim() : "";
  }
  
  var candidates = [v1, v2, v3];
  for (var k = 0; k < candidates.length; k++) {
    var s = getFirstStatusPhrase(candidates[k]);
    if (s && !s.includes("วัน") && isNaN(parseFloat(s))) {
      return s;
    }
  }
  return "อยู่ระหว่างกระบวนการจัดจ้าง";
}

/**
 * ดึงข้อมูลสเปรดชีตจัดซื้อจัดจ้างรายแผ่นงาน
 */
function getSheetDataByName(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return { status: "empty", message: "ไม่พบแผ่นงานชื่อ '" + sheetName + "'", data: [] };
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { status: "empty", data: [] };
  }
  
  // ดึงคอลัมน์กว้าง 24 คอลัมน์ (A ถึง X)
  const range = sheet.getRange(1, 1, lastRow, 24);
  const values = range.getValues();
  const headerRowIndex = findHeaderRow(values);
  const dataRows = values.slice(headerRowIndex + 1);
  const formattedData = [];
  
  dataRows.forEach((row, i) => {
    let projectId = row[0] ? row[0].toString().trim() : "";
    let docNo = row[1] ? row[1].toString().trim() : "";
    let eproNo = row[2] ? row[2].toString().trim() : "";
    let method = row[3] ? row[3].toString().trim() : (sheetName.includes("เกิน") ? "วิธี e-Bidding" : "วิธีเฉพาะเจาะจง");
    let requestNo = row[4] ? row[4].toString().trim() : "";
    let projectName = row[5] ? row[5].toString().trim() : (row[6] ? row[6].toString().trim() : "ไม่ได้ระบุรายการ");
    let vendor = row[6] ? row[6].toString().trim() : "ยังไม่ได้ทำสัญญา";
    let period = row[7] ? row[7].toString().trim() : "-";
    let installments = row[8] ? row[8].toString().trim() : "-";
    let date = row[9] ? row[9].toString().trim() : (row[16] ? row[16].toString().trim() : "-");
    let contractAmountK = cleanNumber(row[10]);
    let contractAmountP = cleanNumber(row[15]);
    let contractAmount = contractAmountK || contractAmountP || cleanNumber(row[9]);
    let department = row[11] ? row[11].toString().trim() : (row[22] ? row[22].toString().trim() : "ไม่ระบุฝ่าย");
    let status = extractValidStatus(row[12], row[23], row[8]);
    let budget = cleanNumber(row[2]) || cleanNumber(row[3]) || contractAmount; // ดึงงบประมาณตั้งต้น / ราคากลาง

    let rawRowValues = [];
    for (let c = 0; c < Math.min(row.length, 24); c++) {
      rawRowValues.push(row[c] ? row[c].toString().trim() : "");
    }
    
    var rawJoined = rawRowValues.join("").trim();
    if (!rawJoined || (!projectName && !docNo && !status)) {
      return;
    }
    
    formattedData.push({
      id: i + 1,
      projectId: projectId,
      docNo: docNo,
      eproNo: eproNo,
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
      sheetName: sheetName,
      sheetType: (!sheetName.includes("ไม่เกิน") && (sheetName.includes("เกิน5แสน") || sheetName.includes("เกิน 5 แสน") || sheetName.includes("เกิน"))) ? "over" : "under"
    });
  });
  
  return {
    status: "success",
    data: formattedData,
    sheetName: sheetName
  };
}

/**
 * ดึงข้อมูลแดชบอร์ดจัดซื้อจัดจ้าง พร้อมระบบแคช
 */
function getDashboardData(targetSheetName, forceRefresh) {
  var cache = CacheService.getScriptCache();
  var cacheKey = CACHE_KEY_PROCUREMENT_PREFIX + (targetSheetName || "all");

  if (!forceRefresh) {
    var cached = cache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
  }

  try {
    const ss = getSpreadsheetDoc('procurement');
    var result = {};
    
    if (!targetSheetName || targetSheetName === "จัดซื้อจัดจ้างทั้งหมด" || targetSheetName.includes("ทั้งหมด")) {
      const dataUnder = getSheetDataByName(ss, "จัดซื้อจัดจ้าง 2569 (ไม่เกิน5แสน)");
      const dataOver = getSheetDataByName(ss, "จัดซื้อจัดจ้าง 2569 (เกิน5แสน)");
      
      let combinedData = [];
      if (dataUnder.status === "success") combinedData = combinedData.concat(dataUnder.data);
      if (dataOver.status === "success") combinedData = combinedData.concat(dataOver.data);
      
      combinedData.forEach((item, idx) => {
        item.id = idx + 1;
      });
      
      result = {
        status: "success",
        data: combinedData,
        sheetName: "จัดซื้อจัดจ้างทั้งหมด [ภาพรวม]",
        isAll: true,
        timestamp: new Date().toISOString()
      };
    } else {
      result = getSheetDataByName(ss, targetSheetName || "จัดซื้อจัดจ้าง 2569 (ไม่เกิน5แสน)");
      result.timestamp = new Date().toISOString();
    }

    if (result && result.data && result.data.length > 0) {
      try {
        var jsonStr = JSON.stringify(result);
        if (jsonStr.length < 100000) {
          cache.put(cacheKey, jsonStr, CACHE_TTL_SECONDS);
        }
      } catch(ce) {}
    }

    return result;
  } catch (error) {
    return {
      status: "error",
      message: "เกิดข้อผิดพลาดคลาวด์เซิร์ฟเวอร์: " + error.toString(),
      data: []
    };
  }
}

/**
 * เพิ่มโครงการจัดซื้อจัดจ้างใหม่ (Thread-safe)
 */
function appendRecordToSheet(rowData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    const ss = getSpreadsheetDoc('procurement');
    let sheetName = rowData.targetSheet;
    
    if (!sheetName || sheetName === "จัดซื้อจัดจ้างทั้งหมด") {
      sheetName = (cleanNumber(rowData.contractAmount) > 500000) ? 
        "จัดซื้อจัดจ้าง 2569 (เกิน5แสน)" : "จัดซื้อจัดจ้าง 2569 (ไม่เกิน5แสน)";
    }
    
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return { status: "error", message: "ไม่พบแผ่นงานชื่อ '" + sheetName + "' บน Google Sheets" };
    }
    
    const newRow = Array(24).fill("");
    newRow[0] = rowData.projectId || sheet.getLastRow();
    newRow[1] = rowData.docNo || "";
    newRow[2] = cleanNumber(rowData.budget);
    newRow[3] = cleanNumber(rowData.budget);
    newRow[4] = rowData.requestNo || "";
    newRow[5] = rowData.method || (sheetName.includes("เกิน") ? "วิธี e-Bidding" : "วิธีเฉพาะเจาะจง");
    newRow[6] = rowData.projectName || "";
    newRow[7] = rowData.vendor || "";
    newRow[8] = rowData.period || "-";
    newRow[9] = rowData.installments || "-";
    newRow[10] = cleanNumber(rowData.contractAmount);
    newRow[11] = rowData.department || "ไม่ระบุฝ่าย";
    newRow[12] = rowData.status || "อยู่ระหว่างกระบวนการจัดจ้าง";
    
    if (sheetName.includes("เกิน5แสน")) {
      newRow[15] = cleanNumber(rowData.contractAmount);
      newRow[22] = rowData.department;
      newRow[23] = rowData.status;
    }
    
    sheet.appendRow(newRow);
    clearSystemCache('procurement');

    return { status: "success", message: "บันทึกโครงการ " + (rowData.projectName || "") + " เรียบร้อยแล้ว" };
  } catch (error) {
    return { status: "error", message: "เกิดข้อผิดพลาดในการเขียนสเปรดชีต: " + error.toString() };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

/**
 * แก้ไขรายการจัดซื้อจัดจ้าง (Thread-safe)
 */
function updateProcurementRecord(docNoOrId, rowData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    const ss = getSpreadsheetDoc('procurement');
    var targetSheetName = rowData.sheetName || (cleanNumber(rowData.contractAmount) > 500000 ? "จัดซื้อจัดจ้าง 2569 (เกิน5แสน)" : "จัดซื้อจัดจ้าง 2569 (ไม่เกิน5แสน)");
    var sheet = ss.getSheetByName(targetSheetName);
    
    if (!sheet) {
      var sheets = [ss.getSheetByName("จัดซื้อจัดจ้าง 2569 (ไม่เกิน5แสน)"), ss.getSheetByName("จัดซื้อจัดจ้าง 2569 (เกิน5แสน)")];
      for (var s = 0; s < sheets.length; s++) {
        if (sheets[s]) { sheet = sheets[s]; break; }
      }
    }

    if (!sheet) {
      return { status: "error", message: "ไม่พบแผ่นงานจัดซื้อจัดจ้าง" };
    }

    var values = sheet.getDataRange().getValues();
    var targetRow = -1;

    for (var r = 1; r < values.length; r++) {
      if (values[r][1].toString().trim() === docNoOrId.toString().trim() || values[r][0].toString().trim() === docNoOrId.toString().trim()) {
        targetRow = r + 1;
        break;
      }
    }

    if (targetRow === -1) {
      return { status: "error", message: "ไม่พบโครงการรหัส: " + docNoOrId };
    }

    if (rowData.projectName) sheet.getRange(targetRow, 6).setValue(rowData.projectName);
    if (rowData.vendor) sheet.getRange(targetRow, 7).setValue(rowData.vendor);
    if (rowData.contractAmount !== undefined) sheet.getRange(targetRow, 11).setValue(cleanNumber(rowData.contractAmount));
    if (rowData.department) sheet.getRange(targetRow, 12).setValue(rowData.department);
    if (rowData.status) {
      sheet.getRange(targetRow, 13).setValue(rowData.status);
      if (targetSheetName.includes("เกิน")) sheet.getRange(targetRow, 24).setValue(rowData.status);
    }

    clearSystemCache('procurement');
    return { status: "success", message: "อัปเดตข้อมูลโครงการเรียบร้อยแล้ว" };
  } catch (e) {
    return { status: "error", message: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

/**
 * ลบรายการจัดซื้อจัดจ้าง (Thread-safe)
 */
function deleteProcurementRecord(docNoOrId, sheetName) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    const ss = getSpreadsheetDoc('procurement');
    var targetSheet = sheetName ? ss.getSheetByName(sheetName) : null;
    
    if (!targetSheet) {
      var sheets = [ss.getSheetByName("จัดซื้อจัดจ้าง 2569 (ไม่เกิน5แสน)"), ss.getSheetByName("จัดซื้อจัดจ้าง 2569 (เกิน5แสน)")];
      for (var s = 0; s < sheets.length; s++) {
        if (!sheets[s]) continue;
        var vals = sheets[s].getDataRange().getValues();
        for (var r = 1; r < vals.length; r++) {
          if (vals[r][1].toString().trim() === docNoOrId.toString().trim() || vals[r][0].toString().trim() === docNoOrId.toString().trim()) {
            targetSheet = sheets[s];
            break;
          }
        }
        if (targetSheet) break;
      }
    }

    if (!targetSheet) {
      return { status: "error", message: "ไม่พบโครงการหรือแผ่นงานที่ต้องการลบ" };
    }

    var vals = targetSheet.getDataRange().getValues();
    var targetRow = -1;
    for (var r = 1; r < vals.length; r++) {
      if (vals[r][1].toString().trim() === docNoOrId.toString().trim() || vals[r][0].toString().trim() === docNoOrId.toString().trim()) {
        targetRow = r + 1;
        break;
      }
    }

    if (targetRow === -1) {
      return { status: "error", message: "ไม่พบโครงการรหัส: " + docNoOrId };
    }

    targetSheet.deleteRow(targetRow);
    clearSystemCache('procurement');

    return { status: "success", message: "ลบโครงการจัดซื้อจัดจ้างเรียบร้อยแล้ว" };
  } catch (e) {
    return { status: "error", message: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

/**
 * ══════════════════════════════════════════════════════════════════════════
 * 📈 ส่วนที่ 3: สรุปเชิงวิเคราะห์ระดับผู้บริหาร (Executive Aggregator)
 * ══════════════════════════════════════════════════════════════════════════
 */
function getExecutiveSummaryData() {
  try {
    var budgetData = getSheetData();
    var procData = getDashboardData();
    
    var totalActivities = (budgetData.activities && budgetData.activities.length > 1) ? budgetData.activities.length - 1 : 0;
    var totalProcCount = procData.data ? procData.data.length : 0;
    
    var totalPeople = 0;
    var totalRevenue = 0;
    var totalSocialValue = 0;
    var totalContractValue = 0;
    var paidContractCount = 0;

    if (budgetData.activities && budgetData.activities.length > 1) {
      for (var i = 1; i < budgetData.activities.length; i++) {
        var row = budgetData.activities[i];
        totalPeople += cleanNumber(row[5]);
        totalRevenue += cleanNumber(row[7]);
        totalSocialValue += cleanNumber(row[8]);
      }
    }

    if (procData.data && procData.data.length > 0) {
      procData.data.forEach(function(item) {
        var amt = cleanNumber(item.contractAmount || item.contractAmountK || item.contractAmountP);
        totalContractValue += amt;
        if (item.status && (item.status.includes("เบิกจ่าย") || item.status.includes("จบงาน"))) {
          paidContractCount++;
        }
      });
    }

    return {
      status: "success",
      summary: {
        totalActivities: totalActivities,
        totalPeople: totalPeople,
        totalRevenue: totalRevenue,
        totalSocialValue: totalSocialValue,
        totalEconomicImpact: totalRevenue + totalSocialValue,
        totalProcCount: totalProcCount,
        totalContractValue: totalContractValue,
        paidContractCount: paidContractCount,
        paidContractRate: totalProcCount > 0 ? Math.round((paidContractCount / totalProcCount) * 100) : 0
      },
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

/**
 * ══════════════════════════════════════════════════════════════════════════
 * 🛠️ UTILITIES & SAMPLE DATA GENERATOR
 * ══════════════════════════════════════════════════════════════════════════
 */

function formatThaiDateSingle(dStr) {
  if (!dStr) return "";
  var parts = dStr.split('-');
  if (parts.length === 3) {
    return parseInt(parts[2]) + "/" + parseInt(parts[1]) + "/" + (parseInt(parts[0]) + 543);
  }
  return dStr;
}

function formatThaiDateRange(startStr, endStr) {
  if (!startStr) return "";
  if (!endStr || startStr === endStr) return formatThaiDateSingle(startStr);
  
  var sParts = startStr.split('-');
  var eParts = endStr.split('-');
  if (sParts.length === 3 && eParts.length === 3) {
    var sD = parseInt(sParts[2]), sM = parseInt(sParts[1]), sY = parseInt(sParts[0]) + 543;
    var eD = parseInt(eParts[2]), eM = parseInt(eParts[1]), eY = parseInt(eParts[0]) + 543;
    if (sM === eM && sY === eY) {
      return sD + "-" + eD + "/" + sM + "/" + sY;
    }
    return sD + "/" + sM + "/" + sY + " - " + eD + "/" + eM + "/" + eY;
  }
  return startStr + " - " + endStr;
}

/**
 * เมนูส่วนขยายบน Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 แดชบอร์ดผู้บริหาร สบร.')
    .addItem('📊 เปิดหน้า Dashboard สบร. (Sidebar)', 'openDashboardSidebar')
    .addItem('🔄 ล้างแคชระบบ (Clear Cache)', 'menuClearCache')
    .addSeparator()
    .addItem('✨ สร้างข้อมูลจัดซื้อจัดจ้างจำลอง (Mock Data)', 'generateSampleData')
    .addToUi();
}

function openDashboardSidebar() {
  const html = HtmlService.createTemplateFromFile('Index_modular')
    .evaluate()
    .setTitle('Executive Cockpit - สบร.')
    .setWidth(850);
  SpreadsheetApp.getUi().showSidebar(html);
}

function menuClearCache() {
  clearSystemCache('all');
  SpreadsheetApp.getUi().alert("ล้างแคชระบบเรียบร้อยแล้ว ข้อมูลจะถูกดึงใหม่แบบเรียลไทม์");
}

/**
 * สร้างข้อมูลจำลองสำหรับการทดสอบ
 */
function generateSampleData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const check = Browser.msgBox("ยืนยันการทำจำลองข้อมูล", "ระบบจะสร้างฐานข้อมูลตัวอย่างจำลองบนแผ่นงานใหม่แยกตาม 8 สถานะมาตรฐานล่าสุด ต้องการดำเนินการต่อหรือไม่?", Browser.Buttons.YES_NO);
  if (check === "no") return;

  const mockDepts = ["ฝ่ายเทคโนโลยีสารสนเทศ", "ฝ่ายบริหารงานทั่วไป", "ฝ่ายจัดส่งและคลังสินค้า", "ฝ่ายทรัพยากรบุคคล", "ฝ่ายบัญชีและการเงิน"];
  
  const standardStatuses = [
    "อยู่ระหว่างกระบวนการจัดจ้าง",
    "งานระหว่างทำ",
    "ส่งมอบงานแล้ว รอตรวจรับ",
    "อยู่ระหว่าง คกก. ตรวจรับ",
    "ส่งรายงานตรวจรับแล้ว /รอพัสดุตรวจ",
    "อนุมัติรายงานตรวจรับแล้ว",
    "เบิกจ่ายแล้ว/จบงาน",
    "ยกเลิกการจัดซื้อ/จัดจ้าง"
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
      else if (i === 5) headers.push("วิธีการจัดหา (F)");
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
  clearSystemCache('all');
}