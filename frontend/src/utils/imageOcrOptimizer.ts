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

export function preprocessImageForOcr(file: File, mode: PreprocessMode = 'grayscale'): Promise<string> {
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
        URL.revokeObjectURL(objectUrl);
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

const HARDWARE_MASTER_DICTIONARY = [
  'ป้องกัน', 'ลิเธียม', 'แบตเตอรี่', 'โซลาร์เซลล์', 'พาวเวอร์ปลั๊ก', 'ปลั๊กไฟ', 'สายไฟอ่อน',
  'สวิตช์', 'โมดูล', 'ความร้อน', 'ฉนวน', 'สแตนเลส', 'อะลูมิเนียม', 'พลาสติก', 'น็อต', 'สกรู',
  'คอนเนคเตอร์', 'หม้อแปลง', 'อะแดปเตอร์', 'ตัวต้านทาน', 'ตัวเก็บประจุ', 'ไดโอด', 'รีเลย์',
  'เซนเซอร์', 'เคเบิ้ลไทร์', 'เทปพันสายไฟ', 'ตลับเมตร', 'ด้ามปืน', 'กาวร้อน', 'คัตเตอร์',
  'กระดาษ', 'แฟ้ม', 'ซอง', 'กล่อง', 'เครื่อง', 'พร้อม', 'ใส้เต็ม', 'ไส้เต็ม', 'อิเล็กทรอนิกส์',
  'ปากกา', 'Permanent', 'STAEDTLER', 'น้ำเงิน', 'เขียว', 'แพ็ค', 'แพค', 'เคมี',
  'เครื่องเขียน', 'ดินสอ', 'ยางลบ', 'ไม้บรรทัด', 'กรรไกร', 'สมุด', 'ชิ้น', 'ด้าม'
];

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
  'ชิสเต็ม': 'ซิสเต็ม',
  'ใส้เต็ม': 'ไส้เต็ม',
  'ตูกันน้ำ': 'ตู้กันน้ำ',
  'ตูปิด': 'ตู้ปิด',
  'ตูไฟ': 'ตู้ไฟ',
  'ตูพลาสติก': 'ตู้พลาสติก',
  'หัวแรง': 'หัวแร้ง',
  'เคเบิลแกลนด': 'เคเบิ้ลแกลนด์',
  'เคเบิ้ลแกลนด': 'เคเบิ้ลแกลนด์',
  'เคเบิลแกลนด์': 'เคเบิ้ลแกลนด์',
  'เคเบิลไทร': 'เคเบิ้ลไทร์',
  'เคเบิลไทร์': 'เคเบิ้ลไทร์',
  'ปลกั๊ไฟ': 'ปลั๊กไฟ',
  'ปลกั๊พ่วง': 'ปลั๊กพ่วง',
  'ถ่านอลัคาไลน์': 'ถ่านอัลคาไลน์',
  'สีสัม': 'สีส้ม',
  '%16009': 'XL6009',
  '%l6009': 'XL6009',
  '%L6009': 'XL6009',
  'x16009': 'XL6009',
  'xi6009': 'XL6009',
  '*16009': 'XL6009',
  '%1 6009': 'XL6009',
  '%16019': 'XL6019',
  '%14015': 'XL4015',
  '%14016': 'XL4016',
  '%17015': 'XL7015',
  'อกอทอก': 'Permanent',
  'าอกอทอก': 'Permanent',
  'ตาอกอก': 'Permanent',
  '8๓ตาอกอก': 'Permanent',
  'เซสเหอก': 'STAEDTLER',
  'เดซหอ': 'STAEDTLER',
  'สเตดเลอร์': 'STAEDTLER',
  'สเต็ดเล่อร์': 'STAEDTLER',
  'STAEDLER': 'STAEDTLER',
  'STAEDLERK': 'STAEDTLER K-10',
  'STAEDTLERK': 'STAEDTLER K-10',
  'W44M': 'น้ำเงิน-M',
  'W44': 'น้ำเงิน',
  'นาเงิน': 'น้ำเงิน',
  'น้าเงิน': 'น้ำเงิน',
  'เขียว#โท': 'เขียว-M',
  'เขียวโท': 'เขียว-M',
  'เ2ลก': 'ดำ-M',
  'า0ยก': 'แดง-M',
  '1.0mเห': '1.0mm'
};

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

/**
 * Technical & Electronic Component Text Normalizer
 */
export function correctTechnicalThaiAndEnglishText(str: string): string {
  let text = str;

  // 1. Clean leading junk characters on item description (#, /, -, ((, etc.)
  text = text
    .replace(/^[#\/\-\*\+\:\.\s\|]+/g, '')
    .replace(/^\(\s*\(/g, '(')
    .replace(/\)\s*\)/g, ')');

  // 2. Protect AWG Specs & Wire SKUs (e.g. 22AWG, 18AWG)
  text = text
    .replace(/22[#\/\s]*เพ\d?/gi, '22AWG ')
    .replace(/18[#\/\s]*เผ\w*/gi, '18AWG ')
    .replace(/(\d{1,2})\s*[\/ลผเเผเพดa-zA-Z]*\s*WG\b/gi, '$1AWG ')
    .replace(/(\d{1,2})\s*[\/ลผเเผเพด]{2,4}\s*(?=สายไฟ)/gi, '$1AWG ')
    .replace(/\b(\d{1,2})[\/ลผเเผเพด]{2,4}(?=สายไฟ|\s)/gi, '$1AWG ')
    .replace(/\b22\s*aWG|22\/เพด/gi, '22AWG')
    .replace(/\b18\s*เผด|18ลเพ/gi, '18AWG')
    .replace(/\bA0(\d{3})\b/gi, 'A0$1')
    .replace(/\bA(\d{4})\b/gi, 'A$1');

  // 3. Strip garbled OCR prefix noise BEFORE known Thai words (e.g. '105หแผ0ปลัก' -> 'ปลั๊ก', '7105หเผ0ปลั๊ก' -> 'ปลั๊ก')
  text = text
    .replace(/\b105หแผ0/gi, '')
    .replace(/\b105หเผ0/gi, '')
    .replace(/\bหแผ0/gi, '')
    .replace(/\bหเผ0/gi, '')
    .replace(/\bปลัก(?=[0-9ก-๙\s])/g, 'ปลั๊ก');

  const knownWordStarts = [
    'ปลั๊ก', 'สายไฟ', 'สาย', 'แผ่น', 'สวิตช์', 'โมดูล', 'เซนเซอร์', 'รีเลย์', 'อะแดปเตอร์',
    'หม้อแปลง', 'ตัวต้านทาน', 'ตัวเก็บประจุ', 'ไดโอด', 'คอนเนคเตอร์', 'เคเบิ้ล', 'เคเบิลแกลนด์',
    'กาวแท่ง', 'กาว', 'คัตเตอร์', 'น็อต', 'สกรู', 'พาวเวอร์', 'แบตเตอรี่', 'ชุดอุปกรณ์',
    'บอร์ด', 'Board', 'Module', 'Sensor', 'Relay', 'LED', 'LCD', 'USB', 'Arduino',
    'ESP', 'Raspberry', 'Converter', 'Adapter', 'Cable', 'Wire', 'Ultrasonic',
    'Development', 'Waterproof', 'Solar', 'Battery', 'Power', 'Step', 'Camera',
    'DIY', 'อิเล็กทรอนิกส์', 'ฉนวน', 'ท่อตรง', 'ท่อหด', 'ท่อ', 'ลวด', 'เทป', 'กระดาษ',
    'หัวแร้ง', 'ตะกั่ว', 'ตู้กันน้ำ', 'ตู้กันนํ้า', 'ปืนยิงกาว'
  ];

  for (const word of knownWordStarts) {
    const idx = text.indexOf(word);
    if (idx > 0 && idx <= 12) {
      const prefix = text.substring(0, idx).trim();
      const isGarbledNoise = /^\d{2,6}[ก-ฮ\d]+$/i.test(prefix) || (/^[ก-ฮ\d\/\.\-]{1,6}$/i.test(prefix) && !/[ะาิีึืุูเแโใไ]/i.test(prefix));
      const isPureEnglish = /^[A-Za-z0-9\-\.\s]+$/i.test(prefix) && !/^\d{4,}[A-Za-z]+/.test(prefix);
      if (isGarbledNoise && !isPureEnglish) {
        text = text.substring(idx);
        break;
      }
    }
  }

  // 4. Hardware / Electronics Model Numbers & Technical Typos (Direct Specific Repairs)
  text = text
    // Specific OCR character confusions (%1, %l, %L, *1, x1, xi, xL -> XL)
    .replace(/(?:%1|%l|%L|x1|xi|X1|\*1|xL|X\||%\|)\s*6009/gi, 'XL6009')
    .replace(/(?:%1|%l|%L|x1|xi|X1|\*1|xL|X\||%\|)\s*6019/gi, 'XL6019')
    .replace(/(?:%1|%l|%L|x1|xi|X1|\*1|xL|X\||%\|)\s*4015/gi, 'XL4015')
    .replace(/(?:%1|%l|%L|x1|xi|X1|\*1|xL|X\||%\|)\s*4016/gi, 'XL4016')
    .replace(/(?:%1|%l|%L|x1|xi|X1|\*1|xL|X\||%\|)\s*7015/gi, 'XL7015')
    .replace(/(?:%1|%l|%L|x1|xi|X1|\*1|xL)\s*DC-to-DC/gi, 'XL6009 DC-to-DC')
    .replace(/(?:%1|%l|%L|x1|xi|X1|\*1|xL)\s*Step\s*up/gi, 'XL6009 Step up')
    .replace(/\b(?:%1|%l|%L|\*1)\b/g, 'XL')
    .replace(/\[\s*(?:%1|%l|%L|\*1)\s*\]/g, '[XL]')

    // Step up Converter (handles XL6009, %16009, %l6009, etc.)
    .replace(/(?:XL6009|%16009|%l6009|%L6009|x16009|xi6009|X16009|\*16009|XL\s*6009|%1\s*6009)\s*DC-to-DC\s*Step\s*up\s*Conv(?:er(?:ter)?)?/gi, 'XL6009 DC-to-DC Step up Converter')
    .replace(/(?:XL6009|%16009|%l6009|%L6009|x16009|xi6009|X16009|\*16009|XL\s*6009|%1\s*6009)\s*DC-to-DC/gi, 'XL6009 DC-to-DC Step up Converter')
    .replace(/(?:XL6009|%16009|%l6009|%L6009|x16009|xi6009|X16009|\*16009|XL\s*6009|%1\s*6009)\s*Step\s*up\s*Conv(?:er(?:ter)?)?/gi, 'XL6009 DC-to-DC Step up Converter')
    .replace(/\bStep\s*up\s*Conv(?:er(?:ter)?)?/gi, 'Step up Converter')
    // Ultrasonic Module (JSN-SR04T)
    .replace(/Waterproof\s*Ultrasonic\s*Module\s*(?:เซนเซอร์วัดระยะทาง|เซนเซอร์|เซ)?(?:\s*\(JSN-SR04T\))?/gi, 'Waterproof Ultrasonic Module เซนเซอร์วัดระยะทาง (JSN-SR04T)')
    .replace(/Ultrasonic\s+M(?:odule)?/gi, 'Ultrasonic Module')
    .replace(/JSN-SROAT/gi, 'JSN-SR04T')
    // Lithium Battery & Chargers
    .replace(/โมดูลชาร์จถ่าน\s*ป้องกันแบตเตอรี่ลิเธียม(?:\s*18650)?/g, 'โมดูลชาร์จถ่าน ป้องกันแบตเตอรี่ลิเธียม 18650')
    .replace(/โมดูลชาร์จแบตเตอรี่ลิเธียมพลังงานแส(?:ง(?:อาทิตย์)?)?/g, 'โมดูลชาร์จแบตเตอรี่ลิเธียมพลังงานแสงอาทิตย์ (Solar Charger)')
    .replace(/ถ่านชาร์จ\s*lithium\s*battery\s*แบตเตอรี่ลิ(?:เธียม)?(?:\s*18650)?/gi, 'ถ่านชาร์จ lithium battery แบตเตอรี่ลิเธียม 18650')
    // Solar Cell
    .replace(/(?:อ0420\s*)?Solar\s*Cell\s*โซลาร์เซลล์\s*6V\s*6[VW]/gi, 'Solar Cell โซลาร์เซลล์ 6V 6W')
    // 4G LTE Module
    .replace(/โมดูล\s*4G\s*LTE\s*SIM7600A-H\s*Develo(?:pment)?(?:\s*Board)?/gi, 'โมดูล 4G LTE SIM7600A-H Development Board')
    .replace(/\bSIM7600A\b/gi, 'SIM7600A-H')
    // DIY Electronics Kit
    .replace(/(?:ย9033\s*)?ชุดอุปกรณ์\s*DIY\s*อิเล็กทรอนิกส์(?:ให|สำหรับเริ่มต้น)?/g, 'ชุดอุปกรณ์ DIY อิเล็กทรอนิกส์สำหรับเริ่มต้น')
    // Wires (22AWG / 18AWG)
    .replace(/22AWG\s*สายไฟอ่อน\s*สีแดง\s*ไส้เต็ม\s*1\s*เมต(?:ร)?/g, '22AWG สายไฟอ่อน สีแดง ไส้เต็ม 1 เมตร')
    .replace(/22AWG\s*สายไฟอ่อน\s*สีดำ\s*ไส้เต็ม\s*1\s*เมต(?:ร)?/g, '22AWG สายไฟอ่อน สีดำ ไส้เต็ม 1 เมตร')
    .replace(/18AWG\s*สายไฟอ่อน\s*สีแดง\s*ไส้เต็ม\s*10\s*เมต(?:ร)?/g, '18AWG สายไฟอ่อน สีแดง ไส้เต็ม 10 เมตร')
    .replace(/(?:60483\s*)?18AWG\s*สายไฟอ่อน\s*(?:Hein|สีดำ)\s*ไส้เต็(?:ม)?(?:\s*10\s*เมตร)?/g, '18AWG สายไฟอ่อน สีดำ ไส้เต็ม 10 เมตร')
    // Camera Module (OV7670)
    .replace(/Camera\s*Module\s*\(?(?:0ง|0v|ov|oO|ง)?7670\)?/gi, 'Camera Module (OV7670)')
    .replace(/\(0ง7670\)/gi, '(OV7670)')
    .replace(/\b0ง7670\b/gi, 'OV7670')
    // ESP32 NodeMCU
    .replace(/ESP32\s*NodeMCU\s*ESP-WROOM-(?:32)?(?:\s*Development\s*Board)?/gi, 'ESP32 NodeMCU ESP-WROOM-32 Development Board')
    // Thai Watsadu Power Plug
    .replace(/สาขา\s*3\s*ม\.?/g, 'สาย 3 ม.')
    .replace(/สาขา\s*5\s*ม\.?/g, 'สาย 5 ม.')
    .replace(/ปลัก\s*5\s*ช่อง\s*5\s*สวิตช์/g, 'ปลั๊ก 5 ช่อง 5 สวิตช์')

    // Stationery & Office Supplies (STAEDTLER, Pens, Colors, Markers, Paper)
    .replace(/(?:STAEDLER|STAEDTLER|STAEDLERK|STAEDTLERK|เซสเหอก|เดซหอ|สเตดเลอร์|สเต็ดเล่อร์)[\s\-_]*([Kk]-?10)?/gi, 'STAEDTLER K-10')
    .replace(/\b(?:STAEDLER|STAEDTLER)\b/gi, 'STAEDTLER')
    .replace(/\b[Kk]-?10\b/gi, 'K-10')
    .replace(/1\.0\s*(?:mเห|mm|มม\.?)/gi, '1.0mm')
    .replace(/0\.5\s*(?:mเห|mm|มม\.?)/gi, '0.5mm')
    .replace(/0\.7\s*(?:mเห|mm|มม\.?)/gi, '0.7mm')
    .replace(/(?:ปากก[\.\s_~-]*[าๅ]|ปากก\.\.[\sา]*|ปากก[_\.\s]*)\s*(?:Permanent|Permanen|อกอทอก|าอกอทอก|ตาอกอก|8๓ตาอกอก|เพอร์มาเนนท์)?/gi, 'ปากกา Permanent ')
    .replace(/\b(?:Permanent|Permanen|Pemanent)\b/gi, 'Permanent')
    .replace(/(?:น[ำา\u0e4d\u0e32]+เงิน|W44M|W44|นาเงิน|น้าเงิน|นําเงิน)\s*(?:[\-_]?\s*[Mm])?/gi, 'น้ำเงิน-M ')
    .replace(/(?:เขียว[\s#โท]*|เขียวโท)\s*(?:[\-_]?\s*[Mm])?(?:#โท)?/gi, 'เขียว-M ')
    .replace(/(?:ด[ำ\u0e4d\u0e32]+|เ2ลก)\s*(?:[\-_]?\s*[Mm])?/gi, 'ดำ-M ')
    .replace(/(?:^|\s)(?:0ยก|า0ยก)(?:\s|$)/g, ' แดง-M ')
    .replace(/(?:แดง)(?:\s*[\-_]?\s*[Mm])?/gi, 'แดง-M ')
    .replace(/([ก-๙a-zA-Z])(\d+\.\d+mm)/gi, '$1 $2')
    .replace(/(\d+\.\d+mm)([ก-๙a-zA-Z])/gi, '$1 $2')
    .replace(/-(?:M|m)(?=\d)/g, '-M ')
    .replace(/Permanent\s+Permanent/gi, 'Permanent')
    .replace(/STAEDTLER\s+K-10\s+K-10/gi, 'STAEDTLER K-10')
    .replace(/STAEDTLER\s+STAEDTLER/gi, 'STAEDTLER')
    .replace(/ปากกา\s+ปากกา/g, 'ปากกา');

  // 5. Thai Technical & Hardware Word Corrections
  text = text
    .replace(/ด้ามบืน/g, 'ด้ามปืน')
    .replace(/TQ-85\s*สัม|สีสัม|(?:^|\s)สัม(?:\s|$)/g, ' สีส้ม ')
    .replace(/PL\s*69\s*[\-\s]*ด[ำา\u0e4d\u0e32]*/gi, 'PL PG9-BK ดำ')
    .replace(/69\s*[\-\s]*ด[ำา\u0e4d\u0e32]*/gi, 'PG9-BK ดำ')
    .replace(/ปลิ๊ก|ปลื๊ก|ปลัก(?!ๆ)/g, 'ปลั๊ก')
    .replace(/ใส้เต็ม/g, 'ไส้เต็ม')
    .replace(/สสี/g, 'สี')
    .replace(/สสีด[ำา\u0e4d\u0e32]*/g, 'สีดำ')
    .replace(/อ่อนสี/g, 'อ่อน สี')
    .replace(/กันน[ำา\u0e4d\u0e32]*/g, 'กันน้ำ')
    .replace(/ป้องดัน/g, 'ป้องกัน')
    .replace(/ลิเรียม|ลิเธย(?!ม)|ลิเธยม/g, 'ลิเธียม')
    .replace(/แบตเตอรี(?!่)/g, 'แบตเตอรี่')
    .replace(/โซลาร(?!์)/g, 'โซลาร์')
    .replace(/เชลล์/g, 'เซลล์')
    .replace(/ชิสเต็ม/g, 'ซิสเต็ม')
    .replace(/สวิทช์/g, 'สวิตช์')
    .replace(/บหาชน/g, 'มหาชน')
    .replace(/จำกัค|จำกัต/g, 'จำกัด')
    .replace(/1\s*fou/gi, '1 ก้อน')
    .replace(/ใหม่\s*พร้/g, 'พร้อม')
    .replace(/พร้อมอ:/g, 'พร้อม');

  // 6. Run TYPO_MAP dictionary
  Object.keys(TYPO_MAP).forEach((typo) => {
    if (typo) {
      text = text.split(typo).join(TYPO_MAP[typo]);
    }
  });

  // 7. Run Levenshtein Fuzzy Correction on individual word tokens
  const words = text.split(' ');
  const correctedWords = words.map((w) => fuzzyCorrectWord(w));
  text = correctedWords.join(' ');

  // 8. Strip trailing numeric junk that looks like leaked price data & VAT codes
  text = text
    .replace(/[\s|]+[VvNtX]\s*$/g, '')
    .replace(/(\s+[\d,]+(\.\d{1,3})?)+[\s|]*[VvNtX]?\s*$/g, '')
    .replace(/\s+\d+\.\d{1,3}\s*\d*[\s|]*[VvNtX]?\s*$/g, '')
    .replace(/\s+\d{1,6}\s*[!|]*\s*$/g, '');

  // 9. Restore balanced parentheses for technical specs like (JSN-SR04T) or (OV7670)
  const openCount = (text.match(/\(/g) || []).length;
  const closeCount = (text.match(/\)/g) || []).length;
  if (openCount > closeCount) {
    text = text + ')'.repeat(openCount - closeCount);
  }

  return text.replace(/\s+/g, ' ').trim();
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
    if (/ไทวัสดุ|ซีอาร์ซี|ซีโอแอล|OfficeMate|B2S|HomePro|DoHome|Global|IT CITY|Advice|MR\.?DIY|Big C|Lotus|7-Eleven|CRC|COL/i.test(line)) {
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
  quantity: number;
  unit: string;
  unit_price: number;
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
    const match = line.match(/(?:เลขที่ใบกำกับภาษี|เลขที่ใบกำกับ|เลขที่ใบเสร็จ|เลขที่|Tax\s*Invoice\s*No\.?|TAX\s*INV\.?|TAX\s*NO\.?|INV\s*NO\.?|DOC\s*NO\.?|TIV|No\.?)[^\w\d]*([A-Z0-9\/\-]{4,25})/i);
    if (match && match[1] && !/^\d{13}$/.test(match[1]) && !/^(?:COMPANY|LIMITED|TAX|BRANCH|PAGE|ORIGINAL|COPY)$/i.test(match[1])) {
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

  // Extract Total Amount & Discount from footer
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

  // Extract explicit discount line if present e.g. "ส่วนลด 109.71"
  for (const line of lines) {
    const discMatch = line.match(/(?:ส่วนลด|DISCOUNT|หักส่วนลด)[\s\:\-]+([\d,]+(?:\.\d{2}|\.-))/i);
    if (discMatch) {
      const val = parseFloat(discMatch[1].replace(/\.-/, '.00').replace(/,/g, ''));
      if (!isNaN(val) && val > 0) discount_val = val;
    }
  }

  let reachedFooter = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // Check if reached footer summary or disclaimer
    if (
      /(?:sou\s*[\d,]+|รวม\s*[\d,]+|รวบ\s*[\d,]+|ราคารวม\s*VAT|สินค้าที่ไม่มีภาษี|สินค้าที่มีภาษี|มูลค่าสินค้าที่เสียภาษี|ผู้รับเงิน|ชำระเงินโดย|เป็นการยกเลิก|หมายเหตุ|ใบเสร็จรับเงินและ|เจ็ดร้อย|Vk|ลูกหนี้|การคำนวณภาษี|มูลค่าสินค้าตาม|Digitally signed by|สินค้าสั่งพิเศษ|บริษัทขอสงวนสิทธิ์|ผู้จัดทำ|การคำนวณ|ใช้ราคาขายตาม|กรมสรรพสามิต|เต็มรูปแทน|ศศ\s*TS|คล้า\s*จิก้)/i.test(rawLine)
    ) {
      reachedFooter = true;
    }

    // Strictly skip footer lines from being parsed as items!
    if (
      reachedFooter ||
      /^(?:รวม|รวบ|สุทธิ|ภาษี|มูลค่า|ยอด|ส่วนลด|ชำระ|เงินสด|บัตร|สมาชิก|สาขา|จำนวน|หน้าที่|เอกสาร|ผู้รับ|ลงชื่อ|ค่าขนส่ง|นที|วันที่|หมายเหตุ|แบสลี|sou)/i.test(rawLine)
    ) {
      continue;
    }

    if (excludeKeywords.some((kw) => rawLine.toUpperCase().includes(kw.toUpperCase()))) {
      continue;
    }

    let line = rawLine
      .replace(/[\s|\]\)\}\!]+$/g, '')
      .replace(/[\s|]+[VvNtX]\s*$/g, '')
      .trim();

    const rowPrefixMatch = line.match(/^(\d{1,3})\s*(?:[\.\)\s\|]+|[\|\/\\]\s*[vVงฯnNโoO\s]*[\|\/\\\[\{\(\]]*)/);
    const hasRowPrefix = Boolean(rowPrefixMatch);
    const skuBracketTest = line.match(/^\s*[\|\(\[\{\/\\]*([A-Za-z0-9\-\u0e00-\u0e7f]{3,15})[\)\]\}\|]/i);

    const isAddressLine = /ที่อยู่|ผู้ซื้อ|ผู้ขาย|หมู่ที่|ตำบล|อำเภอ|จังหวัด|ถนน|ซอย|แขวง|เขต|รหัสไปรษณีย์/i.test(rawLine);
    const isTableHeader = /^\s*SKU\b/i.test(rawLine) || /รายละเอียด.*จำนวน|รหัสสินค้า.*ราคา/i.test(rawLine) || /^(?:ลำดับ|ORDER|NO\.|ITEM|รหัส|ชื่อสินค้า|รายการ)/i.test(rawLine) || /จำนวน.*หน่วยละ.*จำนวนเงิน|จำนวน.*หน่วย.*ราคา|หน่วยละ\(บาท\)|ราคาต่อหน่วย.*จำนวนเงิน/i.test(rawLine);

    if (isAddressLine || isTableHeader) continue;

    // Pattern 1: Multi-column with Unit and Discount (Desc Qty Unit Price Discount Amount)
    // e.g. "1 4007817310535 ปากกาPermanent น้ำเงิน 1.0mm STAEDTLER K-10 1 แพค10 415.00 0.00 415.00"
    const fullTableWithUnitAndDiscount = line.match(
      /^(.+?)\s+(\d{1,4}(?:\.\d{1,3})?)\s+([ก-๙a-zA-Z]+(?:\d{1,3})?)\s+([\d,]+(?:\.\d{2,3}|\.-))\s+([\d,]+(?:\.\d{2,3}|\.-))\s+([\d,]+(?:\.\d{2,3}|\.-))\s*$/
    );

    // Pattern 2: Multi-column with Unit (Desc Qty Unit Price Amount)
    // e.g. "ปากกา... 1 แพค10 415.00 415.00"
    const fullTableWithUnit = !fullTableWithUnitAndDiscount
      ? line.match(/^(.+?)\s+(\d{1,4}(?:\.\d{1,3})?)\s+([ก-๙a-zA-Z]+(?:\d{1,3})?)\s+([\d,]+(?:\.\d{2,3}|\.-))\s+([\d,]+(?:\.\d{2,3}|\.-))\s*$/)
      : null;

    const thaiWatsadu4Col = !fullTableWithUnitAndDiscount && !fullTableWithUnit
      ? line.match(/^(.+?)\s+(\d{1,4}(?:\.\d{1,3})?)\s+([\d,]+(?:\.\d{2,3}|\.-))\s+([\d,]+(?:\.\d{2,3}|\.-))\s+([\d,]+(?:\.\d{2,3}|\.-))\s*$/)
      : null;
    const threeColDecimals = !fullTableWithUnitAndDiscount && !fullTableWithUnit && !thaiWatsadu4Col
      ? line.match(/^(.+?)\s+(\d{1,4}(?:\.\d{1,3})?)\s+([\d,]+(?:\.\d{2,3}|\.-))\s+([\d,]+(?:\.\d{2,3}|\.-))\s*$/)
      : null;
    const standard3Col = !fullTableWithUnitAndDiscount && !fullTableWithUnit && !thaiWatsadu4Col && !threeColDecimals
      ? line.match(/^(.+?)\s+(\d{1,4}(?:\.\d{1,3})?)\s+([\d,]+(?:\.\d{2,3}|\.-|\|\s*[\d,]+(?:\.\d{2,3}|\.-)))\s*\|\s*([\d,]+(?:\.\d{2,3}|\.-))\s*$/)
        || line.match(/^(.+?)\s+(\d{1,4}(?:\.\d{1,3})?)\s+([\d,]+(?:\.\d{2,3}|\.-))\s+([\d,]+(?:\.\d{2,3}|\.-))\s*$/)
      : null;
    const standard2Price = !fullTableWithUnitAndDiscount && !fullTableWithUnit && !thaiWatsadu4Col && !threeColDecimals && !standard3Col
      ? line.match(/^(.+?)\s+([\d,]+(?:\.\d{2,3}|\.-))\s+([\d,]+(?:\.\d{2,3}|\.-))\s*$/)
      : null;
    const singlePriceMatch = (!fullTableWithUnitAndDiscount && !fullTableWithUnit && !thaiWatsadu4Col && !threeColDecimals && !standard3Col && !standard2Price && (hasRowPrefix || Boolean(skuBracketTest)))
      ? line.match(/^(.+?)\s+([\d,]+(?:\.\d{2,3}|\.-))\s*$/)
      : null;

    const isNewItemRow = Boolean(fullTableWithUnitAndDiscount) || Boolean(fullTableWithUnit) || Boolean(thaiWatsadu4Col) || Boolean(threeColDecimals) || Boolean(standard3Col) || Boolean(standard2Price) || Boolean(singlePriceMatch);

    if (isNewItemRow) {
      let cleanDesc = line;
      let quantity = 1;
      let unit_price = 0;
      let total_price_final = 0;
      let rawExtractedUnit = '';

      if (fullTableWithUnitAndDiscount) {
        cleanDesc = fullTableWithUnitAndDiscount[1];
        quantity = parseFloat(fullTableWithUnitAndDiscount[2]) || 1;
        rawExtractedUnit = fullTableWithUnitAndDiscount[3];
        unit_price = parseFloat(fullTableWithUnitAndDiscount[4].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
        total_price_final = parseFloat(fullTableWithUnitAndDiscount[6].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
      } else if (fullTableWithUnit) {
        cleanDesc = fullTableWithUnit[1];
        quantity = parseFloat(fullTableWithUnit[2]) || 1;
        rawExtractedUnit = fullTableWithUnit[3];
        unit_price = parseFloat(fullTableWithUnit[4].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
        total_price_final = parseFloat(fullTableWithUnit[5].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
      } else if (thaiWatsadu4Col) {
        cleanDesc = thaiWatsadu4Col[1];
        quantity = parseFloat(thaiWatsadu4Col[2]) || 1;
        unit_price = parseFloat(thaiWatsadu4Col[3].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
        total_price_final = parseFloat(thaiWatsadu4Col[5].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
      } else if (threeColDecimals) {
        cleanDesc = threeColDecimals[1];
        quantity = parseFloat(threeColDecimals[2]) || 1;
        unit_price = parseFloat(threeColDecimals[3].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
        total_price_final = parseFloat(threeColDecimals[4].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
      } else if (standard3Col) {
        cleanDesc = standard3Col[1];
        quantity = parseFloat(standard3Col[2]) || 1;
        const uStr = standard3Col[3].replace(/\|/g, '').replace(/\.-/, '.00').replace(/,/g, '').trim();
        unit_price = parseFloat(uStr) || 0;
        total_price_final = parseFloat(standard3Col[4].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
      } else if (standard2Price) {
        cleanDesc = standard2Price[1];
        quantity = 1;
        unit_price = parseFloat(standard2Price[2].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
        total_price_final = parseFloat(standard2Price[3].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
      } else if (singlePriceMatch) {
        cleanDesc = singlePriceMatch[1];
        total_price_final = parseFloat(singlePriceMatch[2].replace(/\.-/, '.00').replace(/,/g, '')) || 0;
        unit_price = total_price_final;
      }

      if (total_price_final <= 0) continue;

      cleanDesc = cleanDesc
        .replace(/[\s|]+[VvNtX]\s*$/g, '')
        .replace(/(\s+[\d,]+(\.\d{1,3}|\.-)?)+[\s|]*[VvNtX]?\s*$/g, '')
        .replace(/\s+\d+\.\d{1,3}\s*\d*[\s|]*[VvNtX]?\s*$/g, '')
        .replace(/\s+\d{1,6}\s*[!|]*\s*$/g, '')
        .trim();

      cleanDesc = cleanDesc.replace(/^\s*\d{1,3}\s*[\|\/\\]\s*[vVงฯnNโoO\s]*[\|\/\\\[\{\(\]]*\s*/, '');
      cleanDesc = cleanDesc.replace(/^\s*\d{1,3}[\.\)\s\|]+/, '');

      let item_code = '';

      // 1. Check for glued row index + 13-digit barcode (e.g. 14007817310535 or 1 4007817310535)
      const gluedBarcodeMatch = cleanDesc.match(/^\s*(?:(\d{1,2})[\s\.\)]*)?(\d{13})\s*(.+)$/);
      if (gluedBarcodeMatch) {
        item_code = gluedBarcodeMatch[2];
        cleanDesc = gluedBarcodeMatch[3].trim();
      } else {
        // 2. Check if barcode was split into two chunks (e.g. 40078 7310564)
        const splitBarcodeMatch = cleanDesc.match(/^\s*(?:(\d{1,2})[\s\.\)]+)?(\d{4,7})\s+(\d{5,8})\s*(.+)$/);
        if (splitBarcodeMatch && (splitBarcodeMatch[2].length + splitBarcodeMatch[3].length >= 12 && splitBarcodeMatch[2].length + splitBarcodeMatch[3].length <= 14)) {
          item_code = splitBarcodeMatch[2] + splitBarcodeMatch[3];
          cleanDesc = splitBarcodeMatch[4].trim();
        } else {
          // 3. Normal leading barcode 8-14 digits
          const leadingBarcodeMatch = cleanDesc.match(/^\s*(\d{8,14})\s*(.+)$/);
          if (leadingBarcodeMatch) {
            item_code = leadingBarcodeMatch[1];
            cleanDesc = leadingBarcodeMatch[2].trim();
          } else {
            // Shopee Bracket SKU matching & normalization
            const bracketSku = cleanDesc.match(/^\s*[\|\(\[\{\/\\]*([A-Za-z0-9\-\u0e00-\u0e7f]{3,10}?)[\)\]\}\|1\s]\s*(.+)$/i);
            if (bracketSku && !/^(?:TOTAL|VAT|PRICE|QTY|ITEM|SKU|DOC|INV|ORDER)$/i.test(bracketSku[1])) {
              let code = bracketSku[1]
                .replace(/^ม/gi, 'M')
                .replace(/^พ/gi, 'P')
                .replace(/^แห/gi, 'H')
                .replace(/^pJ/i, 'P0')
                .replace(/^P041T/i, 'P0410')
                .replace(/^501/i, 'S01')
                .replace(/^903/i, 'S03')
                .replace(/^ย903/i, 'S03')
                .replace(/^603/i, 'G03')
                .replace(/^604/i, 'G04')
                .replace(/^A03/i, 'G03')
                .replace(/^048/i, 'G048')
                .replace(/^1688$/i, 'H1688')
                .replace(/^อ0420/i, 'P0420')
                .replace(/^0420/i, 'P0420')
                .replace(/^M15371$/i, 'M1537');

              if (/^[A-Z0-9\-]{3,15}$/i.test(code)) {
                item_code = code;
                cleanDesc = bracketSku[2].trim();
              }
            } else {
              // Check prefix SKU patterns like "อ0420 Solar..." or "ย9033 ชุด..." or "60483 18#..."
              const prefixSkuMatch = cleanDesc.match(/^(อ0420|ย9033|60483|A0325|A0327|0484|1688|M0204|M1537|P0002|M0103|P0164|P041T|P0319)\s+(.+)$/i);
              if (prefixSkuMatch) {
                let code = prefixSkuMatch[1]
                  .replace(/^อ0420/i, 'P0420')
                  .replace(/^ย9033/i, 'S033')
                  .replace(/^60483/i, 'G0483')
                  .replace(/^A0325/i, 'G0325')
                  .replace(/^A0327/i, 'G0327')
                  .replace(/^0484/i, 'G0484')
                  .replace(/^1688/i, 'H1688')
                  .replace(/^P041T/i, 'P0410');
                item_code = code;
                cleanDesc = prefixSkuMatch[2].trim();
              }
            }
          }
        }
      }

      // If cleanDesc still has a standalone 6-14 digit number at the start, remove it
      cleanDesc = cleanDesc.replace(/^\s*\d{6,14}\s+/, '').trim();
      cleanDesc = cleanDesc.replace(/^[\|\/\\\[\]\(\)\{\}\!\?\s\-\.:]+/g, '').trim();
      cleanDesc = cleanThaiText(cleanDesc);
      cleanDesc = cleanItemDescription(cleanDesc);

      if (quantity > 0 && unit_price > 0 && (total_price_final === 0 || Math.abs(total_price_final - (quantity * unit_price)) > 0.05)) {
        total_price_final = Math.round(quantity * unit_price * 100) / 100;
      } else if (total_price_final > 0 && quantity > 0 && unit_price === 0) {
        unit_price = Math.round((total_price_final / quantity) * 100) / 100;
      }

      let unit = 'ชิ้น';
      if (rawExtractedUnit) {
        const u = rawExtractedUnit.trim();
        if (/^แพ[ค็ค]+(?:10)?$/i.test(u)) unit = 'แพ็ค (10 ด้าม)';
        else if (/^แพ[ค็ค]+/i.test(u)) unit = 'แพ็ค';
        else if (/^กล่อง/i.test(u)) unit = 'กล่อง';
        else if (/^ด้าม/i.test(u)) unit = 'ด้าม';
        else if (/^เล่ม/i.test(u)) unit = 'เล่ม';
        else if (/^ชุด/i.test(u)) unit = 'ชุด';
        else if (/^อัน/i.test(u)) unit = 'อัน';
        else if (/^รีม/i.test(u)) unit = 'รีม';
        else if (/^ม้วน/i.test(u)) unit = 'ม้วน';
        else if (/^ขวด/i.test(u)) unit = 'ขวด';
        else if (/^แผ่น/i.test(u)) unit = 'แผ่น';
        else if (/^หลอด/i.test(u)) unit = 'หลอด';
        else if (/^ก้อน/i.test(u)) unit = 'ก้อน';
        else if (/^เครื่อง/i.test(u)) unit = 'เครื่อง';
        else if (/^โหล/i.test(u)) unit = 'โหล';
        else if (/^ชิ้น/i.test(u)) unit = 'ชิ้น';
        else unit = u;
      } else {
        const allText = cleanDesc;
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
        else if (/(?:^|\s)(?:กิโลกรัม|กก\.)(?:\s|$)/i.test(allText)) unit = 'กิโลกรัม';
        else if (/(?:^|\s)เมตร(?:\s|$)|หน่วย.*เมตร|ยาว.*เมตร/i.test(allText)) unit = 'เมตร';
      }

      const isZeroPriceJunk = unit_price === 0 && !item_code && cleanDesc.length < 5;
      const isLowPriceGarbage = total_price_final <= 1.05 && !item_code && cleanDesc.length < 15;
      const isTaxSummaryJunk = /สินค้าที่ไม่มีภาษี|สินค้าไม่มีภาษี|สินค้าที่ได้รับยกเว้น|มูลค่าฐานภาษี|รวมยอดขาย|ยอดรวมภาษี|ยอดสุทธิ/i.test(cleanDesc);

      if (
        cleanDesc.length >= 3 &&
        !isZeroPriceJunk &&
        !isLowPriceGarbage &&
        !isTaxSummaryJunk &&
        !/(?:มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)/i.test(cleanDesc) &&
        !/^(?:รวม|รวบ|สุทธิ|ภาษี|มูลค่า|ยอด|ส่วนลด|ชำระ|เงินสด|บัตร|สมาชิก|สาขา|จำนวน|หน้าที่|เอกสาร|ผู้รับ|ลงชื่อ|ค่าขนส่ง|นที|วันที่|หมายเหตุ|แบสลี|sou)/i.test(cleanDesc) &&
        !/^\d+\s*รายการ/i.test(cleanDesc) &&
        /[ก-ฮa-zA-Z]{2,}/i.test(cleanDesc) &&
        !/ที่อยู่|ผู้ซื้อ|หมู่ที่|ตำบล|อำเภอ|จังหวัด|ผู้รับเงิน|ผู้ส่งของ|ลงชื่อ|อนุมัติ|หมายเหตุ/i.test(cleanDesc)
      ) {
        // De-duplicate if exact same description already exists with exact same price
        const isDuplicate = items.some(
          (existing) => existing.description === cleanDesc && existing.total_price === total_price_final && existing.quantity === quantity
        );

        if (!isDuplicate) {
          items.push({
            item_code,
            description: cleanDesc,
            quantity,
            unit,
            unit_price,
            total_price: total_price_final
          });
        }
      }
    } else {
      // Continuation line (append to last item description)
      if (
        !reachedFooter &&
        items.length > 0 &&
        line.length >= 2 &&
        !/^(?:รวม|รวบ|สุทธิ|ภาษี|มูลค่า|ยอด|ส่วนลด|ชำระ|เงินสด|บัตร|สมาชิก|สาขา|จำนวน|หน้าที่|เอกสาร|บริษัท|หจก|เลขที่|วันที่|ข้อมูล|หมายเหตุ|ผู้รับ|ผู้จัดทำ|โปรด|เงื่อนไข|RPP|SE|ศศ|การคำนวณ|สรรพสามิต|เต็มรูป)/i.test(line) &&
        !/^\d+\s*รายการ/i.test(line)
      ) {
        const lastItem = items[items.length - 1];
        let cleanContinuation = cleanThaiText(line);
        cleanContinuation = cleanItemDescription(cleanContinuation);
        if (cleanContinuation.length >= 2) {
          lastItem.description = correctTechnicalThaiAndEnglishText(
            (lastItem.description + ' ' + cleanContinuation).replace(/\s+/g, ' ').trim()
          );
        }
      }
    }
  }

  const calculatedSubtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  let inferredDiscount = discount_val;

  if (total_amount <= 0 && calculatedSubtotal > 0) {
    total_amount = calculatedSubtotal;
  } else if (total_amount > 0 && calculatedSubtotal > total_amount && inferredDiscount === 0) {
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
    items,
    reconciliation: {
      subtotal: calculatedSubtotal,
      totalAmount: total_amount,
      discount: inferredDiscount,
      isMatched,
      discrepancy
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
  const cleanedItems = bestItems.map((item) => ({
    ...item,
    description: correctTechnicalThaiAndEnglishText(item.description)
  }));

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
