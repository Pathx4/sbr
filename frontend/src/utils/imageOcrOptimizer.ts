// Advanced Utility for Image Preprocessing & Thai OCR Enhancement
// Uses Otsu's Adaptive Thresholding Binarization Algorithm and Thai Fuzzy Spell Correction

/**
 * Otsu's Binarization Algorithm
 * Automatically calculates the optimal threshold to separate text from background shadows.
 */
function otsuThreshold(pixels: Uint8ClampedArray, width: number, height: number): number {
  const histogram = new Array(256).fill(0);
  const totalPixels = width * height;

  // Build histogram from grayscale pixels
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
    pixels[i] = gray; // store gray in R
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

/**
 * Preprocesses receipt image with Canvas, Otsu thresholding, and contrast sharpening.
 */
export function preprocessImageForOcr(file: File): Promise<string> {
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

        // Target optimal width for Tesseract OCR (around 2000px)
        let width = img.width;
        let height = img.height;
        if (width < 1400) {
          const ratio = 1800 / width;
          width = 1800;
          height = Math.round(height * ratio);
        } else if (width > 2800) {
          const ratio = 2400 / width;
          width = 2400;
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        // Draw scaled image
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Apply Otsu Thresholding
        const threshold = otsuThreshold(data, width, height);

        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i]; // Gray stored during otsuThreshold
          // High contrast binarization based on Otsu threshold
          const bin = gray < threshold ? 0 : 255;
          data[i] = bin;     // R
          data[i + 1] = bin; // G
          data[i + 2] = bin; // B
        }

        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
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
 * Thai Fuzzy Spell Correction for OCR typos
 */
const TYPO_MAP: Record<string, string> = {
  'ชิน': 'ชิ้น',
  'กลอง': 'กล่อง',
  'เครอง': 'เครื่อง',
  'อน': 'อัน',
  'แพค': 'แพ็ค',
  'มวน': 'ม้วน',
  'บรษท': 'บริษัท',
  'หจก': 'หจก.',
  'บาn': 'บาท',
  'บาทท': 'บาท'
};

function cleanThaiText(str: string): string {
  let cleaned = str.replace(/[ฒณ|\[\]{}]+/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Replace known typos
  Object.keys(TYPO_MAP).forEach(typo => {
    const re = new RegExp(`\\b${typo}\\b`, 'g');
    cleaned = cleaned.replace(re, TYPO_MAP[typo]);
  });

  return cleaned;
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

export function parseThaiReceiptOcr(text: string): ParsedReceipt {
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
    'ชำระเงิน', 'ชำระโดย', 'VISA', 'MASTER', 'CASH', 'เงินสด', 'เงินทอน',
    'CHANGE', 'SUBTOTAL', 'GRAND TOTAL', 'TOTAL', 'ยอดรวม', 'ราคารวม',
    'ภาษีมูลค่าเพิ่ม', 'VAT', 'TAX ID', 'TAX NO', 'THANK YOU', 'ขอบคุณ',
    'ยินดีต้อนรับ', 'WELCOME', 'สาขา', 'POS', 'MEMBER', 'สมาชิก'
  ];

  // 1. Extract Vendor Name
  for (const line of lines.slice(0, 10)) {
    const cleanLine = cleanThaiText(line.replace(/^[^\wก-ฮ]+/, ''));
    if (cleanLine.length > 3 && !/เลขที่|วันที่|INV|TAX|POS|สาขา|RECEIPT/i.test(cleanLine)) {
      if (/บริษัท|หจก|ร้าน|ห้างหุ้นส่วน|ศูนย์|สำนักงาน|IT CITY|B2S|OfficeMate|Big C|Lotus|7-Eleven|MR\.?DIY/i.test(cleanLine)) {
        vendor_name = cleanLine;
        break;
      }
      if (!vendor_name && cleanLine.length > 4 && !/\d{5,}/.test(cleanLine)) {
        vendor_name = cleanLine;
      }
    }
  }

  // 2. Extract Invoice Number
  for (const line of lines) {
    const match = line.match(/(?:เลขที่|ใบเสร็จ|ใบกำกับ|INV|TAX|DOC|No\.?)[^\w\d]*([A-Z0-9\/\-]{4,20})/i);
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

  // 5. Extract Item Lines & SKUs
  const numberEndRegex = /([\d,]+\.\d{2})\s*$/;

  lines.forEach((line) => {
    if (excludeKeywords.some(kw => line.toUpperCase().includes(kw))) {
      return;
    }

    const priceMatch = line.match(numberEndRegex);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(/,/g, ''));

      if (price > 0 && price !== total_amount) {
        let cleanDesc = line.replace(numberEndRegex, '').trim();

        // Extract SKU / Barcode if available
        let item_code = '';
        const skuMatch = cleanDesc.match(/\[([0-9A-Z\-]+)\]|([0-9]{13})|([A-Z0-9\-]{5,15}\b)/);
        if (skuMatch) {
          item_code = skuMatch[1] || skuMatch[2] || skuMatch[3] || '';
          cleanDesc = cleanDesc.replace(skuMatch[0], '').replace(/[\[\]]/g, '').trim();
        }

        cleanDesc = cleanThaiText(cleanDesc.replace(/^[0-9\.\s\-\|]+/, ''));

        // Unit detection
        let unit = 'ชิ้น';
        if (/กล่อง/i.test(cleanDesc)) unit = 'กล่อง';
        else if (/แพ็ค|แพค/i.test(cleanDesc)) unit = 'แพ็ค';
        else if (/เครื่อง/i.test(cleanDesc)) unit = 'เครื่อง';
        else if (/ม้วน/i.test(cleanDesc)) unit = 'ม้วน';
        else if (/ถัง/i.test(cleanDesc)) unit = 'ถัง';
        else if (/ชุด/i.test(cleanDesc)) unit = 'ชุด';

        if (cleanDesc.length >= 2) {
          items.push({
            item_code,
            description: cleanDesc,
            quantity: 1,
            unit,
            unit_price: price,
            total_price: price
          });
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
