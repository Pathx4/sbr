// Advanced Utility for Image Preprocessing & Ultra-High Precision Thai/English OCR
// High-Precision Vendor Detector (Thai & English) with Smart Branch/Tag Stripping

function otsuThreshold(pixels: Uint8ClampedArray, width: number, height: number): number {
  const histogram = new Array(256).fill(0);
  const totalPixels = width * height;

  for (let i = 0; i < pixels.length; i += 4) {
    const gray = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
    pixels[i] = gray;
    histogram[gray]++;
  }

  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const varianceBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varianceBetween > maxVariance) {
      maxVariance = varianceBetween;
      threshold = t;
    }
  }

  return threshold;
}

export function preprocessImageForOcr(file: File, isHeaderOnly: boolean = false): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(objectUrl);
          return;
        }

        const sourceY = 0;
        const sourceHeight = isHeaderOnly ? Math.round(img.height * 0.40) : img.height;

        let width = img.width;
        let height = sourceHeight;
        
        // High-DPI Upscaling to 3600px for crystal-clear character edges
        if (width < 3600) {
          const ratio = 3600 / width;
          width = 3600;
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, sourceY, img.width, sourceHeight, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Apply High-Contrast Enhancement + Otsu Binarization Thresholding
        const threshold = otsuThreshold(data, width, height);
        const contrastFactor = 1.25;

        for (let i = 0; i < data.length; i += 4) {
          let gray = data[i];
          gray = ((gray - 128) * contrastFactor) + 128;
          gray = Math.max(0, Math.min(255, gray));

          const bin = gray < threshold ? 0 : 255;
          data[i] = bin;
          data[i + 1] = bin;
          data[i + 2] = bin;
        }

        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      } catch (e) {
        console.warn("Canvas preprocessing fallback:", e);
        resolve(objectUrl);
      }
    };

    img.onerror = () => {
      resolve(objectUrl);
    };

    img.src = objectUrl;
  });
}

/**
 * High-Precision Thai & English Technical & Hardware Fuzzy Correction Dictionary
 */
const TYPO_MAP: Record<string, string> = {
  '4%6': '4x6',
  '4%': '4x',
  '8%': '',
  'LEETECIH': 'LEETECH',
  'una': 'แท่ง',
  'ค้ำปืน': 'ด้ามปืน',
  '20wr120W': '20W/120W',
  '1แร': '1มม.',
  'ชิน': 'ชิ้น',
  'กลอง': 'กล่อง',
  'เครอง': 'เครื่อง',
  'อน': 'อัน',
  'แพค': 'แพ็ค',
  'มวน': 'ม้วน',
  'แทง': 'แท่ง',
  'บรษท': 'บริษัท',
  'หจก': 'หจก.',
  'บาn': 'บาท',
  'บาทท': 'บาท',
  // Hardware & Electrical Misread Corrections (From User Screenshots)
  'พเผลปลั๊ก': 'พาวเวอร์ปลั๊ก',
  'พเอ0ปลั๊ก': 'พาวเวอร์ปลั๊ก',
  'หผอปลั๊ก': 'พาวเวอร์ปลั๊ก',
  'พเผล': 'พาวเวอร์',
  'พเอ0': 'พาวเวอร์',
  'หผอ': 'พาวเวอร์',
  'เผด ': 'เมตร ',
  'เผด': 'เมตร',
  'หม0204': 'โมดูล 0204',
  'หม0': 'โมดูล ',
  'เห1537': 'โมดูล 1537',
  'เห1688': 'โมดูล 1688',
  'เห1': 'โมดูล 1',
  'ปลัก': 'ปลั๊ก',
  'สวิทช์': 'สวิตช์',
  'สายไฟออน': 'สายไฟอ่อน',
  'แบตเตอรี': 'แบตเตอรี่',
  'ลิเธย': 'ลิเธียม',
  'โซลาร': 'โซลาร์',
  'เชลล์': 'เซลล์',
  'ชิสเต็ม': 'ซิสเต็ม',
  'รส<ม': '',
  'a โ o a': ''
};

function cleanThaiText(str: string): string {
  let cleaned = str
    .replace(/^([!\?\.\-\|\+:งv\s\d]*\d{1,2}\s*[v\|\.\-\:\)\s]+)/gi, '')
    .replace(/^[!\?\.\-\|\+:งv\s\d]+/gi, '')
    .replace(/[ฒณ|\[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  Object.keys(TYPO_MAP).forEach(typo => {
    const re = new RegExp(typo.replace(/%/g, '\\%'), 'g');
    cleaned = cleaned.replace(re, TYPO_MAP[typo]);
  });

  return cleaned;
}

function isGarbledThaiGibberish(text: string): boolean {
  if (text.length < 4) return false;
  if (!/[ก-ฮa-zA-Z]/.test(text)) return false;

  const thaiConsonantCount = (text.match(/[ก-ฮ]/g) || []).length;
  const hasVowels = /[ะาิีึืุูเแโใไำ็์]/.test(text);

  // If there are > 5 Thai consonants but 0 vowels and no english -> Garbled OCR noise!
  if (thaiConsonantCount >= 5 && !hasVowels && !/[a-zA-Z]{3,}/.test(text)) {
    return true;
  }

  return false;
}

export interface ParsedReceipt {
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  items: Array<{
    item_code: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
  }>;
}

/**
 * Clean trailing branch / tax ID details and garbled noise off company name string
 */
function cleanCompanyName(name: string): string {
  return name
    .replace(/^[^ก-ฮa-zA-Z0-9]*(?=(?:บริษัท|หจก|ร้าน|ห้าง|ศูนย์|สำนักงาน|Co\.,?\s*Ltd|Inc\.|Corp\.|Ltd\.))/i, '')
    .replace(/\s*\(?(?:สาขา|สาขาที่|Branch|Tax ID|TAX|เลขประจำตัว|โทร|TEL|FAX).*/i, '')
    .replace(/[\(\)\{\}\[\]<>]+/g, ' ')
    .replace(/[a-z\s<]{3,}$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts Vendor Name from OCR text in Thai & English
 */
export function extractVendorNameFromText(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Priority 1: Direct Match for Company prefix in Thai or English
  for (const line of lines.slice(0, 15)) {
    if (/(?:บริษัท|หจก\.|หจก|ร้าน|ห้างหุ้นส่วน|ศูนย์|สำนักงาน|Co\.,?\s*Ltd|Inc\.|Corp\.|Ltd\.)/i.test(line)) {
      if (!/ใบกำกับภาษี|ใบเสร็จรับเงิน|Tax Invoice|Receipt/i.test(line)) {
        const cleaned = cleanCompanyName(cleanThaiText(line));
        if (cleaned.length >= 4) return cleaned;
      }
    }
  }

  // 2. Priority 2: Thai & English Retail & Hardware Giants
  for (const line of lines.slice(0, 15)) {
    if (/ไทวัสดุ|ซีอาร์ซี|ซีโอแอล|OfficeMate|B2S|HomePro|DoHome|Global|IT CITY|Advice|MR\.?DIY|Big C|Lotus|7-Eleven|CRC|COL/i.test(line)) {
      if (!/ใบกำกับภาษี|ใบเสร็จ/i.test(line)) {
        const cleaned = cleanCompanyName(cleanThaiText(line));
        if (cleaned.length >= 3) return cleaned;
      }
    }
  }

  // 3. Priority 3: First meaningful line in top header
  for (const line of lines.slice(0, 10)) {
    const cleanLine = cleanCompanyName(cleanThaiText(line));
    if (cleanLine.length >= 4 &&
        !/ใบกำกับภาษี|ใบเสร็จ|หน้าที่|ต้นฉบับ|สำเนา|เลขที่|วันที่|INV|TAX|POS|RECEIPT/i.test(cleanLine) &&
        !/หมู่ที่|ตำบล|อำเภอ|จังหวัด|ถนน|ซอย|แขวง|เขต|เลขที่|โทร|TEL|FAX/i.test(cleanLine) &&
        !isGarbledThaiGibberish(cleanLine) &&
        /[ก-ฮa-zA-Z]{3,}/.test(cleanLine)) {
      return cleanLine;
    }
  }

  return '';
}

export function parseThaiReceiptOcr(text: string, headerText: string = ''): ParsedReceipt {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let vendor_name = '';
  let invoice_number = '';
  let invoice_date = '';
  let total_amount = 0;
  const items: ParsedReceipt['items'] = [];

  const excludeKeywords = [
    'ชำระเงินโดย', 'ชำระเงิน', 'ชำระโดย', 'VISA', 'MASTER', 'CASH', 'เงินสด', 'เงินทอน',
    'CHANGE', 'SUBTOTAL', 'GRAND TOTAL', 'TOTAL', 'ยอดรวม', 'ราคารวม', 'รวมทั้งสิ้น', 'รวมทั้งสิ้นบาท',
    'ภาษีมูลค่าเพิ่ม', 'VAT', 'TAX ID', 'TAX NO', 'THANK YOU', 'ขอบคุณ', 'ยินดีต้อนรับ', 'WELCOME',
    'สาขา', 'POS', 'MEMBER', 'สมาชิก', 'หน้าที่', 'ต้นฉบับ', 'สำเนา', 'เอกสารออกเป็นชุด', 'บาท',
    'สินค้าที่มีภาษี', 'สินค้าที่ยกเว้น', 'สินค้าที่เสีย', 'มูลค่าสินค้า', 'มูลค่าภาษี', 'ภาษี 7%',
    'จำนวนรวม', 'รวมรายการ', 'ราคาสินค้า', 'ส่วนลด'
  ];

  // 1. Extract Vendor Name (First try dedicated headerText scan if available, then full text)
  if (headerText) {
    vendor_name = extractVendorNameFromText(headerText);
  }
  if (!vendor_name) {
    vendor_name = extractVendorNameFromText(text);
  }

  // 2. Extract Invoice Number
  for (const line of lines) {
    const match = line.match(/(?:เลขที่|ใบเสร็จ|ใบกำกับ|INV|TAX|DOC|No\.?)[^\w\d]*([A-Z0-9\/\-]{4,25})/i);
    if (match && match[1] && !/^\d{13}$/.test(match[1])) {
      invoice_number = match[1];
      break;
    }
  }

  // 3. Extract Invoice Date
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  
  for (const line of lines) {
    const dateMatch = line.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (dateMatch) {
      const d = parseInt(dateMatch[1], 10);
      const m = parseInt(dateMatch[2], 10);
      let y = parseInt(dateMatch[3], 10);

      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        if (y < 100) y += 2500;
        if (y < 2500 && y > 2000) y += 543;
        const monthName = thaiMonths[m - 1] || 'พฤศจิกายน';
        invoice_date = `${d} ${monthName} ${y}`;
        break;
      }
    }

    const textDateMatch = line.match(/(\d{1,2})\s*([ก-ฮ\.]{2,10})\s*(\d{2,4})/);
    if (textDateMatch) {
      const d = parseInt(textDateMatch[1], 10);
      const monthStr = textDateMatch[2];
      let y = parseInt(textDateMatch[3], 10);

      if (d >= 1 && d <= 31) {
        if (y < 100) y += 2500;
        if (y < 2500 && y > 2000) y += 543;
        invoice_date = `${d} ${monthStr} ${y}`;
        break;
      }
    }
  }

  // 4. Extract Total Amount
  for (const line of lines.slice().reverse()) {
    if (/(?:ราคารวม|รวมเงิน|สุทธิ|TOTAL|GRAND TOTAL|AMOUNT)[^\d]*([\d,]+\.?\d*)/i.test(line)) {
      const match = line.match(/([\d,]+\.\d{2})/);
      if (match) {
        total_amount = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
  }

  // 5. Extract Item Lines, SKUs, and Trailing Prices
  lines.forEach((line) => {
    if (excludeKeywords.some(kw => line.toUpperCase().includes(kw.toUpperCase()))) {
      return;
    }

    const priceMatches = line.match(/([\d,]+\.\d{2})/g);
    if (priceMatches && priceMatches.length >= 1) {
      const validPrices = priceMatches.map(p => parseFloat(p.replace(/,/g, ''))).filter(p => p > 0);
      
      if (validPrices.length > 0) {
        const itemPrice = validPrices[validPrices.length > 1 ? validPrices.length - 2 : 0] || validPrices[0];

        if (itemPrice > 0 && itemPrice !== total_amount) {
          let cleanDesc = line;

          // Strip all trailing numeric/price columns (e.g., "1 98.00 98.00 0.00" or "1 98.00")
          cleanDesc = cleanDesc.replace(/(\s+\d+)?(\s+[\d,]+\.\d{2})+$/g, '').trim();

          // Extract SKU / Barcode if available
          let item_code = '';
          const skuMatch = cleanDesc.match(/\[([0-9A-Z\-]+)\]|([0-9]{10,13})|([A-Z0-9\-]{5,15}\b)/);
          if (skuMatch) {
            item_code = skuMatch[1] || skuMatch[2] || skuMatch[3] || '';
            cleanDesc = cleanDesc.replace(skuMatch[0], '').replace(/[\[\]]/g, '').trim();
          }

          // Clean item line numbers and leading garbage symbols
          cleanDesc = cleanThaiText(cleanDesc);

          // Detect quantity if present before prices
          let quantity = 1;
          const qtyMatch = line.match(/\s+(\d+)\s+[\d,]+\.\d{2}/);
          if (qtyMatch && qtyMatch[1]) {
            quantity = parseInt(qtyMatch[1], 10) || 1;
          }

          // Unit detection
          let unit = 'ชิ้น';
          if (/กล่อง/i.test(cleanDesc)) unit = 'กล่อง';
          else if (/แพ็ค|แพค/i.test(cleanDesc)) unit = 'แพ็ค';
          else if (/เครื่อง/i.test(cleanDesc)) unit = 'เครื่อง';
          else if (/ม้วน/i.test(cleanDesc)) unit = 'ม้วน';
          else if (/ถัง/i.test(cleanDesc)) unit = 'ถัง';
          else if (/ชุด/i.test(cleanDesc)) unit = 'ชุด';
          else if (/แท่ง/i.test(cleanDesc)) unit = 'แท่ง';
          else if (/เส้น/i.test(cleanDesc)) unit = 'เส้น';
          else if (/อัน/i.test(cleanDesc)) unit = 'อัน';

          // Ensure line is not a summary or tax line
          if (
            cleanDesc.length >= 2 &&
            !/^(?:รวม|สุทธิ|ภาษี|มูลค่า|ยอด|ส่วนลด|ชำระ|เงินสด|บัตร|สมาชิก|สาขา|จำนวน|หน้าที่|เอกสาร)/i.test(cleanDesc) &&
            !/^\d+\s*รายการ/i.test(cleanDesc)
          ) {
            items.push({
              item_code,
              description: cleanDesc,
              quantity,
              unit,
              unit_price: itemPrice,
              total_price: itemPrice * quantity
            });
          }
        }
      }
    }
  });

  return {
    vendor_name: vendor_name || 'ร้านค้า / บริษัทผู้ขาย',
    invoice_number: invoice_number || '',
    invoice_date: invoice_date || '',
    total_amount,
    items
  };
}
