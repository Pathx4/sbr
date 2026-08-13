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

export type PreprocessMode = 'header' | 'binarized' | 'grayscale';

export function preprocessImageForOcr(file: File, mode: PreprocessMode = 'binarized'): Promise<string> {
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
        const sourceHeight = mode === 'header' ? Math.round(img.height * 0.40) : img.height;

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

        if (mode === 'grayscale') {
          // Grayscale Contrast Mode for Numbers & English SKUs
          for (let i = 0; i < data.length; i += 4) {
            let gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            gray = Math.max(0, Math.min(255, ((gray - 128) * 1.35) + 128));
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
          }
        } else {
          // Binarized Otsu Thresholding Mode for Thai Text & Tables
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
  'LEETECIH': 'LEETECH',
  'ค้ำปืน': 'ด้ามปืน',
  '20wr120W': '20W/120W',
  '1แร': '1มม.',
  'ชิน': 'ชิ้น',
  'กลอง': 'กล่อง',
  'เครอง': 'เครื่อง',
  'แพค': 'แพ็ค',
  'มวน': 'ม้วน',
  'แทง': 'แท่ง',
  'บรษท': 'บริษัท',
  'หจก': 'หจก.',
  'บาn': 'บาท',
  'บาทท': 'บาท',
  'ดาม': 'ด้าม',
  'แผน': 'แผ่น',
  'รีม': 'รีม',
  'ซอง': 'ซอง',
  'กอน': 'ก้อน',
  'ขวด': 'ขวด',
  'ถุง': 'ถุง',
  'แกลลอน': 'แกลลอน',
  'เมตร': 'เมตร',
  'มม': 'มม.',
  'ซม': 'ซม.',
  'กิโลกรัม': 'กิโลกรัม',
  'กก': 'กก.',
  // Hardware & Electrical Misread Corrections (SAFE entries only)
  'พเผลปลั๊ก': 'พาวเวอร์ปลั๊ก',
  'พเอ0ปลั๊ก': 'พาวเวอร์ปลั๊ก',
  'หผอปลั๊ก': 'พาวเวอร์ปลั๊ก',
  'พเผล': 'พาวเวอร์',
  'พเอ0': 'พาวเวอร์',
  'หผอ': 'พาวเวอร์',
  'ปลัก': 'ปลั๊ก',
  'สวิทช์': 'สวิตช์',
  'สายไฟออน': 'สายไฟอ่อน',
  'แบตเตอรี': 'แบตเตอรี่',
  'ลิเธย': 'ลิเธียม',
  'โซลาร': 'โซลาร์',
  'เชลล์': 'เซลล์',
  'ชิสเต็ม': 'ซิสเต็ม'
};

/**
 * High-Speed Zero-Dependency Levenshtein Distance Algorithm
 * Calculates character edit distance between OCR output and Master Dictionaries
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

const HARDWARE_MASTER_DICTIONARY = [
  'ป้องกัน', 'ลิเธียม', 'แบตเตอรี่', 'โซลาร์เซลล์', 'พาวเวอร์ปลั๊ก', 'ปลั๊กไฟ', 'สายไฟอ่อน',
  'สวิตช์', 'โมดูล', 'ความร้อน', 'ฉนวน', 'สแตนเลส', 'อะลูมิเนียม', 'พลาสติก', 'น็อต', 'สกรู',
  'คอนเนคเตอร์', 'หม้อแปลง', 'อะแดปเตอร์', 'ตัวต้านทาน', 'ตัวเก็บประจุ', 'ไดโอด', 'รีเลย์',
  'เซนเซอร์', 'เคเบิ้ลไทร์', 'เทปพันสายไฟ', 'ตลับเมตร', 'ด้ามปืน', 'กาวร้อน', 'คัตเตอร์',
  'กระดาษ', 'แฟ้ม', 'ซอง', 'กล่อง', 'เครื่อง', 'พร้อม', 'ใส้เต็ม', 'ไส้เต็ม', 'อิเล็กทรอนิกส์'
];

const MASTER_VENDOR_DICTIONARY = [
  'บริษัท ซีอาร์ซี ไทวัสดุ จำกัด',
  'บริษัท ซีโอแอล จำกัด (มหาชน)',
  'บริษัท ออฟฟิศเมท (ไทย) จำกัด',
  'บริษัท ออฟฟิศเมท จำกัด',
  'บริษัท โฮม โปรดักส์ เซ็นเตอร์ จำกัด (มหาชน)',
  'บริษัท ดูโฮม จำกัด (มหาชน)',
  'บริษัท สยามโกลบอลเฮ้าส์ จำกัด (มหาชน)',
  'บริษัท เจ.ไอ.บี. คอมพิวเตอร์ กรุ๊ป จำกัด',
  'บริษัท ไอที ซิตี้ จำกัด (มหาชน)',
  'บริษัท แอดไวซ์ ไอที อินฟิเนท จำกัด (มหาชน)',
  'บริษัท บีทูเอส จำกัด',
  'บริษัท บิ๊กซี ซูเปอร์เซ็นเตอร์ จำกัด (มหาชน)',
  'บริษัท เอก-ชัย ดีสทริบิวชั่น ซิสเทม จำกัด',
  'บริษัท ซีพี แอ็กซ์ตร้า จำกัด (มหาชน)',
  'บริษัท สยามแม็คโคร จำกัด (มหาชน)',
  'บริษัท บุญถาวร เซรามิค จำกัด',
  'บริษัท มิสเตอร์. ดี.ไอ.วาย. (กรุงเทพ) จำกัด',
  'บริษัท เมกา โฮม เซ็นเตอร์ จำกัด',
  'บริษัท เอส. สมาร์ทเทค ซิสเต็ม จำกัด',
  'บริษัท อมร อีเล็คโทรนิคส์ จำกัด',
  'บริษัท อมร ศูนย์รวมอะไหล่อิเล็กทรอนิกส์ จำกัด',
  'บริษัท นัฐพงษ์ เซลส์แอนด์เซอร์วิส จำกัด',
  'บริษัท ศุภการ เอ็นจิเนียริ่ง จำกัด',
  'บริษัท ไทยพิพัฒน์ ฮาร์ดแวร์ จำกัด',
  'Shopee Official Store',
  'Lazada Official Store',
  'TikTok Shop'
];

export function fuzzyCorrectWord(word: string): string {
  if (word.length < 3) return word;

  let bestMatch = word;
  let minDistance = 999;

  for (const target of HARDWARE_MASTER_DICTIONARY) {
    const dist = levenshteinDistance(word, target);
    if (dist <= 2 && dist < minDistance && Math.abs(word.length - target.length) <= 2) {
      minDistance = dist;
      bestMatch = target;
    }
  }

  return minDistance <= 2 ? bestMatch : word;
}

export function fuzzyCorrectVendorName(rawVendor: string): string {
  if (!rawVendor || rawVendor.length < 4) return rawVendor;

  let bestVendor = rawVendor;
  let minDistance = 999;

  for (const masterVendor of MASTER_VENDOR_DICTIONARY) {
    const dist = levenshteinDistance(rawVendor.toLowerCase(), masterVendor.toLowerCase());
    const threshold = Math.max(3, Math.round(masterVendor.length * 0.35));
    if (dist < minDistance && dist <= threshold) {
      minDistance = dist;
      bestVendor = masterVendor;
    }
  }

  return minDistance <= Math.round(bestVendor.length * 0.35) ? bestVendor : rawVendor;
}

function cleanThaiText(str: string): string {
  let cleaned = str
    .replace(/^([!\?\.\-\|\+:งv\s\d]*\d{1,2}\s*[v\|\.\-\:\)\s]+)/gi, '')
    .replace(/^[!\?\.\-\|\+:งv\s\d]+/gi, '')
    .replace(/[ฒณ|\[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return correctTechnicalThaiAndEnglishText(cleaned);
}

export function correctTechnicalThaiAndEnglishText(str: string): string {
  let text = str;

  // 1. Clean leading junk characters on item description (#, /, -, ((, etc.)
  text = text
    .replace(/^[#\/\-\*\+\:\.\s]+/g, '')
    .replace(/^\(\s*\(/g, '(')
    .replace(/\)\s*\)/g, ')');

  // 2. Protect AWG Specs & Wire SKUs (e.g. A0325, 22AWG)
  text = text
    .replace(/(\d{1,2})\s*A[W\s]*G/gi, '$1AWG')
    .replace(/\bA0(\d{3})\b/gi, 'A0$1')
    .replace(/\bA(\d{4})\b/gi, 'A$1');

  // 3. Strip garbled OCR prefix noise BEFORE known Thai words
  //    e.g. "ฟฟแผ0ปลั๊ก" → "ปลั๊ก", "ผมพ0ปลั๊ก" → "ปลั๊ก", "หมเ0สาย" → "สาย"
  //    Pattern: 2-6 Thai consonants/digits that don't form a real word, followed by a recognizable word
  const knownWordStarts = [
    'ปลั๊ก', 'สาย', 'แผ่น', 'สวิตช์', 'โมดูล', 'เซนเซอร์', 'รีเลย์', 'อะแดปเตอร์',
    'หม้อแปลง', 'ตัวต้านทาน', 'ตัวเก็บประจุ', 'ไดโอด', 'คอนเนคเตอร์', 'เคเบิ้ล',
    'กาว', 'คัตเตอร์', 'น็อต', 'สกรู', 'พาวเวอร์', 'แบตเตอรี่', 'ชุดอุปกรณ์',
    'บอร์ด', 'Board', 'Module', 'Sensor', 'Relay', 'LED', 'LCD', 'USB', 'Arduino',
    'ESP', 'Raspberry', 'Converter', 'Adapter', 'Cable', 'Wire', 'Ultrasonic',
    'Development', 'Waterproof', 'Solar', 'Battery', 'Power', 'Step',
    'DIY', 'อิเล็กทรอนิกส์', 'ฉนวน', 'ท่อ', 'ลวด', 'เทป', 'กระดาษ'
  ];
  for (const word of knownWordStarts) {
    const idx = text.indexOf(word);
    if (idx > 0 && idx <= 8) {
      const prefix = text.substring(0, idx);
      // If the prefix is mostly garbled (consonants+digits without proper vowels), strip it
      const thaiVowelCount = (prefix.match(/[ะาิีึืุูเแโใไำ]/g) || []).length;
      const prefixLen = prefix.replace(/\s/g, '').length;
      if (prefixLen > 0 && thaiVowelCount <= 1 && prefixLen <= 6) {
        text = text.substring(idx);
        break;
      }
    }
  }

  // 4. Hardware / Electronics Model Numbers & Technical Typos
  text = text
    .replace(/\b0ง7670\b/gi, 'OV7670')
    .replace(/\b0v7670\b/gi, 'OV7670')
    .replace(/\bov7670\b/gi, 'OV7670')
    .replace(/\(0ง7670\)/gi, '(OV7670)')
    .replace(/[\(งoO]+7670\)?/gi, '(OV7670)')
    .replace(/\bStep\s*up\s*Conver\b/gi, 'Step up Converter')
    .replace(/\bUltrasonic\s+M\b/gi, 'Ultrasonic Module')
    .replace(/\bDevelopment\s+Bo\b/gi, 'Development Board')
    .replace(/\bDevelopn\b/gi, 'Development Board')
    .replace(/\bESP-WROOM-32\b/gi, 'ESP-WROOM-32')
    .replace(/\bSIM7600A-H\b/gi, 'SIM7600A-H');

  // 5. Thai Technical & Hardware Word Corrections (SAFE only — no destructive blanket replacements)
  text = text
    .replace(/ปลิ๊ก|ปลื๊ก|ปลัก(?!ๆ)/g, 'ปลั๊ก')
    .replace(/ใส้เต็ม/g, 'ไส้เต็ม')
    .replace(/สสีดํา|สสีดำ/g, 'สีดำ')
    .replace(/กันนํา|กันนำ/g, 'กันน้ำ')
    .replace(/ป้องดัน/g, 'ป้องกัน')
    .replace(/ลิเรียม/g, 'ลิเธียม')
    .replace(/ลิเธย(?!ม)/g, 'ลิเธียม')
    .replace(/ลิเธยม/g, 'ลิเธียม')
    .replace(/แบตเตอรี(?!่)/g, 'แบตเตอรี่')
    .replace(/โซลาร(?!์)/g, 'โซลาร์')
    .replace(/เชลล์/g, 'เซลล์')
    .replace(/ชิสเต็ม/g, 'ซิสเต็ม')
    .replace(/สวิทช์/g, 'สวิตช์')
    .replace(/บหาชน/g, 'มหาชน')
    .replace(/จำกัค|จำกัต/g, 'จำกัด')
    .replace(/1\s*fou/gi, '1 ก้อน')
    .replace(/22\s*aWG|22\/เพด/gi, '22AWG')
    .replace(/18\s*เผด|18ลเพ/gi, '18AWG')
    .replace(/ใหม่\s*พร้/g, 'พร้อม')
    .replace(/พร้อมอ:/g, 'พร้อม');

  // 6. Run TYPO_MAP dictionary
  Object.keys(TYPO_MAP).forEach(typo => {
    if (typo) {
      const re = new RegExp(typo.replace(/%/g, '\\%'), 'g');
      text = text.replace(re, TYPO_MAP[typo]);
    }
  });

  // 7. Run Levenshtein Fuzzy Correction on individual word tokens
  const words = text.split(' ');
  const correctedWords = words.map(w => fuzzyCorrectWord(w));
  text = correctedWords.join(' ');

  // 8. Strip trailing numeric junk that looks like leaked price data & VAT codes
  //    e.g. "สีขาว 3ม. 1.000 559.000 559.00 V" → "สีขาว 3ม."
  text = text
    .replace(/[\s|]+[VvNtX]\s*$/g, '')
    .replace(/(\s+[\d,]+(\.\d{1,3})?)+[\s|]*[VvNtX]?\s*$/g, '')
    .replace(/\s+\d+\.\d{1,3}\s*\d*[\s|]*[VvNtX]?\s*$/g, '')
    .replace(/\s+\d{1,6}\s*[!|]*\s*$/g, '');

  return text.replace(/\s+/g, ' ').trim();
}

const THAI_MONTH_PATTERNS = /(?:มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)/i;

function isGarbledThaiGibberish(text: string): boolean {
  if (!text || text.trim().length < 2) return true;
  const trimmed = text.trim();

  // 1. If line contains no Thai or English letters at all (pure numbers/symbols) -> garbage item!
  if (!/[ก-ฮa-zA-Z]/.test(trimmed)) return true;

  // 2. Reject lines that consist solely of symbols / dashes / dots / Thai digits e.g. "---", "***", "===", "..."
  if (/^[─\-\*\=\_\.\/\|\:\+\#\$\%\^\&\(\)\s\d๑-๙°'ฯ]+$/.test(trimmed)) return true;

  // 3. Reject date metadata lines (contains Thai month names or Date prefixes like "วันที่", "นที", "ลงวันที่")
  if (THAI_MONTH_PATTERNS.test(trimmed)) return true;

  // 4. Reject signature / recipient / transport / delivery lines
  if (/ผู้รับเงิน|ผู้ส่งของ|ผู้รับของ|ผู้จ่ายเงิน|ผู้รับสินค้า|ลงชื่อ|ผู้รับพัสดุ|อนุมัติ|ส่งสินค้า|ค่าขนส่ง|ผู้รับ/i.test(trimmed)) {
    return true;
  }

  // 5. Reject non-product header & receipt metadata prefixes
  if (/^(?:รวม|สุทธิ|ภาษี|มูลค่า|ยอด|ส่วนลด|ชำระ|เงินสด|เงินทอน|บัตร|สมาชิก|สาขา|จำนวน|หน้าที่|เอกสาร|บริษัท|หจก|เลขที่|วันที่|นที|โทร|พนักงาน|เวลา|ประจำตัว|ใบเสร็จ|ใบกำกับ)/i.test(trimmed)) {
    return true;
  }

  // 6. Reject garbled symbol noise (e.g., "od ° ' o - ม ๓ ฯ ๕ a a o ww")
  const symbolNoiseCount = (trimmed.match(/[°'ฯ๑๒๓๔๕๖๗๘๙]/g) || []).length;
  if (symbolNoiseCount >= 2) return true;

  // 7. Count single-letter tokens e.g. "o", "a", "w", "ม" separated by spaces
  const tokens = trimmed.split(/\s+/);
  const singleCharTokens = tokens.filter(t => t.length === 1 && !/\d/.test(t));
  if (singleCharTokens.length >= 3 || (tokens.length >= 4 && singleCharTokens.length / tokens.length > 0.35)) {
    return true;
  }

  const thaiConsonantCount = (trimmed.match(/[ก-ฮ]/g) || []).length;
  const hasVowels = /[ะาิีึืุูเแโใไำ็์]/.test(trimmed);

  // If 5+ consonants without vowels and no 3+ letter English word -> garbled noise
  if (thaiConsonantCount >= 5 && !hasVowels && !/[a-zA-Z]{3,}/.test(trimmed)) {
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
export function cleanCompanyName(name: string): string {
  // Pre-fix common OCR misreads in vendor names
  let cleaned = name
    .replace(/บหาชน/g, 'มหาชน')
    .replace(/จำกัค/g, 'จำกัด')
    .replace(/จำกัต/g, 'จำกัด');

  // If line contains company prefix (บริษัท, หจก, ร้าน, ห้าง), strip any leading OCR noise before it
  if (/(?:บริษัท|หจก\.|หจก|ร้าน|ห้างหุ้นส่วน|ศูนย์|สำนักงาน|Co\.,?\s*Ltd|Inc\.|Corp\.|Ltd\.)/i.test(cleaned)) {
    cleaned = cleaned.replace(/^.*?(?=(?:บริษัท|หจก|ร้าน|ห้าง|ศูนย์|สำนักงาน|Co\.,?\s*Ltd|Inc\.|Corp\.|Ltd\.))/i, '');
  }

  // Fuzzy match for "จำกัด" variants — hard truncate after it
  const jamkatMatch = cleaned.match(/(จำกั[ดคตกัดุ])/i);
  if (jamkatMatch) {
    const idx = cleaned.indexOf(jamkatMatch[1]);
    if (idx >= 0) {
      const afterJamkat = cleaned.substring(idx + jamkatMatch[1].length).trim();
      const beforeJamkat = cleaned.substring(0, idx);
      // Check if มหาชน appears before or after จำกัด
      if (beforeJamkat.includes('มหาชน')) {
        cleaned = beforeJamkat.split('มหาชน')[0] + 'มหาชน (จำกัด)';
      } else if (/^[(\s]*มหาชน/i.test(afterJamkat)) {
        cleaned = beforeJamkat + 'จำกัด (มหาชน)';
      } else {
        cleaned = cleaned.substring(0, idx) + 'จำกัด';
      }
    }
  } else if (cleaned.includes('มหาชน')) {
    cleaned = cleaned.split('มหาชน')[0] + 'มหาชน';
  } else {
    cleaned = cleaned
      .replace(/\s*\(?(?:สาขา|สาขาที่|Branch|Tax ID|TAX|เลขประจำตัว|โทร|TEL|FAX).*/i, '')
      .replace(/[\(\)\{\}\[\]<>]+/g, ' ')
      .trim();
  }

  // Strip any remaining non-Thai/non-English garbage after the company name
  cleaned = cleaned.replace(/[ใไเแโใไ]*[<>]+.*/g, '').replace(/\s+/g, ' ').trim();
  // Remove trailing single junk characters (OCR noise like ใเแoaa etc)
  cleaned = cleaned.replace(/[\s]*[a-zใไเแโๆํัิีึืุู็่้๊๋์ํ๎]{1,2}[\s]*$/gi, '').trim();

  // Run Levenshtein Fuzzy Vendor Correction against Master Vendor Database
  return fuzzyCorrectVendorName(cleaned);
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

export interface TesseractBbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface TesseractWord {
  text: string;
  bbox: TesseractBbox;
  confidence: number;
}

/**
 * 2D Spatial Clustering: Rebuilds text perfectly by grouping words into physical rows (Y-axis)
 * and sorting them into columns (X-axis) with proper spacing.
 */
export function reconstructTextFromBboxes(words: TesseractWord[]): string {
  if (!words || words.length === 0) return '';

  // 1. Sort all words vertically by Y-coordinate
  const sortedWords = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0);

  const rows: TesseractWord[][] = [];
  let currentRow: TesseractWord[] = [sortedWords[0]];
  const Y_TOLERANCE = 15; // Max vertical pixel difference to be considered same row

  // 2. Cluster into rows based on Y-tolerance
  for (let i = 1; i < sortedWords.length; i++) {
    const word = sortedWords[i];
    
    // If the word's Y-start is close to the current row's average Y, add it
    const avgY = currentRow.reduce((sum, w) => sum + w.bbox.y0, 0) / currentRow.length;
    
    if (Math.abs(word.bbox.y0 - avgY) <= Y_TOLERANCE) {
      currentRow.push(word);
    } else {
      rows.push(currentRow);
      currentRow = [word];
    }
  }
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  // 3. Rebuild text with simulated column spacing
  const rebuiltLines: string[] = [];
  for (const row of rows) {
    // Sort words in this row horizontally (left to right)
    row.sort((a, b) => a.bbox.x0 - b.bbox.x0);

    let lineText = '';
    let lastX = row[0].bbox.x0;

    for (let i = 0; i < row.length; i++) {
      const word = row[i];
      const gap = word.bbox.x0 - lastX;
      
      // If gap is significant, add extra spaces to simulate columns
      if (i > 0 && gap > 40) {
        lineText += '    '; // Column separator
      } else if (i > 0) {
        lineText += ' ';
      }
      
      lineText += word.text;
      lastX = word.bbox.x1;
    }
    rebuiltLines.push(lineText.trim());
  }

  return rebuiltLines.join('\n');
}

export function parseThaiReceiptOcr(ocrData: any, headerData: any = ''): ParsedReceipt {
  // Check if ocrData contains Tesseract Bounding Boxes (words array)
  let text = '';
  if (typeof ocrData === 'object' && ocrData.words && Array.isArray(ocrData.words)) {
    console.log("Running 2D Spatial Table Reconstruction...");
    text = reconstructTextFromBboxes(ocrData.words);
    console.log("Reconstructed Text:", text);
  } else {
    text = typeof ocrData === 'string' ? ocrData : (ocrData?.text || '');
  }

  const headerText = typeof headerData === 'string' ? headerData : (headerData?.text || '');

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
    'ชำระเงินโดย', 'ชำระเงิน', 'ชำระโดย', 'VISA', 'MASTER', 'CASH', 'เงินสด', 'เงินทอน', 'PAYMENT', 'CREDIT',
    'CHANGE', 'SUBTOTAL', 'GRAND TOTAL', 'TOTAL', 'ยอดรวม', 'ราคารวม', 'รวมทั้งสิ้น', 'รวมทั้งสิ้นบาท', 'รวมเงิน',
    'ภาษีมูลค่าเพิ่ม', 'VAT', 'TAX ID', 'TAX NO', 'THANK YOU', 'ขอบคุณ', 'ยินดีต้อนรับ', 'WELCOME',
    'สาขา', 'POS', 'MEMBER', 'สมาชิก', 'หน้าที่', 'ต้นฉบับ', 'สำเนา', 'เอกสารออกเป็นชุด', 'บาท', 'BAHT',
    'สินค้าที่มีภาษี', 'สินค้าที่ยกเว้น', 'สินค้าที่เสีย', 'มูลค่าสินค้า', 'มูลค่าภาษี', 'ภาษี 7%', 'ภาษี7%',
    'จำนวนรวม', 'รวมรายการ', 'ราคาสินค้า', 'ส่วนลด', 'DISCOUNT', 'พนักงานขาย', 'CASHIER', 'เวลา', 'TIME',
    'โทร', 'TEL', 'FAX', 'EMAIL', 'อีเมล', 'เว็บไซต์', 'WWW', 'HTTP', 'NET TOTAL', 'NET AMOUNT',
    // Address & Company Info keywords — these are NEVER product items
    'ที่อยู่', 'ผู้ซื้อ', 'ผู้ขาย', 'หมู่ที่', 'ตำบล', 'อำเภอ', 'จังหวัด', 'ถนน', 'ซอย', 'แขวง', 'เขต', 'รหัสไปรษณีย์',
    'เลขประจำตัวผู้เสียภาษี', 'สำนักงานใหญ่', 'เลขที่ใบเสร็จ', 'เลขที่ใบกำกับ', 'วันที่', 'DATE',
    // Table header keywords — column labels, not product items
    'รายละเอียด', 'ราคา/หน่วย', 'รวม (บาท)', 'รหัสสินค้า', 'จำนวน', 'หน่วยละ', 'จำนวนเงิน', 'DESCRIPTION', 'QTY', 'PRICE', 'AMOUNT', 'ITEM',
    'ORDER NO', 'ORDER', 'ลำดับ', 'รายการ', 'ชื่อสินค้า', 'รายละเอียดสินค้า', 'NO.', 'รหัส', 'หน่วย', 'มูลค่า', 'ส่วนลด',
    // Invoice/receipt keywords
    'ใบกำกับภาษี', 'ใบเสร็จรับเงิน', 'Tax Invoice', 'Receipt', 'INVOICE', 'DOCUMENT'
  ];

  // 1. Extract Vendor Name (First try dedicated headerText scan if available, then full text)
  if (headerText) {
    vendor_name = extractVendorNameFromText(headerText);
  }
  if (!vendor_name) {
    vendor_name = extractVendorNameFromText(text);
  }

  // 2. Extract Invoice Number (Optimized for Thai Tax Invoices / ใบกำกับภาษี)
  for (const line of lines) {
    const match = line.match(/(?:เลขที่ใบกำกับภาษี|เลขที่ใบกำกับ|เลขที่ใบเสร็จ|เลขที่|Tax\s*Invoice\s*No\.?|TAX\s*INV\.?|TAX\s*NO\.?|INV\s*NO\.?|DOC\s*NO\.?|TIV|No\.?)[^\w\d]*([A-Z0-9\/\-]{4,25})/i);
    if (match && match[1] && !/^\d{13}$/.test(match[1]) && !/^(?:COMPANY|LIMITED|TAX|BRANCH|PAGE|ORIGINAL|COPY)$/i.test(match[1])) {
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
        if (y < 100) {
          if (y >= 60 && y <= 99) y += 2500;
          else if (y >= 20 && y <= 50) y += 2500;
          else y += 2000 + 543;
        }
        if (y > 2000 && y < 2500) y += 543;
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
        if (y < 100) {
          if (y >= 60 && y <= 99) y += 2500;
          else if (y >= 20 && y <= 50) y += 2500;
          else y += 2000 + 543;
        }
        if (y > 2000 && y < 2500) y += 543;
        invoice_date = `${d} ${monthStr} ${y}`;
        break;
      }
    }
  }

  // 4. Extract Total Amount (Priority scanner for Tax Invoice Net Grand Total vs Subtotal & VAT 7%)
  // Priority 1: High-precision Net Grand Total keywords in Thai Tax Invoices
  for (const line of lines.slice().reverse()) {
    if (/(?:จำนวนเงินรวมทั้งสิ้น|รวมเงินทั้งสิ้น|ยอดชำระสุทธิ|จำนวนเงินสุทธิ|ยอดรวมสุทธิ|GRAND TOTAL|NET AMOUNT|NET TOTAL|TOTAL AMOUNT)[^\d]*([\d,]+(?:\.\d{2}|\.\-|\b))/i.test(line)) {
      const match = line.match(/([\d,]+(?:\.\d{2}|\.-))/);
      if (match) {
        const cleanedVal = match[1].replace(/\.-/, '.00').replace(/,/g, '');
        const parsed = parseFloat(cleanedVal);
        if (!isNaN(parsed) && parsed > 0) {
          total_amount = parsed;
          break;
        }
      }
    }
  }

  // Priority 2: Fallback general total keywords if Net Grand Total keyword not found
  if (total_amount === 0) {
    for (const line of lines.slice().reverse()) {
      if (/(?:ราคารวม|รวมเงิน|สุทธิ|ยอดชำระ|ชำระทั้งสิ้น|รวมทั้งสิ้น|TOTAL|AMOUNT)[^\d]*([\d,]+(?:\.\d{2}|\.\-|\b))/i.test(line)) {
        const match = line.match(/([\d,]+(?:\.\d{2}|\.-))/);
        if (match) {
          const cleanedVal = match[1].replace(/\.-/, '.00').replace(/,/g, '');
          const parsed = parseFloat(cleanedVal);
          if (!isNaN(parsed) && parsed > 0) {
            total_amount = parsed;
            break;
          }
        }
      }
    }
  }

  // 5. Extract Item Lines, SKUs, and Multi-Line Continuation Descriptions
  lines.forEach((line) => {
    if (excludeKeywords.some(kw => line.toUpperCase().includes(kw.toUpperCase()))) {
      return;
    }

    // 1. Check if line starts with row index e.g. "1.", "2.", "15." or "1)", "2)"
    const hasRowIndex = /^\s*\d{1,2}[\.\)\s]+/.test(line);

    // 2. Check if line starts with SKU / Barcode bracket code e.g. "[P0002]", "[M0103]"
    // BUT reject literal 'SKU' text (that's a table header, not a product code)
    const skuTest = /^\s*\[?([A-Z0-9\-]{3,13})\]?/i.exec(line);
    const hasSkuPrefix = skuTest && /P\d|M\d|A\d|PJ\d|SIM\d|INV|DOC|\d{8,13}/i.test(line)
      && !/^\s*SKU\b/i.test(line);

    // 3. Check if line has price numbers at the end (e.g. "285.00" or "285.-" or "285")
    const priceMatches = line.match(/([\d,]+(?:\.\d{2}|\.-))/g) || line.match(/\s+(\d{1,6})\s*$/);
    const hasPriceAtEnd = priceMatches && priceMatches.length >= 1;
    const validPrices = hasPriceAtEnd ? priceMatches.map(p => parseFloat(p.replace(/\.-/, '.00').replace(/,/g, ''))).filter(p => p > 0) : [];
    const itemPrice = validPrices.length > 0 ? (validPrices[validPrices.length > 1 ? validPrices.length - 2 : 0] || validPrices[0]) : 0;

    // 4. Address line detection — lines with address keywords are NEVER product items
    const isAddressLine = /ที่อยู่|ผู้ซื้อ|ผู้ขาย|หมู่ที่|ตำบล|อำเภอ|จังหวัด|ถนน|ซอย|แขวง|เขต|รหัสไปรษณีย์/i.test(line);

    // 5. Table header detection — lines with column labels
    const isTableHeader = /^\s*SKU\b/i.test(line) || /รายละเอียด.*จำนวน|รหัสสินค้า.*ราคา/i.test(line) || /^(?:ลำดับ|ORDER|NO\.|ITEM|รหัส|ชื่อสินค้า|รายการ)/i.test(line);

    // A line is a NEW ITEM ROW if it has a row index, SKU prefix, or valid price
    // BUT NOT if it's an address line or table header
    const isNewItemRow = !isAddressLine && !isTableHeader && (hasRowIndex || hasSkuPrefix || (itemPrice > 0 && itemPrice !== total_amount));

    if (isNewItemRow) {
      let cleanDesc = line;

      // If line is reconstructed with 2D column gap spacing (3+ spaces), isolate leftmost column for description
      const colSegments = line.split(/\s{3,}/);
      if (colSegments.length >= 2) {
        cleanDesc = colSegments[0];
      }

      // Strip trailing numeric/price columns & VAT code indicators (e.g., "1.000 559.000 559.00 V" -> "")
      cleanDesc = cleanDesc
        .replace(/[\s|]+[VvNtX]\s*$/g, '')
        .replace(/(\s+[\d,]+(\.\d{1,3}|\.-)?)+[\s|]*[VvNtX]?\s*$/g, '')
        .replace(/\s+\d+\.\d{1,3}\s*\d*[\s|]*[VvNtX]?\s*$/g, '')
        .replace(/\s+\d{1,6}\s*[!|]*\s*$/g, '')
        .trim();

      // Extract SKU / Barcode / Item Code if available (EAN-13, ART., ITEM:, CODE:, bracket codes)
      let item_code = '';
      const skuMatch = cleanDesc.match(/(?:ART\.?|ITEM:?|CODE:?|SKU:?|รหัส:?)?\s*[\(\[\{]?([0-9A-Z\-ก-ฮ]{3,15})[\)\]\}]?/i);
      if (skuMatch) {
        let rawCode = skuMatch[1] || '';
        // Fix Thai OCR misreads in bracket codes (e.g. ม0204 -> M0204, 50164 -> S0164, pJ033 -> P0033)
        rawCode = rawCode
          .replace(/^ม/gi, 'M')
          .replace(/^พ/gi, 'P')
          .replace(/^แห/gi, 'H')
          .replace(/^pJ/i, 'P0')
          .replace(/^501/i, 'S01')
          .replace(/^603/i, 'G03')
          .replace(/^604/i, 'G04');

        if (/^[A-Z0-9\-]{3,15}$/i.test(rawCode) && !/^(?:TOTAL|VAT|PRICE|QTY|ITEM|SKU|DOC|INV)$/i.test(rawCode)) {
          item_code = rawCode;
          cleanDesc = cleanDesc.replace(skuMatch[0], '').replace(/[\(\[\{\)\]\}]/g, '').trim();
        }
      }

      // Clean leading row numbers e.g. "1.", "2.", "15."
      cleanDesc = cleanThaiText(cleanDesc.replace(/^\d{1,3}[\.\)\s]+/, ''));

      // Detect quantity if present before prices
      let quantity = 1;
      const qtyMatch = line.match(/\s+(\d+)\s+[\d,]+(?:\.\d{2}|\.-)/);
      if (qtyMatch && qtyMatch[1]) {
        quantity = parseInt(qtyMatch[1], 10) || 1;
      }

      // High-precision Thai unit detection
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
      else if (/แผ่น/i.test(cleanDesc)) unit = 'แผ่น';
      else if (/ด้าม/i.test(cleanDesc)) unit = 'ด้าม';
      else if (/ตัว/i.test(cleanDesc)) unit = 'ตัว';
      else if (/เล่ม/i.test(cleanDesc)) unit = 'เล่ม';
      else if (/รีม/i.test(cleanDesc)) unit = 'รีม';
      else if (/ซอง/i.test(cleanDesc)) unit = 'ซอง';
      else if (/ก้อน/i.test(cleanDesc)) unit = 'ก้อน';
      else if (/ขวด/i.test(cleanDesc)) unit = 'ขวด';
      else if (/หลอด/i.test(cleanDesc)) unit = 'หลอด';
      else if (/ถุง/i.test(cleanDesc)) unit = 'ถุง';
      else if (/คู่/i.test(cleanDesc)) unit = 'คู่';
      else if (/แกลลอน/i.test(cleanDesc)) unit = 'แกลลอน';
      else if (/กิโลกรัม|กก\./i.test(cleanDesc)) unit = 'กิโลกรัม';
      else if (/เมตร|ม\./i.test(cleanDesc)) unit = 'เมตร';

      const isZeroPriceJunk = itemPrice === 0 && !item_code && cleanDesc.length < 5;

      if (
        cleanDesc.length >= 3 &&
        !isZeroPriceJunk &&
        !THAI_MONTH_PATTERNS.test(cleanDesc) &&
        !/^(?:รวม|สุทธิ|ภาษี|มูลค่า|ยอด|ส่วนลด|ชำระ|เงินสด|บัตร|สมาชิก|สาขา|จำนวน|หน้าที่|เอกสาร|ผู้รับ|ลงชื่อ|ค่าขนส่ง|นที|วันที่|หมายเหตุ)/i.test(cleanDesc) &&
        !/^\d+\s*รายการ/i.test(cleanDesc) &&
        // Reject garbled OCR noise — descriptions that are mostly symbols/punctuation
        /[ก-ฮa-zA-Z]{2,}/i.test(cleanDesc) &&
        // Reject lines that are clearly address lines or date/signature lines
        !/ที่อยู่|ผู้ซื้อ|หมู่ที่|ตำบล|อำเภอ|จังหวัด|ผู้รับเงิน|ผู้ส่งของ|ลงชื่อ|อนุมัติ|หมายเหตุ/i.test(cleanDesc) &&
        !isGarbledThaiGibberish(cleanDesc)
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
    } else {
      // Continuation Line: Line does NOT have index/SKU/price!
      // Append ONLY if we have a previous item AND it's not a header/footer
      if (items.length > 0) {
        const lastItem = items[items.length - 1];
        const cleanContinuation = cleanThaiText(line);

        if (
          cleanContinuation.length >= 2 &&
          !/^(?:รวม|สุทธิ|ภาษี|มูลค่า|ยอด|ส่วนลด|ชำระ|เงินสด|บัตร|สมาชิก|สาขา|จำนวน|หน้าที่|เอกสาร|บริษัท|หจก|เลขที่|วันที่|ข้อมูล|หมายเหตุ|ผู้รับ|โปรด|เงื่อนไข)/i.test(cleanContinuation) &&
          !/^\d+\s*รายการ/i.test(cleanContinuation) &&
          !isGarbledThaiGibberish(cleanContinuation)
        ) {
          lastItem.description = (lastItem.description + ' ' + cleanContinuation).replace(/\s+/g, ' ').trim();
        }
      }
    }
  });

  // 6. Deduplicate items ONLY if item_code, description, and price are 100% identical
  const dedupedItems: ParsedReceipt['items'] = [];
  for (const item of items) {
    const isDuplicate = dedupedItems.some(existing => {
      if (existing.item_code && item.item_code && existing.item_code === item.item_code && existing.description === item.description && existing.unit_price === item.unit_price) {
        return true;
      }
      return false;
    });
    if (!isDuplicate) {
      dedupedItems.push(item);
    }
  }

  return {
    vendor_name: vendor_name || 'ร้านค้า / บริษัทผู้ขาย',
    invoice_number: invoice_number || '',
    invoice_date: invoice_date || '',
    total_amount,
    items: dedupedItems
  };
}
