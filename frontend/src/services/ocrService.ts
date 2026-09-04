// frontend/src/services/ocrService.ts
import axios from 'axios';
import { type OcrWord, type OcrResult } from '../utils/tesseractWorker';
import { getAuthHeaders } from '../utils/auth';

export interface OcrExtractionResponse {
  words: OcrWord[];
  rawText: string;
  parsed?: any;
  engine: 'paddle' | 'tesseract';
}


/**
 * Send receipt image to PaddleOCR (PP-OCRv5) on backend with Bearer Auth
 * Strictly performs PaddleOCR without falling back to Tesseract.
 */
export async function extractWithPaddleOcr(
  imageSource: File | Blob | string,
  onProgress?: (status: string, percent: number) => void,
  timeoutMs = 300000
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

  if (onProgress) onProgress('กำลังส่งภาพและเชื่อมต่อ AI Vision LPU...', 40);

  try {
    const response = await axios.post('/api/extract-bill', { image: base64Image }, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      timeout: timeoutMs,
    });

    if (onProgress) onProgress('PaddleOCR สแกนถอดข้อความสำเร็จ 100%', 95);

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

    throw new Error(response.data?.error || 'รูปแบบข้อมูลตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง');
  } catch (err: any) {
    if (err.response?.status === 401) {
      throw new Error('เซสชันการเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      throw new Error('เซิร์ฟเวอร์ใช้เวลาประมวลผลนานเกินกำหนด กรุณากดลองใหม่อีกครั้ง');
    }
    const serverErr = err.response?.data?.error || err.response?.data?.message || err.message;
    throw new Error(`ไม่สามารถเชื่อมต่อ PaddleOCR เซิร์ฟเวอร์ได้: ${serverErr}`);
  }
}

/**
 * Backward compatibility function for existing callers, but NEVER silently falls back to Tesseract.
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
