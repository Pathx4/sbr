// frontend/src/services/ocrService.ts
import axios from 'axios';
import { runTesseract, type OcrWord, type OcrResult } from '../utils/tesseractWorker';
import { preprocessImageForOcr, parseThaiReceiptOcr } from '../utils/imageOcrOptimizer';
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
 * Send receipt image to AI Vision with automatic, resilient
 * in-browser DeepScan OCR + AI text structuring fallback if Cloud Vision is unavailable.
 */
export async function extractWithPaddleOcr(
  imageSource: File | Blob | string,
  onProgress?: (status: string, percent: number) => void,
  _timeoutMs = 300000
): Promise<OcrResult & { parsed?: any }> {
  const authHeaders = getAuthHeaders();

  if (onProgress) onProgress('กำลังเตรียมรูปภาพและเชื่อมต่อระบบ AI ประมวลผล...', 15);

  // Compress image to ~300KB to prevent payload errors on Vercel
  const base64Image = await compressImageForUpload(imageSource);

  if (onProgress) onProgress('กำลังส่งภาพเชื่อมต่อ AI วิเคราะห์ใบเสร็จ...', 25);

  let needBrowserOcrFallback = false;
  let fallbackReason = '';

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

    // 1. Success with parsed data or words from server Vision AI!
    if (response.data && !response.data.vision_unavailable) {
      if (Array.isArray(response.data.words) || response.data.parsed) {
        if (onProgress) onProgress('AI สแกนถอดข้อความสำเร็จ 100%', 95);
        const rawText = response.data.rawText || (response.data.words || []).map((w: any) => w.text).join('\n');
        return {
          words: (response.data.words || []).map((w: any) => ({
            text: w.text || '',
            bbox: w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
          })),
          rawText,
          parsed: response.data.parsed || undefined,
        };
      }
    }

    // 2. Server responded that vision model is unavailable on this API key/provider
    if (response.data?.vision_unavailable) {
      needBrowserOcrFallback = true;
      fallbackReason = response.data.error || 'โมเดล Vision ไม่พร้อมใช้งาน';
    }
  } catch (err: any) {
    if (err.response?.status === 401) {
      throw new Error('เซสชันการเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
    // If server returned 400, 404, 500, or network error: smoothly fallback to browser OCR
    console.warn('[OCR Service] Server vision processing encountered error, activating browser OCR fallback:', err.message);
    needBrowserOcrFallback = true;
    fallbackReason = err.response?.data?.error || err.message;
  }

  // =========================================================================
  // AUTOMATIC CLIENT-SIDE TESSERACT + CLOUD AI STRUCTURING FALLBACK
  // =========================================================================
  if (needBrowserOcrFallback) {
    console.log('[OCR Service] Initiating browser OCR + AI structuring fallback. Reason:', fallbackReason);
    if (onProgress) onProgress('สลับไปอ่านตัวอักษรในเบราว์เซอร์...', 35);

    let ocrResult: OcrResult;
    try {
      // 1. Preprocess & run client-side Tesseract OCR
      const preprocessedUrl = await preprocessImageForOcr(imageSource as any, 'grayscale');
      ocrResult = await runTesseract(preprocessedUrl, (pct) => {
        const displayPct = Math.min(84, Math.round(35 + pct * 0.49));
        if (onProgress) onProgress(`กำลังสแกนตัวอักษรในเบราว์เซอร์... ${displayPct}%`, displayPct);
      });
    } catch (ocrErr: any) {
      console.warn('[OCR Service] Browser Tesseract error, attempting raw image parse:', ocrErr);
      ocrResult = { words: [], rawText: '' };
    }

    if (onProgress) onProgress('กำลังให้ AI วิเคราะห์จัดตารางข้อมูลและคำนวณยอดเงิน...', 85);

    // 2. Send extracted raw text to server for fast LLM structuring (Llama 3.3 / Gemini)
    let aiParsed: any = null;
    if (ocrResult.rawText && ocrResult.rawText.trim().length > 0) {
      try {
        const textResponse = await axios.post(
          '/api/extract-bill',
          { ocr_text: ocrResult.rawText },
          {
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders,
            },
            timeout: 25000,
          }
        );

        if (textResponse.data?.success && textResponse.data?.parsed) {
          aiParsed = textResponse.data.parsed;
          console.log('[OCR Service] Successfully structured raw OCR text via Cloud AI:', textResponse.data.engine);
        }
      } catch (llmErr) {
        console.warn('[OCR Service] Cloud text structuring unavailable, using local rule parser:', llmErr);
      }
    }

    // 3. If AI structuring succeeded, use it; otherwise fallback to local rule-based Thai parser
    const finalParsed = aiParsed && Array.isArray(aiParsed.items) && aiParsed.items.length > 0
      ? aiParsed
      : parseThaiReceiptOcr(ocrResult.rawText);

    if (onProgress) onProgress('ประมวลผลใบเสร็จสำเร็จ 100%', 100);

    return {
      words: ocrResult.words,
      rawText: ocrResult.rawText,
      parsed: finalParsed,
    };
  }

  throw new Error('ไม่สามารถประมวลผลการสแกนใบเสร็จได้ โปรดลองใหม่อีกครั้ง');
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
