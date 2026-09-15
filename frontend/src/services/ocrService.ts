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
 * Send receipt image to AI Vision (or PaddleOCR backend) with automatic, resilient
 * in-browser DeepScan OCR + AI text structuring fallback if Cloud Vision is unavailable.
 */
export async function extractWithPaddleOcr(
  imageSource: File | Blob | string,
  onProgress?: (status: string, percent: number) => void,
  _timeoutMs = 300000
): Promise<OcrResult & { parsed?: any }> {
  // Convert image to Base64
  let base64Image = '';
  if (typeof imageSource === 'string') {
    base64Image = imageSource;
  } else if (imageSource instanceof File || imageSource instanceof Blob) {
    base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageSource);
    });
  }

  const authHeaders = getAuthHeaders();

  if (onProgress) onProgress('กำลังส่งภาพและเชื่อมต่อระบบ AI ประมวลผลใบเสร็จ...', 25);

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

    // 1. Success with parsed data or word bboxes from server!
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

    // 2. Server responded that vision model is unavailable on the key
    if (response.data?.vision_unavailable) {
      needBrowserOcrFallback = true;
      fallbackReason = response.data.error || 'โมเดล Vision ไม่พร้อมใช้งาน';
    }
  } catch (err: any) {
    if (err.response?.status === 401) {
      throw new Error('เซสชันการเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
    // If server returned 404, 500, ECONNABORTED, or network error: fallback to browser OCR
    console.warn('[OCR Service] Server vision processing encountered error, activating browser OCR fallback:', err.message);
    needBrowserOcrFallback = true;
    fallbackReason = err.response?.data?.error || err.message;
  }

  // =========================================================================
  // AUTOMATIC CLIENT-SIDE TESSERACT + CLOUD AI STRUCTURING FALLBACK
  // =========================================================================
  if (needBrowserOcrFallback) {
    console.log('[OCR Service] Initiating browser OCR + AI structuring fallback. Reason:', fallbackReason);
    if (onProgress) onProgress('ระบบคลาวด์ Vision ไม่พร้อมใช้งาน กำลังสลับไปอ่านตัวอักษรในเบราว์เซอร์...', 35);

    // 1. Preprocess & run client-side Tesseract OCR
    const preprocessedUrl = await preprocessImageForOcr(imageSource as any, 'grayscale');
    const ocrResult = await runTesseract(preprocessedUrl, (pct) => {
      if (onProgress) onProgress(`กำลังสแกนตัวอักษรในเบราว์เซอร์... ${pct}%`, Math.round(35 + pct * 0.45));
    });

    if (onProgress) onProgress('กำลังให้ AI วิเคราะห์จัดตารางข้อมูลและคำนวณยอดเงิน...', 85);

    // 2. Send extracted raw text to server for fast LLM structuring (Llama 3.3 / Gemini)
    let aiParsed: any = null;
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
