/**
 * Thai Voice Parser for Item Entry in Procurement System
 * Parses spoken Thai phrases into structured item records { description, quantity, unit, unit_price, total_price }
 */

// Common Thai units for office / procurement supplies
export const COMMON_THAI_UNITS = [
  'กล่อง', 'ชิ้น', 'อัน', 'ชุด', 'รีม', 'เล่ม', 'ด้าม', 'แผ่น', 'ม้วน', 'ตลับ', 
  'แพ็ค', 'แพค', 'ถุง', 'ขวด', 'ลัง', 'กิโลกรัม', 'กก.', 'เครื่อง', 'ใบ', 'คู่', 'ห่อ'
];

/**
 * Convert Thai spoken numbers to numeric value
 * Examples:
 * "หนึ่งพันสองร้อย" -> 1200
 * "ห้าร้อยห้าสิบ" -> 550
 * "แปดหมื่นห้าพัน" -> 85000
 * "ยี่สิบห้า" -> 25
 */
export function thaiSpokenToNumber(text: string): number | null {
  if (!text) return null;
  const clean = text.trim().replace(/\s+/g, '');

  // If already digits e.g. "1200", "750.50"
  if (/^\d+(\.\d+)?$/.test(clean)) {
    return parseFloat(clean);
  }

  const digitMap: Record<string, number> = {
    'ศูนย์': 0, 'หนึ่ง': 1, 'เอ็ด': 1, 'สอง': 2, 'ยี่': 2, 'โท': 2,
    'สาม': 3, 'สี่': 4, 'ห้า': 5, 'หก': 6, 'เจ็ด': 7, 'แปด': 8, 'เก้า': 9
  };

  const scaleMap: Record<string, number> = {
    'ล้าน': 1000000,
    'แสน': 100000,
    'หมื่น': 10000,
    'พัน': 1000,
    'ร้อย': 100,
    'สิบ': 10
  };

  let total = 0;
  let current = 0;
  let hasMatch = false;

  let i = 0;
  while (i < clean.length) {
    let matchedScale = false;
    for (const [scaleName, scaleVal] of Object.entries(scaleMap)) {
      if (clean.startsWith(scaleName, i)) {
        hasMatch = true;
        if (current === 0) current = 1;
        total += current * scaleVal;
        current = 0;
        i += scaleName.length;
        matchedScale = true;
        break;
      }
    }
    if (matchedScale) continue;

    let matchedDigit = false;
    for (const [digitName, digitVal] of Object.entries(digitMap)) {
      if (clean.startsWith(digitName, i)) {
        hasMatch = true;
        current = digitVal;
        i += digitName.length;
        matchedDigit = true;
        break;
      }
    }
    if (matchedDigit) continue;

    // Check for standard arabic digits inside e.g. "2" in "2ร้อย"
    const char = clean[i];
    if (/\d/.test(char)) {
      hasMatch = true;
      current = parseInt(char, 10);
      i++;
      continue;
    }

    // Skip unrecognized chars like "บาท"
    i++;
  }

  total += current;
  return hasMatch && total > 0 ? total : null;
}

export interface ParsedVoiceItem {
  rawText: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

/**
 * Parses a spoken voice string into Item data
 * e.g. "ค่าหมึกพิมพ์ 2 กล่อง หนึ่งพันสองร้อยบาท"
 * or "กระดาษ A4 5 รีม 750 บาท"
 * or "ปากกาลูกลื่น 150 บาท"
 */
export function parseThaiVoiceItem(speechText: string): ParsedVoiceItem {
  let text = speechText.trim();
  
  // Remove trailing "บาท", "บาทถ้วน"
  const priceSuffixRegex = /(?:รวม|ราคา)?\s*(\d+(?:\.\d+)?|[ศูนย์หนึ่งสองสามสี่ห้าหกเจ็ดแปดเก้าเอ็ดยี่ร้อยพันหมื่นแสนล้าน\s]+)\s*(?:บาท|บ\.|บ)(?:ถ้วน)?$/i;
  let extractedTotal = 0;

  const priceMatch = text.match(priceSuffixRegex);
  if (priceMatch) {
    const rawPriceStr = priceMatch[1].trim();
    const parsedNum = thaiSpokenToNumber(rawPriceStr);
    if (parsedNum !== null && parsedNum > 0) {
      extractedTotal = parsedNum;
      // Cut off the price part from text
      text = text.substring(0, priceMatch.index).trim();
    }
  }

  // Next, look for quantity and unit: e.g. "2 กล่อง", "5 รีม", "10 ด้าม", "สองชุด"
  const unitListPattern = COMMON_THAI_UNITS.join('|');
  const qtyUnitRegex = new RegExp(`(?:จำนวน|รวม)?\\s*(\\d+|[ศูนย์หนึ่งสองสามสี่ห้าหกเจ็ดแปดเก้าเอ็ดยี่]+)\\s*(${unitListPattern})\\s*$`, 'i');

  let extractedQty = 1;
  let extractedUnit = 'ชิ้น';

  const qtyMatch = text.match(qtyUnitRegex);
  if (qtyMatch) {
    const rawQtyStr = qtyMatch[1].trim();
    const parsedQty = thaiSpokenToNumber(rawQtyStr);
    if (parsedQty !== null && parsedQty > 0) {
      extractedQty = parsedQty;
    }
    extractedUnit = qtyMatch[2].trim();
    text = text.substring(0, qtyMatch.index).trim();
  } else {
    // Check if unit is without number or at end e.g. "1 กล่อง"
    const standaloneUnitRegex = new RegExp(`(${unitListPattern})\\s*$`, 'i');
    const unitOnlyMatch = text.match(standaloneUnitRegex);
    if (unitOnlyMatch) {
      extractedUnit = unitOnlyMatch[1];
      text = text.substring(0, unitOnlyMatch.index).trim();
    }
  }

  // Clean description
  let description = text.trim();
  // If description starts with "ซื้อ", "รายการ", "ค่า"
  description = description.replace(/^รายการ(?:ที่)?\s*/i, '');
  if (!description) {
    description = 'รายการพัสดุ';
  }

  // If no price was found at the end, check if there are standalone digits
  if (extractedTotal <= 0) {
    const fallbackNumMatch = description.match(/(\d+(?:\.\d+)?)\s*$/);
    if (fallbackNumMatch) {
      extractedTotal = parseFloat(fallbackNumMatch[1]);
      description = description.substring(0, fallbackNumMatch.index).trim();
    }
  }

  const unit_price = extractedQty > 0 ? extractedTotal / extractedQty : extractedTotal;

  return {
    rawText: speechText,
    description: description || 'รายการพัสดุ',
    quantity: extractedQty,
    unit: extractedUnit,
    unit_price: Math.round(unit_price * 100) / 100,
    total_price: extractedTotal
  };
}
