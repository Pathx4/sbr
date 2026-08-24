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

export async function initWorker(lang: string = 'tha+eng') {
  if (!workerPromise) {
    workerPromise = (async () => {
      const patchedWorkerPath = createPatchedWorkerUrl();
      const w = await createWorker(lang, OEM.LSTM_ONLY, {
        workerPath: patchedWorkerPath,
        workerBlobURL: false,
        logger: (m: any) => {
          const msg = typeof m === 'string' ? m : m?.message ?? '';
          if (msg.includes(NOISY_PARAM_WARNING)) return;
          console.log('[Tesseract]', m);
        },
        errorHandler: (err: any) => {
          const msg = typeof err === 'string' ? err : err?.message ?? String(err);
          if (msg.includes(NOISY_PARAM_WARNING)) return;
          console.error('[Tesseract error]', err);
        },
      } as any);

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
    const w = await workerPromise;
    await w.terminate();
    workerPromise = null;
  }
}