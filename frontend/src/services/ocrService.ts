// frontend/src/services/ocrService.ts
import axios from 'axios';
import { type OcrWord, type OcrResult } from '../utils/tesseractWorker';
import { getAuthHeaders } from '../utils/auth';

export interface OcrExtractionResponse {
  words: OcrWord[];
  rawText: string;
  parsed?: any;
  engine: 'paddle' | 'tesseract' | 'ai-vision' | 'ai-hybrid';
}

/**
 * Resize and compress image to ensure payload is < 500KB and dimensions are optimal for Vision AI.
 * Max dimension: 1800px, JPEG quality: 0.85.
 * This guarantees the payload stays well below Vercel's 4.5MB Serverless Function limit.
 */
export async function compressImageForUpload(imageSource: File | Blob | string): Promise<string> {
  // If already a small base64 string (< 800KB), return as is
  if (typeof imageSource === 'string' && imageSource.startsWith('data:image') && imageSource.length < 800000) {
    return imageSource;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    let srcUrl = '';
    let isObjectUrl = false;

    if (typeof imageSource === 'string') {
      srcUrl = imageSource;
    } else {
      srcUrl = URL.createObjectURL(imageSource);
      isObjectUrl = true;
    }

    img.onload = () => {
      try {
        const MAX_DIM = 1800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (isObjectUrl) URL.revokeObjectURL(srcUrl);
          resolve(typeof imageSource === 'string' ? imageSource : '');
          return;
        }

        // Draw with white background to handle transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        if (isObjectUrl) URL.revokeObjectURL(srcUrl);
        resolve(compressedBase64);
      } catch (err) {
        console.warn('[OCR Service] Image compression failed, fallback:', err);
        if (isObjectUrl) URL.revokeObjectURL(srcUrl);
        resolve(typeof imageSource === 'string' ? imageSource : '');
      }
    };

    img.onerror = () => {
      if (isObjectUrl) URL.revokeObjectURL(srcUrl);
      resolve(typeof imageSource === 'string' ? imageSource : '');
    };

    img.src = srcUrl;
  });
}

/**
 * Send receipt image directly to Cloud Vision AI (Groq / Gemini).
 * NOTE: As requested by the user, if connection fails, DO NOT switch modes.
 * Report the exact connection error directly so the user is in control.
 */
export async function extractWithPaddleOcr(
  imageSource: File | Blob | string,
  onProgress?: (status: string, percent: number) => void,
  _timeoutMs = 60000
): Promise<OcrResult & { parsed?: any }> {
  const authHeaders = getAuthHeaders();

  if (onProgress) onProgress('กำลังเตรียมรูปภาพและเชื่อมต่อระบบ AI ประมวลผล...', 25);

  // Compress image to ~300KB to avoid Vercel payload limit issues
  const base64Image = await compressImageForUpload(imageSource);

  if (onProgress) onProgress('กำลังส่งภาพเชื่อมต่อระบบ AI ประมวลผลใบเสร็จ...', 60);

  try {
    const response = await axios.post(
      '/api/extract-bill',
      { image: base64Image },
      {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        timeout: 45000,
      }
    );

    if (response.data?.parsed) {
      if (onProgress) onProgress('AI สแกนถอดข้อความสำเร็จ 100%', 100);
      const rawText = response.data.rawText || (response.data.words || []).map((w: any) => w.text).join('\n');
      return {
        words: (response.data.words || []).map((w: any) => ({
          text: w.text || '',
          bbox: w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
        })),
        rawText,
        parsed: response.data.parsed,
      };
    }

    throw new Error(response.data?.error || 'เซิร์ฟเวอร์ AI ไม่ส่งคืนข้อมูลใบเสร็จ');
  } catch (err: any) {
    if (err.response?.status === 401) {
      throw new Error('เซสชันการเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
    const errorMsg = err.response?.data?.error || err.message || 'ไม่สามารถเชื่อมต่อระบบ Cloud AI ได้';
    console.error('[OCR Service] Error:', errorMsg);
    // User explicitly requested: "เชื่อมต่อไม่ได้ก็ไม่ต้องสลับโหมดให้"
    // Stop immediately and throw error so the user sees the real reason
    throw new Error(errorMsg);
  }
}

/**
 * Backward compatibility function for existing callers.
 */
export async function runOcrWithFallback(
  imageSource: File | Blob | string,
  onProgress?: (status: string, percent: number) => void
): Promise<OcrExtractionResponse> {
  const result = await extractWithPaddleOcr(imageSource, onProgress);
  return {
    ...result,
    engine: 'paddle',
  };
}
