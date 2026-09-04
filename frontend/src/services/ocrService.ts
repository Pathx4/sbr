// frontend/src/services/ocrService.ts
import axios from 'axios';
import { runTesseract, type OcrWord, type OcrResult } from '../utils/tesseractWorker';

export interface OcrExtractionResponse {
  words: OcrWord[];
  rawText: string;
  parsed?: any;
  engine: 'paddle' | 'tesseract';
}

/**
 * Convert a base64 Data URL to a Blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Send receipt image to PaddleOCR (PP-OCRv5) on backend
 */
export async function extractWithPaddleOcr(
  imageSource: File | Blob | string,
  timeoutMs = 240000
): Promise<OcrResult & { parsed?: any }> {
  let formData: FormData | null = null;
  let jsonPayload: { image: string } | null = null;

  if (typeof imageSource === 'string') {
    if (imageSource.startsWith('data:')) {
      const blob = dataUrlToBlob(imageSource);
      formData = new FormData();
      formData.append('file', blob, 'receipt.jpg');
    } else {
      jsonPayload = { image: imageSource };
    }
  } else if (imageSource instanceof File) {
    formData = new FormData();
    formData.append('file', imageSource, imageSource.name || 'receipt.jpg');
  } else if (imageSource instanceof Blob) {
    formData = new FormData();
    formData.append('file', imageSource, 'receipt.jpg');
  }

  let response;
  if (formData) {
    response = await axios.post('/api/extract-bill', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: timeoutMs,
    });
  } else {
    response = await axios.post('/api/extract-bill', jsonPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: timeoutMs,
    });
  }

  if (response.data && Array.isArray(response.data.words)) {
    const rawText = response.data.rawText || response.data.words.map((w: any) => w.text).join('\n');
    return {
      words: response.data.words.map((w: any) => ({
        text: w.text || '',
        bbox: w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
      })),
      rawText,
      parsed: response.data.parsed || undefined,
    };
  }

  throw new Error(response.data?.error || 'รูปแบบการตอบกลับจาก PaddleOCR ไม่ถูกต้อง');
}

/**
 * Run OCR with high-accuracy PaddleOCR primary and client-side Tesseract.js fallback
 */
export async function runOcrWithFallback(
  imageSource: File | Blob | string,
  onProgress?: (status: string, percent: number) => void
): Promise<OcrExtractionResponse> {
  try {
    if (onProgress) onProgress('กำลังประมวลผลด้วย PaddleOCR (PP-OCRv5 ไทย-อังกฤษ)...', 45);
    const result = await extractWithPaddleOcr(imageSource);
    if (onProgress) onProgress('PaddleOCR สแกนสำเร็จ 100%', 100);
    return {
      ...result,
      engine: 'paddle',
    };
  } catch (paddleErr: any) {
    console.warn('[OCR Service] PaddleOCR failed, automatically falling back to Tesseract.js:', paddleErr);
    if (onProgress) onProgress('เซิร์ฟเวอร์ตอบสนองช้า สลับไปใช้ Tesseract.js (Offline Fallback)...', 55);

    // Fallback to client-side Tesseract
    const fallbackResult = await runTesseract(imageSource as any, (pct) => {
      if (onProgress) onProgress(`Tesseract.js กำลังสแกน... ${pct}%`, Math.round(55 + (pct * 0.45)));
    });

    return {
      ...fallbackResult,
      engine: 'tesseract',
    };
  }
}
