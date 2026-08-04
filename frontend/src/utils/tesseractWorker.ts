// src/utils/tesseractWorker.ts
import { createWorker, OEM, PSM } from 'tesseract.js';

export interface OcrWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}
export interface OcrResult {
  words: OcrWord[];
  rawText: string;
}

let workerPromise: Promise<any> | null = null;

export async function initWorker(lang: string = 'tha+eng') {
  if (!workerPromise) {
    workerPromise = (async () => {
      const w = await createWorker(lang, OEM.LSTM_ONLY, {
        logger: (m: any) => console.log('[Tesseract]', m),
      });
      await w.setParameters({
        tessedit_pageseg_mode: PSM.AUTO as any,
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
      });
      return w;
    })();
  }
  return workerPromise;
}

export async function runTesseract(
  imageSource: File | string,
  onProgress?: (pct: number) => void,
): Promise<OcrResult> {
  const w = await initWorker('tha+eng');
  const ret = await w.recognize(imageSource);
  if (onProgress) onProgress(100);

  const rawText = ret.data.text || '';
  const words: OcrWord[] = ((ret.data as any).words || []).map((w: any) => ({
    text: w.text,
    bbox: { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 },
  }));

  return { words, rawText };
}

export async function terminateWorker() {
  if (workerPromise) {
    const w = await workerPromise;
    await w.terminate();
    workerPromise = null;
  }
}

