// ============================================================================
// DEEPSCAN 5.0: ULTRA-HIGH PRECISION THAI/ENGLISH RECEIPT & TAX INVOICE OCR ENGINE
// Specialized for Government Procurement, Hardware Giants (Thai Watsadu, HomePro, DoHome)
// & Electronic Component Invoices (Shopee, Lazada, Microcontrollers, IT & Stationery)
// ============================================================================

/**
 * Otsu Global Thresholding Algorithm
 */
export function otsuThreshold(pixels: Uint8ClampedArray, width: number, height: number): number {
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

/**
 * Color-Aware Document Background Normalization & Watermark/Stamp Removal
 * 1. Suppresses red rubber stamps ("จ่ายแล้ว", "PAID") and colored background watermarks (cyan/blue)
 * 2. Normalizes paper illumination using 2D block-wise background division
 * 3. Enhances dot-matrix ink contrast while keeping background pure white (255)
 */
export function normalizeDocumentBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  suppressColorStamps = true
): Uint8Array {
  const totalPixels = width * height;
  const gray = new Uint8Array(totalPixels);

  // 1. Color-Suppression Grayscale Conversion:
  // Black text is dark in all 3 channels (R, G, B are all low).
  // Red ink stamp ("จ่ายแล้ว") has high R (180-255) and low G/B.
  // Using Math.max(r, Math.min(g, b)) makes red stamps bright (invisible)
  // while keeping black text dark!
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (suppressColorStamps) {
      const redDominance = r - Math.max(g, b);
      if (redDominance > 25 && r > 110) {
        // Pixel belongs to red stamp -> map to paper highlight
        gray[j] = Math.max(r, 240);
      } else {
        // Standard weighted gray, slightly favoring green/blue to suppress cyan watermarks
        gray[j] = Math.round(0.20 * r + 0.50 * g + 0.30 * b);
      }
    } else {
      gray[j] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
  }

  // 2. Fast 2D Block-Grid Background Illumination Estimation
  const blockSize = Math.max(32, Math.min(64, Math.round(width / 50)));
  const gridW = Math.ceil(width / blockSize);
  const gridH = Math.ceil(height / blockSize);
  const bgGrid = new Float32Array(gridW * gridH);

  for (let gy = 0; gy < gridH; gy++) {
    const startY = gy * blockSize;
    const endY = Math.min(height, startY + blockSize);
    for (let gx = 0; gx < gridW; gx++) {
      const startX = gx * blockSize;
      const endX = Math.min(width, startX + blockSize);

      let maxVal = 0;
      for (let y = startY; y < endY; y += 2) {
        const rowOffset = y * width;
        for (let x = startX; x < endX; x += 2) {
          const v = gray[rowOffset + x];
          if (v > maxVal) maxVal = v;
        }
      }
      bgGrid[gy * gridW + gx] = Math.max(128, maxVal);
    }
  }

  // 3. Bilinear Background Division & Contrast Expansion
  const out = new Uint8Array(totalPixels);
  const invBlock = 1 / blockSize;

  for (let y = 0; y < height; y++) {
    const gyFloat = (y - blockSize * 0.5) * invBlock;
    const gy0 = Math.max(0, Math.min(gridH - 1, Math.floor(gyFloat)));
    const gy1 = Math.min(gridH - 1, gy0 + 1);
    const ty = Math.max(0, Math.min(1, gyFloat - gy0));

    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const gxFloat = (x - blockSize * 0.5) * invBlock;
      const gx0 = Math.max(0, Math.min(gridW - 1, Math.floor(gxFloat)));
      const gx1 = Math.min(gridW - 1, gx0 + 1);
      const tx = Math.max(0, Math.min(1, gxFloat - gx0));

      const b00 = bgGrid[gy0 * gridW + gx0];
      const b10 = bgGrid[gy0 * gridW + gx1];
      const b01 = bgGrid[gy1 * gridW + gx0];
      const b11 = bgGrid[gy1 * gridW + gx1];

      const bgVal = (b00 * (1 - tx) + b10 * tx) * (1 - ty) + (b01 * (1 - tx) + b11 * tx) * ty;
      const g = gray[rowOffset + x];

      // Divide by background to flatten paper tint & watermark to 255
      let norm = (g / (bgVal || 255)) * 255;
      if (norm > 210) {
        norm = 255; // Paper highlight -> pure white
      } else if (norm < 140) {
        // Dark text -> expand contrast
        norm = (norm / 140) * 110;
      }
      out[rowOffset + x] = Math.max(0, Math.min(255, Math.round(norm)));
    }
  }

  return out;
}

/**
 * Sauvola Local Adaptive Thresholding for Thermal Receipts & Faded Dot-Matrix Ink
 * Formula: T(x, y) = m(x, y) * (1 + k * (s(x, y) / R - 1))
 */
export function applySauvolaThreshold(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  windowSize = 71,
  k = 0.22,
  precomputedGray?: Uint8Array
): void {
  const w = width;
  const h = height;
  const effectiveWin = windowSize >= 45 ? windowSize : Math.max(51, Math.min(91, Math.round(w / 35) | 1));
  const halfWin = Math.floor(effectiveWin / 2);
  const R = 128;

  const gray = precomputedGray || new Uint8Array(w * h);
  if (!precomputedGray) {
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
  }

  const integral = new Float64Array((w + 1) * (h + 1));
  const integralSq = new Float64Array((w + 1) * (h + 1));

  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    let rowSumSq = 0;
    for (let x = 0; x < w; x++) {
      const g = gray[y * w + x];
      rowSum += g;
      rowSumSq += g * g;

      const idx = (y + 1) * (w + 1) + (x + 1);
      const prevRowIdx = y * (w + 1) + (x + 1);

      integral[idx] = integral[prevRowIdx] + rowSum;
      integralSq[idx] = integralSq[prevRowIdx] + rowSumSq;
    }
  }

  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - halfWin);
    const y1 = Math.min(h, y + halfWin + 1);

    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - halfWin);
      const x1 = Math.min(w, x + halfWin + 1);

      const area = (y1 - y0) * (x1 - x0);

      const A = y0 * (w + 1) + x0;
      const B = y0 * (w + 1) + x1;
      const C = y1 * (w + 1) + x0;
      const D = y1 * (w + 1) + x1;

      const sum = integral[D] - integral[B] - integral[C] + integral[A];
      const sumSq = integralSq[D] - integralSq[B] - integralSq[C] + integralSq[A];

      const mean = sum / area;
      const variance = Math.max(0, (sumSq / area) - (mean * mean));
      const stddev = Math.sqrt(variance);

      const threshold = mean * (1.0 + k * ((stddev / R) - 1.0));

      const g = gray[y * w + x];
      const bin = g < threshold ? 0 : 255;

      const pIdx = (y * w + x) * 4;
      data[pIdx] = bin;
      data[pIdx + 1] = bin;
      data[pIdx + 2] = bin;
    }
  }
}

export type PreprocessMode = 'header' | 'binarized' | 'grayscale';

export function preprocessImageForOcr(fileOrUrl: File | string, mode: PreprocessMode = 'grayscale'): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const isString = typeof fileOrUrl === 'string';
    const objectUrl = isString ? fileOrUrl : URL.createObjectURL(fileOrUrl);

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
          const normGray = normalizeDocumentBackground(data, width, height, true);
          for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            const g = normGray[j];
            data[i] = g;
            data[i + 1] = g;
            data[i + 2] = g;
          }

          const sharpBuffer = new Uint8ClampedArray(data);
          const w = width;
          const h = height;
          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const idx = (y * w + x) * 4;
              const blurred = (
                sharpBuffer[((y - 1) * w + (x - 1)) * 4] + sharpBuffer[((y - 1) * w + x) * 4] * 2 + sharpBuffer[((y - 1) * w + (x + 1)) * 4] +
                sharpBuffer[(y * w + (x - 1)) * 4] * 2 + sharpBuffer[(y * w + x) * 4] * 4 + sharpBuffer[(y * w + (x + 1)) * 4] * 2 +
                sharpBuffer[((y + 1) * w + (x - 1)) * 4] + sharpBuffer[((y + 1) * w + x) * 4] * 2 + sharpBuffer[((y + 1) * w + (x + 1)) * 4]
              ) / 16;
              const orig = sharpBuffer[idx];
              const sharpened = Math.max(0, Math.min(255, Math.round(orig + 1.25 * (orig - blurred))));
              data[idx] = sharpened;
              data[idx + 1] = sharpened;
              data[idx + 2] = sharpened;
            }
          }
        } else {
          const normGray = normalizeDocumentBackground(data, width, height, true);
          applySauvolaThreshold(data, width, height, 71, 0.22, normGray);
        }

        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
        if (!isString) URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      } catch (e) {
        console.warn('Preprocessing fallback:', e);
        resolve(objectUrl);
      }
    };
    img.onerror = () => resolve(objectUrl);
    img.src = objectUrl;
  });
}

export interface MultiPassProcessedImagesDeep5 {
  passMain: string;
  passSauvola: string;
  passHeader: string;
  passSummary: string;
}

/**
 * DeepScan 5.0 Multi-Pass Preprocessor: Generates 4 Crystal-Clear Visual Layers (No Skew Distortion)
 */
export function preprocessMultiPassImageForOcrDeep5(file: File | string): Promise<MultiPassProcessedImagesDeep5> {
  return new Promise((resolve) => {
    const img = new Image();
    const isBlobUrl = typeof file !== 'string';
    const objectUrl = typeof file === 'string' ? file : URL.createObjectURL(file);

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width < 2600) {
          const ratio = 2600 / width;
          width = 2600;
          height = Math.round(height * ratio);
        }

        // 1. Pass Main: Color-Suppressed Background Normalization + Sharp Edge Mask (for Thai Tone Marks & Vowels)
        const canvasMain = document.createElement('canvas');
        canvasMain.width = width;
        canvasMain.height = height;
        const ctxMain = canvasMain.getContext('2d');
        if (!ctxMain) throw new Error('No 2d context');

        ctxMain.imageSmoothingEnabled = true;
        ctxMain.imageSmoothingQuality = 'high';
        ctxMain.drawImage(img, 0, 0, width, height);

        const imgDataMain = ctxMain.getImageData(0, 0, width, height);
        const dataMain = imgDataMain.data;

        // Apply document background normalization (erases blue/cyan watermark & paper tint)
        const normGray = normalizeDocumentBackground(dataMain, width, height, true);
        for (let i = 0, j = 0; i < dataMain.length; i += 4, j++) {
          const g = normGray[j];
          dataMain[i] = g;
          dataMain[i + 1] = g;
          dataMain[i + 2] = g;
        }

        const sharpBuffer = new Uint8ClampedArray(dataMain);
        const w = width;
        const h = height;
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            const blurred = (
              sharpBuffer[((y - 1) * w + (x - 1)) * 4] + sharpBuffer[((y - 1) * w + x) * 4] * 2 + sharpBuffer[((y - 1) * w + (x + 1)) * 4] +
              sharpBuffer[(y * w + (x - 1)) * 4] * 2 + sharpBuffer[(y * w + x) * 4] * 4 + sharpBuffer[(y * w + (x + 1)) * 4] * 2 +
              sharpBuffer[((y + 1) * w + (x - 1)) * 4] + sharpBuffer[((y + 1) * w + x) * 4] * 2 + sharpBuffer[((y + 1) * w + (x + 1)) * 4]
            ) / 16;
            const orig = sharpBuffer[idx];
            const sharpened = Math.max(0, Math.min(255, Math.round(orig + 1.25 * (orig - blurred))));
            dataMain[idx] = sharpened;
            dataMain[idx + 1] = sharpened;
            dataMain[idx + 2] = sharpened;
          }
        }
        ctxMain.putImageData(imgDataMain, 0, 0);
        const passMain = canvasMain.toDataURL('image/jpeg', 0.98);

        // 2. Pass Sauvola: Adaptive Binarization on Normalized Gray (for Clean Digits & Column Boundaries)
        const canvasSauvola = document.createElement('canvas');
        canvasSauvola.width = width;
        canvasSauvola.height = height;
        const ctxSauvola = canvasSauvola.getContext('2d');
        if (!ctxSauvola) throw new Error('No Sauvola context');

        ctxSauvola.drawImage(img, 0, 0, width, height);
        const imgDataSauvola = ctxSauvola.getImageData(0, 0, width, height);
        applySauvolaThreshold(imgDataSauvola.data, width, height, 71, 0.22, normGray);
        ctxSauvola.putImageData(imgDataSauvola, 0, 0);
        const passSauvola = canvasSauvola.toDataURL('image/jpeg', 0.98);

        // 3. Pass Header: Top 38% zoomed
        const canvasHeader = document.createElement('canvas');
        const headerH = Math.round(height * 0.38);
        canvasHeader.width = width;
        canvasHeader.height = headerH;
        const ctxHeader = canvasHeader.getContext('2d');
        if (ctxHeader) {
          ctxHeader.drawImage(canvasMain, 0, 0, width, headerH, 0, 0, width, headerH);
        }
        const passHeader = canvasHeader.toDataURL('image/jpeg', 0.98);

        // 4. Pass Summary: Bottom 35% zoomed
        const canvasSummary = document.createElement('canvas');
        const summaryH = Math.round(height * 0.35);
        const summaryY = height - summaryH;
        canvasSummary.width = width;
        canvasSummary.height = summaryH;
        const ctxSummary = canvasSummary.getContext('2d');
        if (ctxSummary) {
          ctxSummary.drawImage(canvasSauvola, 0, summaryY, width, summaryH, 0, 0, width, summaryH);
        }
        const passSummary = canvasSummary.toDataURL('image/jpeg', 0.98);

        if (isBlobUrl) URL.revokeObjectURL(objectUrl);
        resolve({
          passMain,
          passSauvola,
          passHeader,
          passSummary
        });
      } catch (err) {
        console.error('DeepScan 5.0 preprocessing error:', err);
        URL.revokeObjectURL(objectUrl);
        resolve({
          passMain: objectUrl,
          passSauvola: objectUrl,
          passHeader: objectUrl,
          passSummary: objectUrl
        });
      }
    };

    img.onerror = () => {
      resolve({
        passMain: objectUrl,
        passSauvola: objectUrl,
        passHeader: objectUrl,
        passSummary: objectUrl
      });
    };

    img.src = objectUrl;
  });
}

export const preprocessMultiPassImageForOcr = preprocessMultiPassImageForOcrDeep5;

// ============================================================================
// EXTENSIVE DOMAIN MASTER DICTIONARY 5.0 & TYPO CORRECTIONS
// ============================================================================

export const THAI_PROCUREMENT_LEXICON = [
  // Corporate & Legal
  'บริษัท', 'จำกัด (มหาชน)', 'จำกัด', 'ห้างหุ้นส่วนจำกัด', 'สำนักงานใหญ่', 'สาขา', 'สาขาที่',
  'ใบกำกับภาษีอย่างย่อ', 'ใบกำกับภาษี', 'ใบเสร็จรับเงิน', 'เอกสารออกเป็นชุด', 'ต้นฉบับ',
  'เลขประจำตัวผู้เสียภาษี', 'ผู้เสียภาษีอากร', 'โทรศัพท์', 'โทรสาร', 'ที่อยู่',

  // Hardware, Electrical & Tools (Thai Watsadu, HomePro, DoHome, MegaHome)
  'ตู้กันน้ำพลาสติกฝาทึบ', 'ตู้กันน้ำพลาสติกฝาใส', 'ตู้กันน้ำพลาสติก', 'ตู้กันน้ำ', 'ตู้ไฟสวิตช์บอร์ด', 'กล่องกันน้ำ', 'กล่องพักสายไฟ',
  'ท่อหด', 'ท่อตรงยูพีวีซี', 'ท่อร้อยสายไฟ', 'ท่อพีวีซี', 'ท่อเฟล็กซ์', 'ข้อต่อตรง', 'ข้องอ 90', 'กิ๊บจับท่อ', 'แคล้มก้ามปู',
  'กาวแท่ง', 'ปืนยิงกาวร้อน', 'ปืนกาว', 'กาวร้อน', 'กาวซิลิโคน', 'กาวตราช้าง', 'กาวดักหนู', 'เทปพันสายไฟ',
  'หัวแร้งบัดกรีด้ามปืน', 'หัวแร้งบัดกรี', 'หัวแร้ง', 'ตะกั่วบัดกรี', 'ตะกั่วเส้น', 'น้ำยาประสานบัดกรี', 'ที่ดูดตะกั่ว',
  'เคเบิ้ลแกลนด์', 'เคเบิลแกลนด์', 'เคเบิ้ลไทร์', 'เคเบิลไทร์', 'สายรัดเคเบิ้ลไทร์', 'สายรัดสายไฟ', 'หางปลา', 'ปลอกสายไฟ',
  'สายไฟ VAF', 'สายไฟ VCT', 'สายไฟ THW', 'สายไฟ NYY', 'สายไฟอ่อน', 'สวิตช์ไฟ', 'เต้ารับกราวด์คู่', 'เบรกเกอร์',
  'พาวเวอร์ปลั๊ก', 'ปลั๊กไฟ', 'ปลั๊กพ่วง', 'รางปลั๊กไฟ',
  'GIANT KINGKONG', 'LEETECH', 'LUZINO', 'EAGLE', 'TAI-FONG', 'MATSUSHITA', 'PHILIPS', 'PANASONIC', 'SCHNEIDER', 'NANO', 'CHANG', 'HACO', 'YAZAKI', 'BCC',

  // Electronics & Microcontrollers
  'XL6009 DC-to-DC Step up Converter', 'Step up Converter', 'Step Down Converter',
  'Waterproof Ultrasonic Module เซนเซอร์วัดระยะทาง (JSN-SR04T)', 'Ultrasonic Module', 'JSN-SR04T',
  'โมดูลชาร์จถ่าน ป้องกันแบตเตอรี่ลิเธียม 18650', 'โมดูลชาร์จแบตเตอรี่ลิเธียมพลังงานแสงอาทิตย์',
  'ถ่านชาร์จ lithium battery แบตเตอรี่ลิเธียม 18650', 'แบตเตอรี่ลิเธียม',
  'Solar Cell โซลาร์เซลล์ 6V 6W', 'Solar Cell โซลาร์เซลล์', 'โซลาร์เซลล์',
  'โมดูล 4G LTE SIM7600A-H Development Board', 'SIM7600A-H Development Board',
  'ชุดอุปกรณ์ DIY อิเล็กทรอนิกส์สำหรับเริ่มต้น', 'ชุดอุปกรณ์ DIY อิเล็กทรอนิกส์',
  '22AWG สายไฟอ่อน สีแดง ไส้เต็ม 1 เมตร', '22AWG สายไฟอ่อน สีดำ ไส้เต็ม 1 เมตร',
  '18AWG สายไฟอ่อน สีแดง ไส้เต็ม 10 เมตร', '18AWG สายไฟอ่อน สีดำ ไส้เต็ม 10 เมตร',
  'Camera Module (OV7670)', 'OV7670',
  'ESP32 NodeMCU ESP-WROOM-32 Development Board', 'ESP-WROOM-32 Development Board', 'ESP32 NodeMCU',

  // Stationery & Office Supplies
  'กระดาษถ่ายเอกสาร A4', 'กระดาษถ่ายเอกสาร', 'กระดาษพิมพ์งาน', 'กระดาษการ์ด', 'กระดาษโน้ต',
  'กระดาษต่อเนื่อง', 'กระดาษชำระ', 'กระดาษทิชชู่', 'กระดาษคาร์บอน',
  'แฟ้มห่วง', 'แฟ้มสันกว้าง', 'แฟ้มซอง', 'แฟ้มหนีบ', 'แฟ้มเอกสาร',
  'ปากกาลูกลื่น', 'ปากกาหมึกเจล', 'ปากกาเน้นข้อความ', 'ปากกาเคมี', 'ปากกาไวท์บอร์ด', 'ดินสอดำ',
  'ยางลบ', 'น้ำยาลบคำผิด', 'เทปลบคำผิด', 'ไม้บรรทัด', 'กรรไกร', 'มีดคัตเตอร์', 'ใบมีดคัตเตอร์',
  'ลวดเย็บกระดาษ', 'เครื่องเย็บกระดาษ', 'เครื่องเจาะกระดาษ', 'คลิปหนีบกระดาษ', 'คลิปดำ',
  'เทปใส', 'เทปใสแกนเล็ก', 'เทปกาวสองหน้า', 'เทปผ้า', 'เทปกระดาษกาวย่น', 'กาวน้ำ',
  'ซองจดหมาย', 'ซองเอกสารสีน้ำตาล', 'ซองขยายข้าง', 'สมุดบันทึก', 'สมุดบัญชี', 'โพสต์อิท',

  // IT & Computer Supplies
  'ตลับหมึกพิมพ์', 'ตลับหมึก', 'หมึกพิมพ์', 'ผงหมึกโทนเนอร์', 'หมึกอิงค์เจ็ท', 'ริบบอน',
  'แฟลชไดร์ฟ', 'ฮาร์ดดิสก์', 'การ์ดหน่วยความจำ', 'สายชาร์จ', 'สายสัญญาณ', 'สายแลน', 'สายต่อพ่วง',
  'แป้นพิมพ์', 'คีย์บอร์ด', 'เมาส์ไร้สาย', 'แผ่นรองเมาส์',
  'แบตเตอรี่', 'ถ่านอัลคาไลน์', 'ถ่านไฟฉาย', 'ซองใส่บัตร', 'สายคล้องบัตร'
];

export const MASTER_VENDOR_DICTIONARY = [
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
  'บริษัท ซีพี ออลล์ จำกัด (มหาชน)',
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
  'บริษัท แหลมฉบังเครื่องเขียน 1995 จำกัด',
  'บริษัท แหลมฉบังเครื่องเขียน จำกัด',
  'หจก. แหลมฉบังเครื่องเขียน 1995',
  'บริษัท อุดมผลเครื่องเขียน จำกัด',
  'บริษัท นานมี จำกัด',
  'บริษัท ดีเอชเอ สยามวาลา จำกัด',
  'บริษัท สมใจ สเตชั่นเนอรี่ จำกัด',
  'Shopee Official Store',
  'Lazada Official Store',
  'TikTok Shop'
];

export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

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

/**
 * Generic Linguistic Thai & English Character Normalizer
 * Performs character-level OCR repair, vowel alignment, spacing, and symbol cleanup
 * WITHOUT mutating arbitrary words or forcing unfamiliar products into specific models.
 */
export function correctTechnicalThaiAndEnglishText(str: string): string {
  if (!str) return '';
  let text = str;

  // 1. Clean leading junk symbols (#, /, -, ((, stray punctuation, etc.)
  text = text
    .replace(/^[#\/\-\*\+\:\.\s\|«»“”~_`^{}]+/g, '')
    .replace(/^\(\s*\(/g, '(')
    .replace(/\)\s*\)/g, ')');

  // 2. Thai Character-Level Linguistic Repairs
  // Broken Sara-Ae: เ + เ -> แ
  text = text.replace(/\u0e40\u0e40/g, '\u0e41');
  // Broken Sara-Am: ํ + า -> ำ
  text = text.replace(/\u0e4d\u0e32/g, '\u0e33');
  // Detached upper/lower vowels & tone marks
  text = text.replace(/([ก-ฮ])\s+([\u0e31\u0e34-\u0e3a\u0e47-\u0e4e])/g, '$1$2');
  // Leading dangling tone marks/vowels
  text = text.replace(/^[\u0e31\u0e34-\u0e3a\u0e47-\u0e4e]+/g, '');

  // 3. Spacing around common units & technical specifications
  text = text
    .replace(/([ก-๙a-zA-Z])(\d+(?:\.\d+)?(?:sq\.?mm|ตร\.?มม\.?|มม\.?|ซม\.?|เมตร|mm|cm|kg|ml|oz|v|w|g|l))\b/gi, '$1 $2')
    .replace(/\b(\d+(?:\.\d+)?(?:sq\.?mm|ตร\.?มม\.?|มม\.?|ซม\.?|เมตร|mm|cm|kg|ml|oz|v|w|g|l))([ก-๙a-zA-Z])/gi, '$1 $2')
    .replace(/\b(\d+)\s*mเห\b/gi, '$1 mm');

  // 4. Common Thai OCR Ligature & Corporate Typo Corrections (Universal)
  text = text
    .replace(/บหาชน/g, 'มหาชน')
    .replace(/จำกัค|จำกัต|จํากัด/g, 'จำกัด')
    .replace(/บรษท/g, 'บริษัท')
    .replace(/หจก(?!\.)/g, 'หจก.')
    .replace(/ปลิ๊ก|ปลื๊ก|บลั๊ก|ปลัก(?!ๆ)/g, 'ปลั๊ก')
    .replace(/ใส้เต็ม/g, 'ไส้เต็ม')
    .replace(/สวิทช์/g, 'สวิตช์')
    .replace(/กันน[ำา\u0e4d\u0e32]*/g, 'กันน้ำ');

  // 5. Restore balanced parentheses for model specifications
  const openCount = (text.match(/\(/g) || []).length;
  const closeCount = (text.match(/\)/g) || []).length;
  if (openCount > closeCount) {
    text = text + ')'.repeat(openCount - closeCount);
  }

  // 6. General whitespace & border artifact cleanup
  return text
    .replace(/[«»“”~_`^{}|]+/g, ' ')
    .replace(/\.{2,}/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function cleanThaiText(str: string): string {
  let cleaned = str
    .replace(/^([!\?\.\-\|\+:งv\s]*\d{1,2}\s*[v\|\.\-\:\)\s]+)/gi, '')
    .replace(/^[!\?\.\-\|\+:งv\s]+/gi, '')
    .replace(/[ฒณ|\[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let text = correctTechnicalThaiAndEnglishText(cleaned);
  text = text.replace(/^[0-9A-Za-z\u0e00-\u0e7f]{2,10}(?=ปลั๊ก|สายไฟ|สวิตช์|แผ่น|โมดูล|ตู้)/i, '');
  return text.replace(/\s+/g, ' ').trim();
}

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
    .replace(/[«»“”"’'\?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
}

export function cleanCompanyName(name: string): string {
  let cleaned = cleanThaiText(name)
    .replace(/บหาชน/g, 'มหาชน')
    .replace(/จำกัค/g, 'จำกัด')
    .replace(/จำกัต/g, 'จำกัด')
    .replace(/จํากัด/g, 'จำกัด');

  if (/(?:บริษัท|หจก\.|หจก|ร้าน|ห้างหุ้นส่วน|ศูนย์|สำนักงาน|Co\.,?\s*Ltd|Inc\.|Corp\.|Ltd\.)/i.test(cleaned)) {
    cleaned = cleaned.replace(/^.*?(?=(?:บริษัท|หจก|ร้าน|ห้าง|ศูนย์|สำนักงาน|Co\.,?\s*Ltd|Inc\.|Corp\.|Ltd\.))/i, '');
  }

  cleaned = cleaned.replace(/[\s\(\[\{]*(?:ใบกำกับ|ใบเสร็จ|ใบกําก|รีอรับ|รับเงิน|Tax\s*Invoice|Receipt).*/i, '').trim();

  const jamkatMatch = cleaned.match(/(จำกั[ดคตกัดุ]|จํากัด)/i);
  if (jamkatMatch) {
    const idx = cleaned.indexOf(jamkatMatch[1]);
    if (idx >= 0) {
      const afterJamkat = cleaned.substring(idx + jamkatMatch[1].length).trim();
      const beforeJamkat = cleaned.substring(0, idx);
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

  cleaned = cleaned.replace(/[ใไเแโใไ]*[<>]+.*/g, '').replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/[\s]*[a-zใไเแโๆํัิีึืุู็่้๊๋์ํ๎]{1,2}[\s]*$/gi, '').trim();

  return fuzzyCorrectVendorName(cleaned);
}

export function extractVendorNameFromText(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines.slice(0, 15)) {
    if (/(?:บริษัท|หจก\.|หจก|ร้าน|ห้างหุ้นส่วน|ศูนย์|สำนักงาน|Co\.,?\s*Ltd|Inc\.|Corp\.|Ltd\.)/i.test(line)) {
      if (!/ใบกำกับภาษี|ใบเสร็จรับเงิน|Tax Invoice|Receipt/i.test(line)) {
        const cleaned = cleanCompanyName(cleanThaiText(line));
        if (cleaned.length >= 4) return cleaned;
      }
    }
  }

  for (const line of lines.slice(0, 15)) {
    if (/ไทวัสดุ|ซีอาร์ซี|ซีโอแอล|OfficeMate|B2S|HomePro|DoHome|Global|IT CITY|Advice|MR\.?DIY|Big C|Lotus|7-Eleven|CRC|COL|ซีพี\s*แอ็กซ์ตร้า|CP\s*AXTRA|Makro|แม็คโคร/i.test(line)) {
      if (!/ใบกำกับภาษี|ใบเสร็จ/i.test(line)) {
        const cleaned = cleanCompanyName(cleanThaiText(line));
        if (cleaned.length >= 3) return cleaned;
      }
    }
  }

  for (const line of lines.slice(0, 10)) {
    const cleanLine = cleanCompanyName(cleanThaiText(line));
    if (
      cleanLine.length >= 4 &&
      !/ใบกำกับภาษี|ใบเสร็จ|หน้าที่|ต้นฉบับ|สำเนา|เลขที่|วันที่|INV|TAX|POS|RECEIPT/i.test(cleanLine) &&
      !/หมู่ที่|ตำบล|อำเภอ|จังหวัด|ถนน|ซอย|แขวง|เขต|เลขที่|โทร|TEL|FAX/i.test(cleanLine) &&
      /[ก-ฮa-zA-Z]{3,}/.test(cleanLine)
    ) {
      return cleanLine;
    }
  }

  return '';
}

export function extractTaxId13Digits(text: string): string {
  const lines = text.split('\n');
  for (const line of lines) {
    const match = line.match(/(?:เลขประจำตัวผู้เสียภาษี|ผู้เสียภาษี|TAX\s*ID|TAX\s*NO)[\s\:\#\-]*(\d[\d\-\s]{12,18}\d)/i);
    if (match) {
      const digitsOnly = match[1].replace(/[\-\s]/g, '');
      if (digitsOnly.length === 13) return digitsOnly;
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
  confidence?: number;
}

export function reconstructTextFromBboxes(words: TesseractWord[]): string {
  if (!words || words.length === 0) return '';

  const sortedWords = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0);
  const rows: TesseractWord[][] = [];
  let currentRow: TesseractWord[] = [sortedWords[0]];

  for (let i = 1; i < sortedWords.length; i++) {
    const word = sortedWords[i];
    let sumY0 = 0, sumY1 = 0;
    for (const w of currentRow) {
      sumY0 += w.bbox.y0;
      sumY1 += w.bbox.y1;
    }
    const avgY0 = sumY0 / currentRow.length;
    const avgY1 = sumY1 / currentRow.length;

    const overlapStart = Math.max(avgY0, word.bbox.y0);
    const overlapEnd = Math.min(avgY1, word.bbox.y1);
    const overlapHeight = overlapEnd - overlapStart;

    const wordHeight = word.bbox.y1 - word.bbox.y0;
    const rowHeight = avgY1 - avgY0;
    const minHeight = Math.min(wordHeight, rowHeight);

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

  const rebuiltLines: string[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    let lineText = '';
    let lastX = row[0].bbox.x0;

    for (let i = 0; i < row.length; i++) {
      const word = row[i];
      const prevWord = i > 0 ? row[i - 1] : null;
      const gap = word.bbox.x0 - lastX;

      // If previous word and current word are pure digits with narrow gap (< 22px),
      // merge them together so 13-digit barcodes aren't split by font kerning!
      if (prevWord && /^\d+$/.test(prevWord.text) && /^\d+$/.test(word.text) && gap < 22) {
        lineText += word.text;
      } else if (i > 0 && gap > 28) {
        lineText += '    ';
        lineText += word.text;
      } else if (i > 0) {
        lineText += ' ';
        lineText += word.text;
      } else {
        lineText += word.text;
      }
      lastX = word.bbox.x1;
    }
    rebuiltLines.push(lineText.trim());
  }

  return rebuiltLines.join('\n');
}

export interface ParsedReceiptItem {
  item_code: string;
  description: string;
  thai_name?: string;
  english_name?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount?: number;
  total_price: number;
}

export interface ParsedReceipt {
  vendor_name: string;
  tax_id?: string;
  invoice_number: string;
  invoice_date: string;
  discount?: number;
  total_amount: number;
  items: ParsedReceiptItem[];
  reconciliation?: {
    subtotal: number;
    totalAmount: number;
    discount: number;
    vatAmount?: number;
    isMatched: boolean;
    discrepancy: number;
  };
}

/**
 * Mathematical Constraint Solver for Line Items & Invoices
 */
export function solveMathematicalConstraints(
  items: ParsedReceiptItem[],
  extractedGrandTotal: number,
  extractedDiscount: number
) {
  const balancedItems = items.map((item) => {
    let q = item.quantity || 1;
    let u = item.unit_price || 0;
    let t = item.total_price || 0;

    const calcTotal = Math.round(q * u * 100) / 100;
    if (Math.abs(calcTotal - t) < 0.05) {
      return { ...item, quantity: q, unit_price: u, total_price: t };
    }

    if (u === 0 || (u === t && q > 1)) {
      u = Math.round((t / q) * 100) / 100;
      return { ...item, quantity: q, unit_price: u, total_price: t };
    }

    const expectedTotal = Math.round(q * u * 100) / 100;
    if (expectedTotal > 0 && Math.abs(expectedTotal - t) < 100) {
      return { ...item, quantity: q, unit_price: u, total_price: expectedTotal };
    }

    if (t > 0 && q > 0) {
      u = Math.round((t / q) * 100) / 100;
    }

    return { ...item, quantity: q, unit_price: u, total_price: t };
  });

  const calculatedSum = Math.round(balancedItems.reduce((s, i) => s + (i.total_price || 0), 0) * 100) / 100;
  let finalGrandTotal = extractedGrandTotal;
  let finalDiscount = extractedDiscount;

  if (finalGrandTotal <= 0 && calculatedSum > 0) {
    finalGrandTotal = calculatedSum - (finalDiscount || 0);
  } else if (finalGrandTotal > 0 && calculatedSum > 0) {
    if (Math.abs(calculatedSum - finalGrandTotal) < 1.0) {
      // Perfect match between items sum and extracted total
      finalGrandTotal = calculatedSum;
      finalDiscount = 0;
    } else if (finalDiscount > 0 && Math.abs((calculatedSum - finalDiscount) - finalGrandTotal) < 1.0) {
      // Verified explicit discount matching the total
    } else if (finalDiscount === 0) {
      // No explicit discount was found on the bill. Do not fabricate phantom discounts.
      finalGrandTotal = calculatedSum;
    }
  }

  let vatAmount = 0;
  const withVat7 = Math.round(calculatedSum * 1.07 * 100) / 100;
  if (finalGrandTotal > 0 && Math.abs(withVat7 - finalGrandTotal) < 0.10) {
    vatAmount = Math.round((finalGrandTotal - calculatedSum) * 100) / 100;
  }

  const isMatched = Math.abs((calculatedSum - finalDiscount) - finalGrandTotal) < 0.05 ||
                    Math.abs((calculatedSum + vatAmount - finalDiscount) - finalGrandTotal) < 0.05;

  return {
    items: balancedItems,
    subtotal: calculatedSum,
    discount: finalDiscount,
    vatAmount,
    grandTotal: finalGrandTotal,
    isMatched,
    discrepancy: Math.round((calculatedSum - finalGrandTotal) * 100) / 100
  };
}

/**
 * Header Line Detector
 * Strictly prevents company headers, branch numbers, page counts, phone numbers,
 * tax IDs, addresses, and postal codes from ever being parsed as product items.
 */
export function isHeaderLine(line: string): boolean {
  const l = line.trim();
  if (!l || l.length < 2) return true;

  // 1. Company / Store Header
  if (/(?:บริษัท|หจก\.|หจก|ร้านค้า|ร้าน|ห้างหุ้นส่วน|ห้างฯ|สมาคม|มูลนิธิ|Co\.,?\s*Ltd|Inc\.|Corp\.|Ltd\.)/i.test(l)) {
    return true;
  }
  // 2. Branch (avoid \b after Thai characters)
  if (/(?:สาขา|สาขาที่|Branch)(?:\s|:|\d|$)/i.test(l)) {
    return true;
  }
  // 3. Tax ID / VAT Registration
  if (/(?:เลขประจำตัวผู้เสียภาษี|ผู้เสียภาษี|TAX\s*ID|TAX\s*NO|ภ\.พ\.20)/i.test(l)) {
    return true;
  }
  // 4. Document Types & Page Numbers
  if (/(?:ใบกำกับภาษี|ใบเสร็จรับเงิน|Tax\s*Invoice|Receipt|ต้นฉบับ|สำเนา|เอกสารออกเป็นชุด|หน้าที่|หน้า\s*\d|Page\s*\d)/i.test(l)) {
    return true;
  }
  // 5. Address / Location (including Thai abbreviations ต. อ. จ. ม. ถ. ซ.)
  if (/(?:ที่อยู่|ม\.\s*\d|หมู่\s*\d|ต\.|ตำบล|อ\.|อำเภอ|จ\.|จังหวัด|แขวง|เขต|กทม|กรุงเทพ|ถนน|ถ\.|ซอย|ซ\.|รหัสไปรษณีย์|Address)/i.test(l)) {
    return true;
  }
  // 6. Postal Code at end of line (e.g. "จ.ชลบุรี 20230")
  if (/\b\d{5}$/.test(l) && /(?:ชลบุรี|กรุงเทพ|เชียงใหม่|ระยอง|นนทบุรี|ปทุมธานี|สมุทร|[ก-๙]{3,})/i.test(l)) {
    return true;
  }
  // 7. Contact / Telecom
  if (/(?:โทรศัพท์|โทรสาร|โทร\.|โทร\s|Tel|Fax|Email|Website|WWW)/i.test(l)) {
    return true;
  }
  // 8. Customer / Buyer
  if (/(?:ผู้ซื้อ|ลูกค้า|นามผู้ซื้อ|Customer|Bill\s*To|Ship\s*To)/i.test(l)) {
    return true;
  }
  // 9. Document Number / Date
  if (/(?:เลขที่ใบกำกับ|เลขที่ใบเสร็จ|เลขที่เอกสาร|Invoice\s*No|Doc\s*No|วันที่|Date)/i.test(l)) {
    return true;
  }
  // 10. Bare Date lines e.g. "11/08/2569"
  if (/^\s*(?:วันที่\s*)?\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\s*$/.test(l)) {
    return true;
  }

  return false;
}

/**
 * Summary and Footer Line Detector
 * Strictly prevents payment terms, totals, VAT calculations, and signature lines from entering the items table.
 */
export function isSummaryOrFooterLine(line: string): boolean {
  return /(?:รวมเป็นเงิน|รวมเงิน|ยอดรวม|มูลค่าสินค้า|ฐานภาษี|ภาษีมูลค่าเพิ่ม|ยอดเงินสุทธิ|จำนวนเงินทั้งสิ้น|ยอดสุทธิ|ยอดชำระ|จำนวนเงินรวม|ราคารวม|จำนวนชิ้นรวม|SUBTOTAL|TOTAL|GRAND TOTAL|VAT|TAX|NET TOTAL|TOTAL DUE|BALANCE|เงื่อนไข|สินค้าสั่งพิเศษ|ใบเสร็จรับเงินนี้จะสมบูรณ์|ผู้รับเงิน|ผู้จ่ายเงิน|CASHIER|เงินสด|ทอนเงิน|CHANGE)/i.test(line);
}

/**
 * Split and Format Mixed Thai and English Product Names
 * e.g. "ARO KITCHEN TOWEL เอโร่ กระดาษอเนกประสงค์"
 * -> thai: "เอโร่ กระดาษอเนกประสงค์", english: "ARO KITCHEN TOWEL", formatted: "เอโร่ กระดาษอเนกประสงค์ (ARO KITCHEN TOWEL)"
 */
export function splitThaiAndEnglishName(raw: string): {
  thai: string;
  english: string;
  formatted: string;
} {
  let s = raw.trim().replace(/\s+/g, ' ');
  const hasThai = /[\u0e00-\u0e7f]/.test(s);
  const hasEnglish = /[A-Za-z]/.test(s);

  if (!hasThai || !hasEnglish) {
    return { thai: hasThai ? s : '', english: hasEnglish ? s : '', formatted: s };
  }

  // Check for explicit delimiter: "/" or "|"
  const delimMatch = s.match(/^([A-Za-z0-9\s\.\&\+\-]+?)\s*[\/\|]\s*([\u0e00-\u0e7f0-9\s\.\&\+\-]+)$/);
  if (delimMatch) {
    const p1 = delimMatch[1].trim();
    const p2 = delimMatch[2].trim();
    const eng = /[A-Za-z]/.test(p1) ? p1 : p2;
    const th = /[\u0e00-\u0e7f]/.test(p2) ? p2 : p1;
    return { thai: th, english: eng, formatted: `${th} (${eng})` };
  }

  // Case A: English block at start, Thai block at end (e.g. Makro product naming)
  const engStartMatch = s.match(/^([A-Za-z0-9][A-Za-z0-9\s\.\&\+\-\/]{1,40})\s+([\u0e00-\u0e7f][\u0e00-\u0e7f0-9\s\.\&\+\-\/]*)$/);
  if (engStartMatch) {
    const eng = engStartMatch[1].trim();
    const th = engStartMatch[2].trim();
    if (eng.length >= 2 && th.length >= 2 && !/[\u0e00-\u0e7f]/.test(eng)) {
      return { thai: th, english: eng, formatted: `${th} (${eng})` };
    }
  }

  // Case B: Thai block at start, English block at end
  const thaiStartMatch = s.match(/^([\u0e00-\u0e7f][\u0e00-\u0e7f0-9\s\.\&\+\-\/]*?)\s+([A-Za-z][A-Za-z0-9\s\.\&\+\-\/]{1,40})$/);
  if (thaiStartMatch) {
    const th = thaiStartMatch[1].trim();
    const eng = thaiStartMatch[2].trim();
    if (th.length >= 2 && eng.length >= 2 && !/[A-Za-z]/.test(th)) {
      return { thai: th, english: eng, formatted: `${th} (${eng})` };
    }
  }

  return { thai: s, english: '', formatted: s };
}

/**
 * Universal Tail-Token Line Item Parser
 * Parses line items by analyzing numeric columns from the tail of the line.
 * Works seamlessly across any store, product domain, or column structure.
 */
export function parseUniversalItemLine(rawLine: string): ParsedReceiptItem | null {
  if (isHeaderLine(rawLine) || isSummaryOrFooterLine(rawLine)) {
    return null;
  }

  let line = correctTechnicalThaiAndEnglishText(rawLine);
  if (!line || line.length < 3) return null;

  // Strip trailing VAT / tax category indicators: " V", " N", " T", " B", " E", " 7%", " 0%", " *", " #"
  line = line.replace(/[\s|]+(?:[VvNnBbTtEeXx\*#]|7%|0%)[\s|]*$/g, '');
  line = line.replace(/(\d+(?:\.\d{1,2}))[VvNnBbTtEeXx\*#]$/g, '$1');

  // Strip leading line index e.g. "1." or "1)" or "1 "
  line = line.replace(/^\s*\d{1,3}[\.\)\s]+/, '').trim();

  // Extract leading Barcode (8-14 digits) or SKU
  let item_code = '';
  const gluedMatch = line.match(/^\s*(?:(\d{1,2})[\s\.\)]*)?(\d{13})\s+(.+)$/);
  if (gluedMatch) {
    item_code = gluedMatch[2];
    line = gluedMatch[3].trim();
  } else {
    const splitMatch = line.match(/^\s*(?:(\d{1,2})[\s\.\)]+)?(\d{4,7})\s+(\d{5,8})\s+(.+)$/);
    if (splitMatch && splitMatch[2].length + splitMatch[3].length >= 12 && splitMatch[2].length + splitMatch[3].length <= 14) {
      item_code = splitMatch[2] + splitMatch[3];
      line = splitMatch[4].trim();
    } else {
      const barcodeMatch = line.match(/^(\d{8,14})\s*(.+)$/);
      if (barcodeMatch) {
        item_code = barcodeMatch[1];
        line = barcodeMatch[2].trim();
      } else {
        const skuMatch = line.match(/^([A-Za-z0-9\-]{4,15})\s+(.+)$/);
        if (skuMatch && !/^(?:TOTAL|VAT|PRICE|QTY|ITEM|DOC|INV|ORDER)$/i.test(skuMatch[1])) {
          item_code = skuMatch[1];
          line = skuMatch[2].trim();
        }
      }
    }
  }

  // Pattern 1: With "@" symbol e.g. [Desc] [Qty] [Unit?] @ [UnitPrice] [Amount]
  const atMatch = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(?:([ก-๙a-zA-Z]{1,10})\s*)?@\s*(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)$/);
  if (atMatch) {
    const rawDesc = atMatch[1].trim();
    const qty = parseFloat(atMatch[2]);
    let unit = atMatch[3] || 'ชิ้น';
    const unitPrice = parseFloat(atMatch[4]);
    const totalAmount = parseFloat(atMatch[5]);

    const names = splitThaiAndEnglishName(rawDesc);
    return {
      item_code,
      description: names.formatted,
      thai_name: names.thai || undefined,
      english_name: names.english || undefined,
      quantity: qty,
      unit,
      unit_price: unitPrice,
      total_price: totalAmount
    };
  }

  // Pattern 2: Standard whitespace tokenization from tail
  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;

  const cleanNum = (t: string) => {
    if (!t) return null;
    const cleaned = t.replace(/,/g, '').replace(/\.-$/, '.00');
    if (/^\d+(?:\.\d{1,3})?$/.test(cleaned)) {
      const v = parseFloat(cleaned);
      return !isNaN(v) && v >= 0 ? v : null;
    }
    return null;
  };

  const lastToken = tokens[tokens.length - 1];
  const lastPrice = cleanNum(lastToken);
  if (lastPrice === null || lastPrice <= 0) {
    return null;
  }

  let total_price = lastPrice;
  let unit_price = 0;
  let discount = 0;
  let unit = 'ชิ้น';
  let quantity = 1;
  let descTokensEndIndex = tokens.length - 1;

  const t2 = tokens.length >= 3 ? cleanNum(tokens[tokens.length - 2]) : null;
  const t3 = tokens.length >= 4 ? cleanNum(tokens[tokens.length - 3]) : null;
  const t4 = tokens.length >= 5 ? cleanNum(tokens[tokens.length - 4]) : null;

  // Case 1: [Desc] [Qty] [Unit] [Price] [Discount] [Amount]
  if (t2 !== null && t3 !== null) {
    const unitCand = tokens[tokens.length - 4];
    const qtyCand = tokens.length >= 5 ? cleanNum(tokens[tokens.length - 5]) : null;

    if (qtyCand !== null && qtyCand > 0 && unitCand && !/^\d+(?:\.\d+)?$/.test(unitCand)) {
      unit_price = t3;
      discount = t2;
      unit = unitCand;
      quantity = qtyCand;
      descTokensEndIndex = tokens.length - 5;
    } else if (t4 !== null && t4 > 0) {
      quantity = t4;
      unit_price = t3;
      discount = t2;
      descTokensEndIndex = tokens.length - 4;
    } else {
      unit_price = t2;
      descTokensEndIndex = tokens.length - 2;
    }
  } else if (t2 !== null) {
    // Case 2: [Desc] [Qty] [Unit] [Price] [Amount]
    const unitCand = tokens.length >= 4 ? tokens[tokens.length - 3] : null;
    const qtyCand = tokens.length >= 4 ? cleanNum(tokens[tokens.length - 4]) : null;

    if (qtyCand !== null && qtyCand > 0 && unitCand && !/^\d+(?:\.\d+)?$/.test(unitCand)) {
      unit_price = t2;
      unit = unitCand;
      quantity = qtyCand;
      descTokensEndIndex = tokens.length - 4;
    } else if (t3 !== null && t3 > 0) {
      quantity = t3;
      unit_price = t2;
      descTokensEndIndex = tokens.length - 3;
    } else {
      unit_price = t2;
      descTokensEndIndex = tokens.length - 2;
    }
  } else {
    unit_price = total_price;
    descTokensEndIndex = tokens.length - 1;
  }

  let rawDesc = tokens.slice(0, descTokensEndIndex).join(' ').trim();
  if (!rawDesc) return null;

  // Dynamic unit normalization
  if (/^แพ[ค็ค]+10$/i.test(unit)) unit = 'แพ็ค (10 ด้าม)';
  else if (/^แพ[ค็ค]+/i.test(unit)) unit = 'แพ็ค';
  else if (unit === 'ชิ้น' || !unit) {
    if (/กล่อง/i.test(rawDesc)) unit = 'กล่อง';
    else if (/ถุง/i.test(rawDesc)) unit = 'ถุง';
    else if (/เมตร/i.test(rawDesc)) unit = 'เมตร';
    else if (/ม้วน/i.test(rawDesc)) unit = 'ม้วน';
    else if (/ชุด/i.test(rawDesc)) unit = 'ชุด';
    else if (/ขวด/i.test(rawDesc)) unit = 'ขวด';
    else if (/จาน/i.test(rawDesc)) unit = 'จาน';
    else if (/แก้ว/i.test(rawDesc)) unit = 'แก้ว';
    else if (/แผ่น/i.test(rawDesc)) unit = 'แผ่น';
    else if (/เครื่อง/i.test(rawDesc)) unit = 'เครื่อง';
    else unit = 'ชิ้น';
  }

  // Math rebalancing
  if (unit_price === 0 && quantity > 0 && total_price > 0) {
    unit_price = Math.round((total_price / quantity) * 100) / 100;
  }

  const names = splitThaiAndEnglishName(rawDesc);

  return {
    item_code,
    description: names.formatted,
    thai_name: names.thai || undefined,
    english_name: names.english || undefined,
    quantity,
    unit,
    unit_price,
    discount: discount > 0 ? discount : undefined,
    total_price
  };
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
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  let vendor_name = '';
  let invoice_number = '';
  let invoice_date = '';
  let total_amount = 0;
  let discount_val = 0;
  const items: ParsedReceiptItem[] = [];

  const excludeKeywords = [
    'ชำระเงินโดย', 'ชำระเงิน', 'ชำระโดย', 'VISA', 'MASTER', 'CASH', 'เงินสด', 'เงินทอน', 'PAYMENT', 'CREDIT',
    'CHANGE', 'SUBTOTAL', 'GRAND TOTAL', 'TOTAL', 'ยอดรวม', 'ราคารวม', 'รวมทั้งสิ้น', 'รวมทั้งสิ้นบาท', 'รวมเงิน',
    'ภาษีมูลค่าเพิ่ม', 'VAT', 'TAX ID', 'TAX NO', 'THANK YOU', 'ขอบคุณ', 'ยินดีต้อนรับ', 'WELCOME',
    'สาขา', 'POS', 'MEMBER', 'สมาชิก', 'หน้าที่', 'ต้นฉบับ', 'สำเนา', 'เอกสารออกเป็นชุด', 'บาท', 'BAHT',
    'สินค้าที่มีภาษี', 'สินค้าที่ไม่มีภาษี', 'สินค้าไม่มีภาษี', 'สินค้าที่ยกเว้น', 'สินค้าที่เสีย', 'สินค้าที่ได้รับยกเว้น', 'มูลค่าสินค้า', 'มูลค่าภาษี', 'ภาษี 7%', 'ภาษี7%',
    'จำนวนรวม', 'รวมรายการ', 'ราคาสินค้า', 'ส่วนลด', 'DISCOUNT', 'พนักงานขาย', 'CASHIER', 'เวลา', 'TIME',
    'โทร', 'TEL', 'FAX', 'EMAIL', 'อีเมล', 'เว็บไซต์', 'WWW', 'HTTP', 'NET TOTAL', 'NET AMOUNT',
    'ที่อยู่', 'ผู้ซื้อ', 'ผู้ขาย', 'หมู่ที่', 'ตำบล', 'อำเภอ', 'จังหวัด', 'ถนน', 'ซอย', 'แขวง', 'เขต', 'รหัสไปรษณีย์',
    'เลขประจำตัวผู้เสียภาษี', 'สำนักงานใหญ่', 'เลขที่ใบเสร็จ', 'เลขที่ใบกำกับ', 'วันที่', 'DATE', 'แบสลี',
    'รายละเอียด', 'ราคา/หน่วย', 'รวม (บาท)', 'รหัสสินค้า', 'จำนวน', 'หน่วยละ', 'จำนวนเงิน', 'DESCRIPTION', 'QTY', 'PRICE', 'AMOUNT', 'ITEM',
    'ORDER NO', 'ORDER', 'ลำดับ', 'รายการ', 'ชื่อสินค้า', 'รายละเอียดสินค้า', 'NO.', 'รหัส', 'หน่วย', 'มูลค่า',
    'รวมยอดขาย', 'มูลค่าฐานภาษี', 'มูลค่าตามใบกำกับภาษี', 'ยอดขาย', 'ยอดสุทธิ',
    'ใบกำกับภาษี', 'ใบเสร็จรับเงิน', 'Tax Invoice', 'Receipt', 'INVOICE', 'DOCUMENT'
  ];

  if (headerText) {
    vendor_name = extractVendorNameFromText(headerText);
  }
  if (!vendor_name) {
    vendor_name = extractVendorNameFromText(text);
  }

  for (const line of lines) {
    // Avoid matching document title headers like "(RECEIPT/TAX INVOICE)"
    if (/\((?:RECEIPT|TAX\s*INVOICE)[^\)]*\)/i.test(line)) continue;

    const match = line.match(
      /(?:เลขที่เอกสาร|เลขที่ใบกำกับภาษี|เลขที่ใบกำกับ|เลขที่ใบเสร็จ|เลขที่|Tax\s*Invoice\s*No\.?|TAX\s*INV(?:\.|\s*NO)?|TAX\s*NO\.?|INV\s*NO\.?|DOC\s*NO\.?|Document\s*No\.?|TIV|No\.?)[^\w\d]*([A-Z0-9\/\-]{4,25})/i
    );
    if (
      match &&
      match[1] &&
      !/^\d{13}$/.test(match[1]) &&
      !/^(?:COMPANY|LIMITED|TAX|BRANCH|PAGE|ORIGINAL|COPY|INVOICE|RECEIPT|OICE)$/i.test(match[1])
    ) {
      invoice_number = match[1];
      break;
    }
  }

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

    const textDateMatch = line.match(/(?:วันที่\s*)?(\d{1,2})\s*([ก-๙a-zA-Z\.\s]{2,15}?)\s*(\d{2,4})/);
    if (textDateMatch) {
      const d = parseInt(textDateMatch[1], 10);
      const monthStr = textDateMatch[2].trim();
      let y = parseInt(textDateMatch[3], 10);

      if (d >= 1 && d <= 31 && monthStr.length >= 2) {
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

  // 1. Locate Structural Boundaries (Zonal Segmentation)
  let tableHeaderIndex = -1;
  let summaryAnchorIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    // Detect Table Header Row
    if (tableHeaderIndex === -1) {
      if (
        /(?:ลำดับ|NO\.|ITEM|SKU|รหัส|รายการ|รายละเอียด|คำอธิบาย|DESCRIPTION|ชื่อสินค้า|BARCODE).*?(?:จำนวน|หน่วย|ราคา|จำนวนเงิน|QTY|UNIT|PRICE|AMOUNT|TOTAL)/i.test(l) ||
        /^(?:ลำดับ|No\.|Item|SKU|รหัสสินค้า|รายการ|รายละเอียด)\s/i.test(l) ||
        /^(?:BARCODE|DESCRIPTION|รหัสสินค้า|รายการสินค้า|ชื่อสินค้า|ลำดับ|NO\.)(?:\s*[\/\-]\s*(?:BARCODE|DESCRIPTION|รายการ|ชื่อสินค้า|\w+))*$/i.test(l)
      ) {
        tableHeaderIndex = i;
        continue;
      }
    }

    // Detect Summary Anchor Row (Strict boundary that permanently shuts down line item extraction)
    if (summaryAnchorIndex === -1 && (tableHeaderIndex === -1 || i > tableHeaderIndex)) {
      if (
        /(?:^|\s)(?:รวมเป็นเงิน|รวมเงิน|ยอดรวม|มูลค่าสินค้า|ฐานภาษี|ภาษีมูลค่าเพิ่ม|ยอดเงินสุทธิ|จำนวนเงินทั้งสิ้น|ยอดสุทธิ|ยอดชำระ|จำนวนเงินรวม|ราคารวม|SUBTOTAL|TOTAL|GRAND TOTAL|VAT|TAX|NET TOTAL|TOTAL DUE|BALANCE)(?:\s|:|$|\d)/i.test(l)
      ) {
        summaryAnchorIndex = i;
      }
    }
  }

  // Fallback: If no explicit table header keyword was present, find the first line matching an item row
  if (tableHeaderIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (summaryAnchorIndex !== -1 && i >= summaryAnchorIndex) break;
      if (isHeaderLine(lines[i])) continue;
      const testItem = parseUniversalItemLine(lines[i]);
      if (testItem) {
        tableHeaderIndex = Math.max(0, i - 1);
        break;
      }
    }
  }

  if (summaryAnchorIndex === -1) {
    summaryAnchorIndex = lines.length;
  }

  // 2. Extract Line Items strictly in the Table Body (between tableHeaderIndex and summaryAnchorIndex)
  let pendingBarcode = '';
  let pendingDesc = '';

  for (let i = tableHeaderIndex + 1; i < summaryAnchorIndex; i++) {
    const rawLine = lines[i];
    if (isHeaderLine(rawLine) || isSummaryOrFooterLine(rawLine)) continue;

    // Skip standalone table header lines
    if (
      /(?:ลำดับ|NO\.|ITEM|SKU|รหัส|รายการ|รายละเอียด|คำอธิบาย|DESCRIPTION|ชื่อสินค้า|BARCODE).*?(?:จำนวน|หน่วย|ราคา|จำนวนเงิน|QTY|UNIT|PRICE|AMOUNT|TOTAL)/i.test(rawLine) ||
      /^(?:BARCODE|DESCRIPTION|รหัสสินค้า|รายการสินค้า|ชื่อสินค้า|ลำดับ|NO\.)(?:\s*[\/\-]\s*(?:BARCODE|DESCRIPTION|รายการ|ชื่อสินค้า|\w+))*$/i.test(rawLine)
    ) {
      pendingBarcode = '';
      pendingDesc = '';
      continue;
    }

    const parsedItem = parseUniversalItemLine(rawLine);

    if (parsedItem) {
      if (pendingBarcode && !parsedItem.item_code) {
        parsedItem.item_code = pendingBarcode;
      }
      if (pendingDesc) {
        const merged = `${pendingDesc} ${parsedItem.description}`.trim();
        const sep = splitThaiAndEnglishName(merged);
        parsedItem.description = sep.formatted;
        parsedItem.thai_name = sep.thai || undefined;
        parsedItem.english_name = sep.english || undefined;
      }

      // Avoid duplicate row insertions
      const isDup = items.some(
        (existing) =>
          existing.description === parsedItem.description &&
          existing.total_price === parsedItem.total_price &&
          existing.quantity === parsedItem.quantity
      );
      if (!isDup) {
        items.push(parsedItem);
      }
      pendingBarcode = '';
      pendingDesc = '';
    } else {
      // Check if this line is a barcode or product title row before a price row (e.g. Makro multi-line format)
      const bcMatch = rawLine.match(/^(\d{8,14})\s*(.*)$/);
      if (bcMatch) {
        pendingBarcode = bcMatch[1];
        pendingDesc = bcMatch[2].trim();
      } else if (
        /[A-Za-zก-๙]{3,}/.test(rawLine) &&
        !/^\d+$/.test(rawLine) &&
        !excludeKeywords.some((kw) => rawLine.toUpperCase().includes(kw.toUpperCase()))
      ) {
        pendingDesc = pendingDesc ? `${pendingDesc} ${rawLine}` : rawLine;
      }
    }
  }

  // 3. Extract Summary Totals & VAT strictly from the Summary Zone (summaryAnchorIndex onwards)
  const summaryLines = lines.slice(summaryAnchorIndex);
  let summaryVat = 0;

  for (const l of summaryLines) {
    if (total_amount === 0) {
      const totMatch = l.match(/(?:ยอดสุทธิ|ยอดเงินสุทธิ|รวมทั้งสิ้น|จำนวนเงินทั้งสิ้น|ยอดชำระ|Grand\s*Total|Total|Net\s*Total)[^\d]*([\d,]+(?:\.\d{2}|\.-))/i);
      if (totMatch) {
        total_amount = parseFloat(totMatch[1].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
      }
    }

    if (summaryVat === 0) {
      const vatMatch = l.match(/(?:ภาษีมูลค่าเพิ่ม|VAT|ภาษี\s*7%)[^\d]*([\d,]+(?:\.\d{2}|\.-))/i);
      if (vatMatch) {
        summaryVat = parseFloat(vatMatch[1].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
      }
    }

    if (discount_val === 0) {
      const discMatch = l.match(/(?:ส่วนลด|Discount|หักส่วนลด)[^\d]*([\d,]+(?:\.\d{2}|\.-))/i);
      if (discMatch) {
        discount_val = parseFloat(discMatch[1].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
      }
    }
  }

  // 4. Mathematical Constraint Solver Reconciliation
  const mathSolution = solveMathematicalConstraints(items, total_amount, discount_val);

  return {
    vendor_name: vendor_name || 'ร้านค้า / บริษัทผู้ขาย',
    invoice_number: invoice_number || '',
    invoice_date: invoice_date || '',
    discount: mathSolution.discount,
    total_amount: mathSolution.grandTotal,
    items: mathSolution.items,
    reconciliation: {
      subtotal: mathSolution.subtotal,
      totalAmount: mathSolution.grandTotal,
      discount: mathSolution.discount,
      vatAmount: summaryVat || mathSolution.vatAmount,
      isMatched: mathSolution.isMatched,
      discrepancy: mathSolution.discrepancy
    }
  };
}

export interface DeepScanPassOutputsDeep5 {
  mainText: string;
  mainWords?: any[];
  sauvolaText?: string;
  sauvolaWords?: any[];
  headerText?: string;
  summaryText?: string;
}

export type DeepScanPassOutputs = DeepScanPassOutputsDeep5;

/**
 * DeepScan 5.0: Multi-Pass Spatial Consensus Fusion Engine
 * Fuses 4 crystal-clear visual layers + 2D Bounding-Box Spatial Grid, applies Lexicon 5.0,
 * and executes Multi-Hypothesis Math & VAT Constraint Solver.
 */
export function parseThaiReceiptOcrDeep5(passes: DeepScanPassOutputsDeep5): ParsedReceipt {
  // 1. Primary Parse from Main High-DPI Pass
  const mainParsed = parseThaiReceiptOcr(passes.mainText);

  // 1.1 Spatial 2D Parse from Main Pass
  let mainSpatialParsed: ParsedReceipt | null = null;
  if (passes.mainWords && passes.mainWords.length > 0) {
    const spatialText = reconstructTextFromBboxes(passes.mainWords);
    if (spatialText) mainSpatialParsed = parseThaiReceiptOcr(spatialText);
  }

  // 2. Secondary Parse from Sauvola Adaptive Pass
  const sauvolaParsed = passes.sauvolaText ? parseThaiReceiptOcr(passes.sauvolaText) : null;
  let sauvolaSpatialParsed: ParsedReceipt | null = null;
  if (passes.sauvolaWords && passes.sauvolaWords.length > 0) {
    const spatialSauvolaText = reconstructTextFromBboxes(passes.sauvolaWords);
    if (spatialSauvolaText) sauvolaSpatialParsed = parseThaiReceiptOcr(spatialSauvolaText);
  }

  // 3. Header Zoom Pass
  let vendorName = mainParsed.vendor_name;
  let invoiceNumber = mainParsed.invoice_number;
  let invoiceDate = mainParsed.invoice_date;
  let taxId = extractTaxId13Digits(passes.mainText);

  if (passes.headerText) {
    const headerParsed = parseThaiReceiptOcr(passes.headerText);
    if (headerParsed.vendor_name && headerParsed.vendor_name !== 'ร้านค้า / บริษัทผู้ขาย' && headerParsed.vendor_name.length > 4) {
      vendorName = headerParsed.vendor_name;
    }
    if (headerParsed.invoice_number && headerParsed.invoice_number.length >= 4) {
      invoiceNumber = headerParsed.invoice_number;
    }
    if (headerParsed.invoice_date) {
      invoiceDate = headerParsed.invoice_date;
    }
    const headerTaxId = extractTaxId13Digits(passes.headerText);
    if (headerTaxId) taxId = headerTaxId;
  }

  // 4. Quality-Scored Candidate Selection (Never reward duplicate/noisy lists!)
  const candidateLists = [
    mainSpatialParsed?.items,
    sauvolaSpatialParsed?.items,
    sauvolaParsed?.items,
    mainParsed?.items
  ].filter((list): list is NonNullable<typeof list> => Boolean(list && list.length > 0));

  let bestItems: ParsedReceiptItem[] = mainParsed.items;
  let bestScore = -1;

  for (const candidate of candidateLists) {
    let score = candidate.length * 10;
    // Reward candidate items with valid SKU codes
    for (const item of candidate) {
      if (item.item_code && item.item_code.length >= 3) score += 5;
      if (item.description && item.description.length > 15) score += 3;
    }
    // Check if candidate list is mathematically balanced
    const cSum = candidate.reduce((s, i) => s + (i.total_price || 0), 0);
    if (mainParsed.total_amount > 0 && Math.abs(cSum - mainParsed.total_amount) < 1.0) {
      score += 30;
    }

    if (score > bestScore) {
      bestScore = score;
      bestItems = candidate;
    }
  }

  // 5. Apply Deep Thai Lexicon Auto-Correction on Vendor & Items
  vendorName = cleanCompanyName(vendorName);
  const cleanedItems = bestItems.map((item) => {
    const sep = splitThaiAndEnglishName(item.description);
    return {
      ...item,
      description: sep.formatted,
      thai_name: item.thai_name || sep.thai || undefined,
      english_name: item.english_name || sep.english || undefined
    };
  });

  // 6. Summary Zoom Pass
  let grandTotal = mainParsed.total_amount || 0;
  let discount = mainParsed.discount || 0;

  if (passes.summaryText) {
    const summaryParsed = parseThaiReceiptOcr(passes.summaryText);
    if (summaryParsed.total_amount && summaryParsed.total_amount > 0) {
      grandTotal = summaryParsed.total_amount;
    }
    if (summaryParsed.discount && summaryParsed.discount > 0) {
      discount = summaryParsed.discount;
    }
  }

  // 7. Mathematical Constraint Reconciliation
  const mathSolution = solveMathematicalConstraints(cleanedItems, grandTotal, discount);

  return {
    vendor_name: vendorName || 'ร้านค้า / บริษัทผู้ขาย',
    tax_id: taxId || undefined,
    invoice_number: invoiceNumber || '',
    invoice_date: invoiceDate || '',
    discount: mathSolution.discount,
    total_amount: mathSolution.grandTotal,
    items: mathSolution.items,
    reconciliation: {
      subtotal: mathSolution.subtotal,
      totalAmount: mathSolution.grandTotal,
      discount: mathSolution.discount,
      vatAmount: mathSolution.vatAmount,
      isMatched: mathSolution.isMatched,
      discrepancy: mathSolution.discrepancy
    }
  };
}

export const parseThaiReceiptOcrDeep = parseThaiReceiptOcrDeep5;
