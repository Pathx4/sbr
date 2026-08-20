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
        
        // High-DPI Upscaling to 2400px (Optimal golden resolution for Tesseract OCR)
        if (width < 2400) {
          const ratio = 2400 / width;
          width = 2400;
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
          // =============== ADVANCED MULTI-STAGE IMAGE PREPROCESSING ===============
          // Pipeline: Grayscale → Noise Reduction → Adaptive Contrast → Sharpen → Clean
          
          const w = width;
          const h = height;
          
          // Stage 1: Convert to Grayscale
          for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
          }
          
          // Stage 2: Noise Reduction (3x3 Median Filter)
          // Critical for receipt photos taken with phone cameras (removes salt-and-pepper noise)
          const noiseBuffer = new Uint8ClampedArray(data);
          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const idx = (y * w + x) * 4;
              // Collect 3x3 neighborhood
              const neighbors: number[] = [];
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  neighbors.push(noiseBuffer[((y + dy) * w + (x + dx)) * 4]);
                }
              }
              // Sort to find median
              neighbors.sort((a, b) => a - b);
              const median = neighbors[4]; // middle of 9 values
              data[idx] = median;
              data[idx + 1] = median;
              data[idx + 2] = median;
            }
          }
          
          // Stage 3: Adaptive Local Contrast Enhancement (CLAHE-inspired)
          // Divides image into tiles and equalizes contrast locally — 
          // much better than global contrast for receipts with uneven lighting
          const tileSize = 64; // Tile size in pixels
          const tilesX = Math.ceil(w / tileSize);
          const tilesY = Math.ceil(h / tileSize);
          
          // Calculate local min/max for each tile
          const tileStats: { min: number; max: number }[] = new Array(tilesX * tilesY);
          for (let ty = 0; ty < tilesY; ty++) {
            for (let tx = 0; tx < tilesX; tx++) {
              let localMin = 255, localMax = 0;
              const startY = ty * tileSize;
              const startX = tx * tileSize;
              const endY = Math.min(startY + tileSize, h);
              const endX = Math.min(startX + tileSize, w);
              for (let py = startY; py < endY; py++) {
                for (let px = startX; px < endX; px++) {
                  const val = data[(py * w + px) * 4];
                  if (val < localMin) localMin = val;
                  if (val > localMax) localMax = val;
                }
              }
              tileStats[ty * tilesX + tx] = { min: localMin, max: localMax };
            }
          }
          
          // Apply adaptive contrast using interpolated tile statistics
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = (y * w + x) * 4;
              const tx = Math.min(Math.floor(x / tileSize), tilesX - 1);
              const ty = Math.min(Math.floor(y / tileSize), tilesY - 1);
              const stat = tileStats[ty * tilesX + tx];
              const range = stat.max - stat.min;
              
              let val = data[idx];
              if (range > 20) {
                // Normalize to 0-255 within local tile range, then boost contrast
                val = Math.round(((val - stat.min) / range) * 255);
                // Additional contrast boost
                val = Math.max(0, Math.min(255, ((val - 128) * 1.4) + 128));
              } else {
                // Very low contrast tile — likely background, push to white
                val = val > 128 ? 255 : 0;
              }
              data[idx] = val;
              data[idx + 1] = val;
              data[idx + 2] = val;
            }
          }
          
          // Stage 4: Unsharp Masking (Sharpen edges while preserving smooth areas)
          const sharpBuffer = new Uint8ClampedArray(data);
          const sharpAmount = 1.2; // Sharpening strength
          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const idx = (y * w + x) * 4;
              // 3x3 Gaussian blur approximation for the "unsharp" mask
              const blurred = (
                sharpBuffer[((y-1)*w+(x-1))*4] + sharpBuffer[((y-1)*w+x)*4]*2 + sharpBuffer[((y-1)*w+(x+1))*4] +
                sharpBuffer[((y)*w+(x-1))*4]*2 + sharpBuffer[((y)*w+x)*4]*4 + sharpBuffer[((y)*w+(x+1))*4]*2 +
                sharpBuffer[((y+1)*w+(x-1))*4] + sharpBuffer[((y+1)*w+x)*4]*2 + sharpBuffer[((y+1)*w+(x+1))*4]
              ) / 16;
              
              const original = sharpBuffer[idx];
              const sharpened = Math.round(original + sharpAmount * (original - blurred));
              const val = Math.max(0, Math.min(255, sharpened));
              data[idx] = val;
              data[idx + 1] = val;
              data[idx + 2] = val;
            }
          }
          
          // Stage 5: Morphological Dilation (1-pass)
          // Connects broken Thai character strokes that Tesseract struggles with
          // Only dilate DARK pixels (text) — this thickens thin text slightly
          const morphBuffer = new Uint8ClampedArray(data);
          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const idx = (y * w + x) * 4;
              if (morphBuffer[idx] > 100) { // Only process light pixels
                // Check if any neighbor is dark (< 80) — if so, make this pixel darker too
                let hasDarkNeighbor = false;
                for (let dy = -1; dy <= 1 && !hasDarkNeighbor; dy++) {
                  for (let dx = -1; dx <= 1 && !hasDarkNeighbor; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    if (morphBuffer[((y+dy)*w+(x+dx))*4] < 80) {
                      hasDarkNeighbor = true;
                    }
                  }
                }
                if (hasDarkNeighbor && morphBuffer[idx] < 160) {
                  // Semi-dark pixel adjacent to dark pixel — push darker to connect strokes
                  const darkened = Math.max(0, morphBuffer[idx] - 40);
                  data[idx] = darkened;
                  data[idx + 1] = darkened;
                  data[idx + 2] = darkened;
                }
              }
            }
          }
          
        } else {
          // Binarized Otsu Thresholding Mode for Thai Text & Tables
          const threshold = otsuThreshold(data, width, height);
          const contrastFactor = 1.35;

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
  discount?: number;
  total_amount: number;
  items: Array<{
    item_code: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
  }>;
  reconciliation?: {
    subtotal: number;
    totalAmount: number;
    discount: number;
    isMatched: boolean;
    discrepancy: number;
  };
}

/**
 * Checks whether a line is a legal disclaimer, digital signature, e-tax invoice note, or table footer
 */
export function isFooterOrDisclaimerLine(line: string): boolean {
  const clean = line.trim();
  if (!clean) return false;
  return (
    /Digitally\s*signed\s*by/i.test(clean) ||
    /ใบกำกับภาษีอิเล็กทรอนิกส์|e-Tax\s*Invoice|e-Receipt/i.test(clean) ||
    /สินค้าสั่งพิเศษ|ไม่สามารถเปลี่ยน\/คืน|ไม่รับเปลี่ยน/i.test(clean) ||
    /บริษัทขอสงวนสิทธิ์|ขอสงวนสิทธิ์ในการรับเปลี่ยน/i.test(clean) ||
    /บงภาษี[\.\s]*มง|ยกเว้นภาษี\s*รวมยอดขาย/i.test(clean) ||
    /เอกสารออกเป็นชุด|ต้นฉบับ.*คู่ฉบับ|สำเนา.*หน้าที่\s*\d+\/\d+|Page\s*\d+\s*of\s*\d+/i.test(clean) ||
    /ผู้รับของ.*ผู้ส่งของ|ผู้รับเงิน.*ผู้จ่ายเงิน|ผู้รับมอบอำนาจ|ลงชื่อ.*ผู้รับ/i.test(clean) ||
    /ข้าพเจ้าได้รับสินค้า|ในสภาพเรียบร้อย.*ครบถ้วน/i.test(clean)
  );
}

/**
 * Strips embedded legal clauses, digital signature notices, or tax footers that may be merged into product descriptions
 */
export function cleanItemDescription(desc: string): string {
  let cleaned = desc;
  cleaned = cleaned
    .replace(/Digitally\s*signed\s*by.*/gi, '')
    .replace(/สินค้าสั่งพิเศษ.*?(?:เปลี่ยน\/คืน|คืนสินค้า|\d+\s*วัน|$)/gi, '')
    .replace(/บริษัทขอสงวนสิทธิ์.*?(?:เปลี่ยน\/คืน|คืนสินค้า|\d+\s*วัน|$)/gi, '')
    .replace(/บงภาษี[\.\s]*มง.*?รวมยอดขาย.*?(?:[a-zA-Z0-9\s”"“’]*)?/gi, '')
    .replace(/ยกเว้นภาษี\s*รวมยอดขาย.*/gi, '')
    .replace(/เอกสารออกเป็นชุด.*/gi, '')
    .replace(/หน้าที่\s*\d+\/\d+.*/gi, '')
    .replace(/Page\s*\d+\s*of\s*\d+.*/gi, '')
    .replace(/[\(«»“”"’'\?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
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

  // 2. Cluster into rows using Vertical Intersection (Y-Overlap)
  for (let i = 1; i < sortedWords.length; i++) {
    const word = sortedWords[i];
    
    // Calculate the median/average Y bounds of the current row
    let sumY0 = 0, sumY1 = 0;
    for (const w of currentRow) {
      sumY0 += w.bbox.y0;
      sumY1 += w.bbox.y1;
    }
    const avgY0 = sumY0 / currentRow.length;
    const avgY1 = sumY1 / currentRow.length;
    
    // Check vertical overlap
    const overlapStart = Math.max(avgY0, word.bbox.y0);
    const overlapEnd = Math.min(avgY1, word.bbox.y1);
    const overlapHeight = overlapEnd - overlapStart;
    
    const wordHeight = word.bbox.y1 - word.bbox.y0;
    const rowHeight = avgY1 - avgY0;
    const minHeight = Math.min(wordHeight, rowHeight);
    
    // If they overlap by at least 35% of the minimum height, they belong to the same row
    if (overlapHeight > 0 && (overlapHeight / minHeight) > 0.35) {
      currentRow.push(word);
    } else {
      rows.push(currentRow);
      currentRow = [word];
    }
  }
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  // 3. Rebuild text with simulated column spacing (X-axis)
  const rebuiltLines: string[] = [];
  for (const row of rows) {
    // Sort words in this row horizontally (left to right)
    row.sort((a, b) => a.bbox.x0 - b.bbox.x0);

    let lineText = '';
    let lastX = row[0].bbox.x0;

    for (let i = 0; i < row.length; i++) {
      const word = row[i];
      const gap = word.bbox.x0 - lastX;
      
      // If gap is significant (> 35 pixels), add extra spaces to simulate columns
      if (i > 0 && gap > 35) {
        lineText += '    '; // Column separator (4 spaces) used by parsing logic
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
  let text = '';
  if (typeof ocrData === 'string') {
    text = ocrData;
  } else if (ocrData?.rawText) {
    text = ocrData.rawText;
  } else if (ocrData?.text) {
    text = ocrData.text;
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
    'สินค้าที่มีภาษี', 'สินค้าที่ไม่มีภาษี', 'สินค้าไม่มีภาษี', 'สินค้าที่ยกเว้น', 'สินค้าที่เสีย', 'สินค้าที่ได้รับยกเว้น', 'มูลค่าสินค้า', 'มูลค่าภาษี', 'ภาษี 7%', 'ภาษี7%',
    'จำนวนรวม', 'รวมรายการ', 'ราคาสินค้า', 'ส่วนลด', 'DISCOUNT', 'พนักงานขาย', 'CASHIER', 'เวลา', 'TIME',
    'โทร', 'TEL', 'FAX', 'EMAIL', 'อีเมล', 'เว็บไซต์', 'WWW', 'HTTP', 'NET TOTAL', 'NET AMOUNT',
    // Address & Company Info keywords — these are NEVER product items
    'ที่อยู่', 'ผู้ซื้อ', 'ผู้ขาย', 'หมู่ที่', 'ตำบล', 'อำเภอ', 'จังหวัด', 'ถนน', 'ซอย', 'แขวง', 'เขต', 'รหัสไปรษณีย์',
    'เลขประจำตัวผู้เสียภาษี', 'สำนักงานใหญ่', 'เลขที่ใบเสร็จ', 'เลขที่ใบกำกับ', 'วันที่', 'DATE', 'แบสลี',
    // Table header & Tax summary keywords
    'รายละเอียด', 'ราคา/หน่วย', 'รวม (บาท)', 'รหัสสินค้า', 'จำนวน', 'หน่วยละ', 'จำนวนเงิน', 'DESCRIPTION', 'QTY', 'PRICE', 'AMOUNT', 'ITEM',
    'ORDER NO', 'ORDER', 'ลำดับ', 'รายการ', 'ชื่อสินค้า', 'รายละเอียดสินค้า', 'NO.', 'รหัส', 'หน่วย', 'มูลค่า', 'ส่วนลด',
    'รวมยอดขาย', 'มูลค่าฐานภาษี', 'มูลค่าตามใบกำกับภาษี', 'ยอดขาย', 'ยอดสุทธิ',
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
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (excludeKeywords.some(kw => line.toUpperCase().includes(kw.toUpperCase()))) {
      continue;
    }

    // 1. Check if line starts with row index e.g. "1.", "2.", "15." or "1)", "2)"
    const hasRowIndex = /^\s*\d{1,2}[\.\)\s]+/.test(line);

    // 2. Check if line starts with SKU / Barcode bracket code e.g. "[P0002]", "[M0103]" or 8-14 digit barcode
    const skuTest = /^\s*\[?([A-Z0-9\-]{3,14})\]?/i.exec(line);
    const hasSkuPrefix = skuTest && (/P\d|M\d|A\d|PJ\d|SIM\d|INV|DOC|\d{8,14}/i.test(line) || /^\d{8,14}\b/.test(line))
      && !/^\s*SKU\b/i.test(line);

    // 3. Check if line has price numbers at the end (e.g. "285.00" or "285.-" or "285")
    const priceMatches = line.match(/([\d,]+(?:\.\d{2}|\.-))/g) || line.match(/\s+(\d{1,6})\s*$/);
    const hasPriceAtEnd = priceMatches && priceMatches.length >= 1;
    const validPrices = hasPriceAtEnd ? priceMatches.map(p => parseFloat(p.replace(/\.-/, '.00').replace(/,/g, ''))).filter(p => p > 0) : [];
    let itemPrice = validPrices.length > 0 ? (validPrices[validPrices.length > 1 ? validPrices.length - 2 : 0] || validPrices[0]) : 0;

    // 4. Address line detection — lines with address keywords are NEVER product items
    const isAddressLine = /ที่อยู่|ผู้ซื้อ|ผู้ขาย|หมู่ที่|ตำบล|อำเภอ|จังหวัด|ถนน|ซอย|แขวง|เขต|รหัสไปรษณีย์/i.test(line);

    // 5. Table header detection — lines with column labels
    const isTableHeader = /^\s*SKU\b/i.test(line) || /รายละเอียด.*จำนวน|รหัสสินค้า.*ราคา/i.test(line) || /^(?:ลำดับ|ORDER|NO\.|ITEM|รหัส|ชื่อสินค้า|รายการ)/i.test(line) || /จำนวน.*หน่วยละ.*จำนวนเงิน|จำนวน.*หน่วย.*ราคา|หน่วยละ\(บาท\)/i.test(line);

    // 6. Direct Column Pattern Matchers:
    // Pattern A: Standard Thai Table 3-Column line: [Description] [Quantity] [UnitPrice] [TotalPrice]
    // e.g. "กล่องแยกสายไฟ 3 170.00 510.00" or "ตู้ไฟสวิตช์บอร์ด 3 360.00 1,080.00"
    const standard3ColMatch = !isAddressLine && !isTableHeader ? line.match(/^(.+?)\s+(\d{1,4})\s+([\d,]+(?:\.\d{2}|\.-))\s+([\d,]+(?:\.\d{2}|\.-))\s*$/) : null;

    // Pattern B: Standard Thai Table 2-Price line (qty implicit 1): [Description] [UnitPrice] [TotalPrice]
    // e.g. "หัวแร้งบัดกรี 2,150.00 2,150.00" or "ปลั๊กไฟ 285.00 285.00"
    const standard2PriceMatch = !isAddressLine && !isTableHeader && !standard3ColMatch ? line.match(/^(.+?)\s+([\d,]+(?:\.\d{2}|\.-))\s+([\d,]+(?:\.\d{2}|\.-))\s*$/) : null;

    // 7. Lookahead 2-line POS Parser:
    // If current line has description/barcode but NO price, check if next line i+1 has price/qty
    let lookaheadMatched = false;
    let nextLinePrices: number[] = [];
    let nextLineQty = 1;

    if (!isAddressLine && !isTableHeader && !standard3ColMatch && !standard2PriceMatch && itemPrice === 0 && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const nextPriceMatches = nextLine.match(/([\d,]+(?:\.\d{2}|\.-))/g) || nextLine.match(/\s+(\d{1,6})\s*$/);
      if (nextPriceMatches && nextPriceMatches.length >= 1) {
        nextLinePrices = nextPriceMatches.map(p => parseFloat(p.replace(/\.-/, '.00').replace(/,/g, ''))).filter(p => p > 0);
        if (nextLinePrices.length > 0) {
          const nextQtyMatch = nextLine.match(/^\s*(\d+)\s+/) || nextLine.match(/\s+(\d+)\s+[\d,]+/);
          if (nextQtyMatch) nextLineQty = parseInt(nextQtyMatch[1], 10) || 1;
          lookaheadMatched = true;
          itemPrice = nextLinePrices[nextLinePrices.length - 1];
        }
      }
    }

    // A line is a NEW ITEM ROW if it has a row index, SKU prefix, valid price, column match, or lookahead match
    const isNewItemRow = !isAddressLine && !isTableHeader && (Boolean(standard3ColMatch) || Boolean(standard2PriceMatch) || hasRowIndex || hasSkuPrefix || (itemPrice > 0 && itemPrice !== total_amount) || lookaheadMatched);

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

      // Check leading 8-14 digit barcode (e.g. 8859298504132 หรือ 2000603173741)
      const leadingBarcodeMatch = cleanDesc.match(/^\s*(\d{8,14})\s+(.+)$/);
      if (leadingBarcodeMatch) {
        item_code = leadingBarcodeMatch[1];
        cleanDesc = leadingBarcodeMatch[2].trim();
      }

      if (!item_code) {
        const skuMatch = cleanDesc.match(/(?:ART\.?|ITEM:?|CODE:?|SKU:?|รหัส:?)?\s*[\(\[\{]?([0-9A-Z\-ก-ฮ]{3,15})[\)\]\}]?/i);
        if (skuMatch) {
          let rawCode = skuMatch[1] || '';
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
      }

      // Clean leading row numbers e.g. "1.", "2.", "15."
      cleanDesc = cleanThaiText(cleanDesc.replace(/^\d{1,3}[\.\)\s]+/, ''));
      // Clean any embedded legal/disclaimer junk inside description
      cleanDesc = cleanItemDescription(cleanDesc);

      // Detect quantity and prices from matched patterns
      let quantity = 1;
      let unit_price = itemPrice;
      let total_price_final = itemPrice;

      if (standard3ColMatch) {
        cleanDesc = standard3ColMatch[1];
        quantity = parseInt(standard3ColMatch[2], 10) || 1;
        unit_price = parseFloat(standard3ColMatch[3].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
        total_price_final = parseFloat(standard3ColMatch[4].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
      } else if (standard2PriceMatch) {
        cleanDesc = standard2PriceMatch[1];
        quantity = 1;
        unit_price = parseFloat(standard2PriceMatch[2].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
        total_price_final = parseFloat(standard2PriceMatch[3].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
      } else if (lookaheadMatched && nextLinePrices.length >= 2) {
        unit_price = nextLinePrices[0];
        total_price_final = nextLinePrices[nextLinePrices.length - 1];
        quantity = nextLineQty;
        i++; // Advance pointer because next line was consumed as price/qty row
      } else if (colSegments.length >= 3) {
        const numericSegments = colSegments.slice(1).map(s => s.trim()).filter(s => /[\d,]+/.test(s));
        
        if (numericSegments.length >= 2) {
          const qtyCandidate = parseFloat(numericSegments[0].replace(/[^\d.]/g, ''));
          if (!isNaN(qtyCandidate) && qtyCandidate >= 1 && qtyCandidate <= 9999 && qtyCandidate === Math.floor(qtyCandidate)) {
            quantity = qtyCandidate;
          }
          
          const prices = numericSegments
            .map(s => {
              const m = s.match(/([\d,]+(?:\.\d{2}|\.\-))/);
              return m ? parseFloat(m[1].replace(/\.-/, '.00').replace(/,/g, '')) : 0;
            })
            .filter(p => p > 0);
          
          if (prices.length >= 2) {
            unit_price = prices[prices.length - 2];
            total_price_final = prices[prices.length - 1];
          } else if (prices.length === 1) {
            unit_price = prices[0];
            total_price_final = prices[0] * quantity;
          }
        }
      } else if (!lookaheadMatched) {
        const qtyMatch = line.match(/\s+(\d+)\s+[\d,]+(?:\.\d{2}|\.-)/)
                       || line.match(/\s+(\d+)\s+(?:ชิ้น|อัน|แผ่น|เมตร|ม\.|แท่ง|ม้วน|กล่อง|แพ็ค|ชุด|ด้าม|ตัว|คู่|ถุง|ขวด|หลอด|ซอง|ก้อน|เล่ม|รีม|แกลลอน|ถัง|เส้น|กก\.|กิโลกรัม|เครื่อง)/i);
        if (qtyMatch && qtyMatch[1]) {
          quantity = parseInt(qtyMatch[1], 10) || 1;
        }
        total_price_final = unit_price * quantity;
      }

      // Mathematical Auto-Reconciliation for item row
      if (quantity > 0 && unit_price > 0 && (total_price_final === 0 || Math.abs(total_price_final - (quantity * unit_price)) > 0.05)) {
        total_price_final = Math.round(quantity * unit_price * 100) / 100;
      } else if (total_price_final > 0 && quantity > 0 && unit_price === 0) {
        unit_price = Math.round((total_price_final / quantity) * 100) / 100;
      }

      // High-precision Thai unit detection
      let unit = 'ชิ้น';
      const allText = colSegments.length > 1 ? colSegments.join(' ') : cleanDesc;

      if (/กล่อง/i.test(allText)) unit = 'กล่อง';
      else if (/แพ็ค|แพค/i.test(allText)) unit = 'แพ็ค';
      else if (/เครื่อง/i.test(allText)) unit = 'เครื่อง';
      else if (/ม้วน/i.test(allText)) unit = 'ม้วน';
      else if (/ถัง/i.test(allText)) unit = 'ถัง';
      else if (/ชุด/i.test(allText)) unit = 'ชุด';
      else if (/แท่ง/i.test(allText)) unit = 'แท่ง';
      else if (/เส้น/i.test(allText)) unit = 'เส้น';
      else if (/อัน/i.test(allText)) unit = 'อัน';
      else if (/แผ่น/i.test(allText)) unit = 'แผ่น';
      else if (/ด้าม/i.test(allText)) unit = 'ด้าม';
      else if (/ตัว/i.test(allText)) unit = 'ตัว';
      else if (/เล่ม/i.test(allText)) unit = 'เล่ม';
      else if (/รีม/i.test(allText)) unit = 'รีม';
      else if (/ซอง/i.test(allText)) unit = 'ซอง';
      else if (/ก้อน/i.test(allText)) unit = 'ก้อน';
      else if (/ขวด/i.test(allText)) unit = 'ขวด';
      else if (/หลอด/i.test(allText)) unit = 'หลอด';
      else if (/ถุง/i.test(allText)) unit = 'ถุง';
      else if (/คู่/i.test(allText)) unit = 'คู่';
      else if (/แกลลอน/i.test(allText)) unit = 'แกลลอน';
      else if (/กิโลกรัม|กก\./i.test(allText)) unit = 'กิโลกรัม';
      else if (/(?:^|\s)เมตร(?:\s|$)|หน่วย.*เมตร|ยาว.*เมตร/i.test(allText)) unit = 'เมตร';

      const isZeroPriceJunk = unit_price === 0 && !item_code && cleanDesc.length < 5;
      const isLowPriceGarbage = total_price_final <= 1.05 && !item_code && cleanDesc.length < 15;
      const isTaxSummaryJunk = /สินค้าที่ไม่มีภาษี|สินค้าไม่มีภาษี|สินค้าที่ได้รับยกเว้น|มูลค่าฐานภาษี|รวมยอดขาย|ยอดรวมภาษี|ยอดสุทธิ/i.test(cleanDesc);

      if (
        cleanDesc.length >= 3 &&
        !isZeroPriceJunk &&
        !isLowPriceGarbage &&
        !isTaxSummaryJunk &&
        !THAI_MONTH_PATTERNS.test(cleanDesc) &&
        !/^(?:รวม|สุทธิ|ภาษี|มูลค่า|ยอด|ส่วนลด|ชำระ|เงินสด|บัตร|สมาชิก|สาขา|จำนวน|หน้าที่|เอกสาร|ผู้รับ|ลงชื่อ|ค่าขนส่ง|นที|วันที่|หมายเหตุ|แบสลี)/i.test(cleanDesc) &&
        !/^\d+\s*รายการ/i.test(cleanDesc) &&
        /[ก-ฮa-zA-Z]{2,}/i.test(cleanDesc) &&
        !/ที่อยู่|ผู้ซื้อ|หมู่ที่|ตำบล|อำเภอ|จังหวัด|ผู้รับเงิน|ผู้ส่งของ|ลงชื่อ|อนุมัติ|หมายเหตุ/i.test(cleanDesc) &&
        !isGarbledThaiGibberish(cleanDesc)
      ) {
        items.push({
          item_code,
          description: cleanDesc,
          quantity,
          unit,
          unit_price,
          total_price: total_price_final
        });
      }
    } else {
      // Continuation Line: Line does NOT have index/SKU/price!
      // Append ONLY if we have a previous item AND it's not a header/footer/disclaimer
      if (items.length > 0) {
        const lastItem = items[items.length - 1];
        let cleanContinuation = cleanThaiText(line);
        cleanContinuation = cleanItemDescription(cleanContinuation);

        if (
          cleanContinuation.length >= 2 &&
          !isFooterOrDisclaimerLine(cleanContinuation) &&
          !/^(?:รวม|สุทธิ|ภาษี|มูลค่า|ยอด|ส่วนลด|ชำระ|เงินสด|บัตร|สมาชิก|สาขา|จำนวน|หน้าที่|เอกสาร|บริษัท|หจก|เลขที่|วันที่|ข้อมูล|หมายเหตุ|ผู้รับ|โปรด|เงื่อนไข)/i.test(cleanContinuation) &&
          !/^\d+\s*รายการ/i.test(cleanContinuation) &&
          !isGarbledThaiGibberish(cleanContinuation)
        ) {
          lastItem.description = (lastItem.description + ' ' + cleanContinuation).replace(/\s+/g, ' ').trim();
        }
      }
    }
  }

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

  // 7. Mathematical Reconciliation for Whole Invoice
  const calculatedSubtotal = dedupedItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
  let inferredDiscount = 0;

  if (total_amount <= 0 && calculatedSubtotal > 0) {
    total_amount = calculatedSubtotal;
  } else if (total_amount > 0 && calculatedSubtotal > total_amount) {
    inferredDiscount = Math.round((calculatedSubtotal - total_amount) * 100) / 100;
  }

  const isMatched = Math.abs((calculatedSubtotal - inferredDiscount) - total_amount) < 0.05;
  const discrepancy = Math.round((calculatedSubtotal - total_amount) * 100) / 100;

  return {
    vendor_name: vendor_name || 'ร้านค้า / บริษัทผู้ขาย',
    invoice_number: invoice_number || '',
    invoice_date: invoice_date || '',
    discount: inferredDiscount,
    total_amount,
    items: dedupedItems,
    reconciliation: {
      subtotal: calculatedSubtotal,
      totalAmount: total_amount,
      discount: inferredDiscount,
      isMatched,
      discrepancy
    }
  };
}
