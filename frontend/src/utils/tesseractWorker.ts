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

/**
 * NOTE on the "Parameter not found: ..." warnings:
 * These come from inside the Tesseract WASM core (tesseract-core-*.wasm.js),
 * running inside tesseract.js's own Web Worker thread. They are emitted via
 * the Emscripten module's internal stdout/stderr -> console.warn binding,
 * which is set up when that worker's JS context evaluates the wasm glue code.
 *
 * Because that happens in a *separate* worker thread, patching
 * `console.warn`/`console.error` here (main thread) cannot intercept it —
 * there are two independent `console` objects involved. That's why previous
 * attempts to monkey-patch console had no visible effect.
 *
 * The only reliable ways to actually remove these lines are:
 *   1. Use a tesseract.js version / traineddata combo that doesn't set these
 *      legacy (non-LSTM) parameters at all (check naptha/tesseract.js issues
 *      for your version).
 *   2. Provide a custom worker script (via the `workerPath` option) that
 *      patches console.warn *inside* the worker before the core is loaded.
 *
 * What we do below is a best-effort mitigation that doesn't fully suppress
 * the raw console lines, but keeps our own logging clean and gives us a
 * single place to extend if we later go with option 1 or 2.
 */
const NOISY_PARAM_WARNING = 'Parameter not found';

function createPatchedWorkerUrl(): string {
  const cdnWorkerPath = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js';
  const patchCode = `
    const _warn = self.console.warn;
    const _error = self.console.error;
    const shouldFilter = (args) => args.some(a => typeof a === 'string' && a.includes('Parameter not found'));

    self.console.warn = function(...args) {
      if (shouldFilter(args)) return;
      _warn.apply(self.console, args);
    };
    self.console.error = function(...args) {
      if (shouldFilter(args)) return;
      _error.apply(self.console, args);
    };

    importScripts("${cdnWorkerPath}");
  `;
  const blob = new Blob([patchCode], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

function spawnWorkerPromise(
  lang: string,
  oem: OEM,
  options: {
    workerPath: string;
    workerBlobURL: boolean;
    corePath?: string;
    langPath?: string;
    gzip: boolean;
    logger?: (m: any) => void;
  },
  timeoutMs = 35000
): Promise<any> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let workerInstance: any = null;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        if (workerInstance) {
          try { workerInstance.terminate(); } catch (_) {}
        }
        reject(new Error(`Tesseract initialization timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    createWorker(lang, oem, {
      ...options,
      logger: options.logger,
      errorHandler: (err: any) => {
        const msg = typeof err === 'string' ? err : err?.message ?? String(err);
        if (msg.includes(NOISY_PARAM_WARNING)) return;
        console.error('[Tesseract error]', err);
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          if (workerInstance) {
            try { workerInstance.terminate(); } catch (_) {}
          }
          reject(new Error(msg));
        }
      },
    } as any)
      .then((w) => {
        workerInstance = w;
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(w);
        } else {
          try { w.terminate(); } catch (_) {}
        }
      })
      .catch((err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      });
  });
}

export type OcrModelType = 'best' | 'fast';
let currentModel: OcrModelType = 'best';

export function setOcrModel(model: OcrModelType) {
  if (currentModel !== model) {
    currentModel = model;
    terminateWorker();
  }
}

export function getOcrModel(): OcrModelType {
  return currentModel;
}

export async function initWorker(lang: string = 'tha+eng') {
  if (!workerPromise) {
    workerPromise = (async () => {
      const patchedWorkerPath = createPatchedWorkerUrl();
      const logger = (m: any) => {
        const msg = typeof m === 'string' ? m : m?.message ?? '';
        if (msg.includes(NOISY_PARAM_WARNING)) return;
        console.log('[Tesseract Neural]', m);
      };

      const oem = currentModel === 'best' ? OEM.LSTM_ONLY : OEM.DEFAULT;
      // Use verified SIMD core to avoid Emscripten relaxedsimd missing function DotProductSSE
      const corePath = currentModel === 'best'
        ? 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v7.0.0/tesseract-core-simd-lstm.wasm.js'
        : 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v7.0.0/tesseract-core-simd.wasm.js';

      let w: any;
      try {
        // Attempt 1: Load official integerized model (4.0.0_best_int) with verified SIMD WASM core
        w = await spawnWorkerPromise(lang, oem, {
          workerPath: patchedWorkerPath,
          workerBlobURL: false,
          corePath,
          gzip: true,
          logger,
        }, 35000);
      } catch (primaryErr) {
        console.warn(`[Tesseract] SIMD core failed, falling back to standard CDN core:`, primaryErr);
        try {
          // Attempt 2: Fallback without explicit corePath
          w = await spawnWorkerPromise(lang, oem, {
            workerPath: patchedWorkerPath,
            workerBlobURL: false,
            gzip: true,
            logger,
          }, 35000);
        } catch (fallbackErr) {
          workerPromise = null;
          throw fallbackErr;
        }
      }

      await w.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK as any,
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
      });

      return w;
    })().catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

export async function runTesseract(
  imageSource: File | string,
  onProgress?: (pct: number) => void,
  options?: { psm?: string }
): Promise<OcrResult> {
  const w = await initWorker('tha+eng');
  if (options?.psm) {
    await w.setParameters({ tessedit_pageseg_mode: options.psm as any });
  } else {
    await w.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK as any });
  }

  const ret = await w.recognize(imageSource);
  if (onProgress) onProgress(100);

  const rawText = ret.data.text || '';
  const words: OcrWord[] = ((ret.data as any).words || []).map((w: any) => ({
    text: w.text,
    bbox: { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 },
  }));

  return { words, rawText };
}

export interface MultiPassItem {
  id: string;
  label: string;
  src: string | File;
}

export async function runMultiPassTesseract(
  passes: MultiPassItem[],
  onProgress?: (stepLabel: string, percent: number) => void
): Promise<Record<string, OcrResult>> {
  const w = await initWorker('tha+eng');
  await w.setParameters({ 
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK as any,
    preserve_interword_spaces: '1'
  });
  const results: Record<string, OcrResult> = {};
  const total = passes.length;

  for (let i = 0; i < passes.length; i++) {
    const pass = passes[i];
    if (onProgress) {
      onProgress(pass.label, Math.round(((i) / total) * 100));
    }
    const ret = await w.recognize(pass.src);
    const rawText = ret.data.text || '';
    const words: OcrWord[] = ((ret.data as any).words || []).map((wItem: any) => ({
      text: wItem.text,
      bbox: { x0: wItem.bbox.x0, y0: wItem.bbox.y0, x1: wItem.bbox.x1, y1: wItem.bbox.y1 },
    }));
    results[pass.id] = { rawText, words };
    if (onProgress) {
      onProgress(pass.label, Math.round(((i + 1) / total) * 100));
    }
  }

  return results;
}

export async function terminateWorker() {
  if (workerPromise) {
    const p = workerPromise;
    workerPromise = null;
    try {
      const w = await p;
      if (w && typeof w.terminate === 'function') {
        await w.terminate();
      }
    } catch (_) {
      // ignore termination errors
    }
  }
}