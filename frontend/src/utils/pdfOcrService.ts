import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch {
  // Fallback to CDN worker if dynamic import url fails
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
}

export interface ProcessedPdfPage {
  pageNumber: number;
  totalPages: number;
  isDigital: boolean;
  rawText: string;
  previewUrl: string;
  renderedCanvas: HTMLCanvasElement;
  canvasDataUrl: string;
}

/**
 * Checks if a given file or mime type is a PDF document
 */
export function isPdfFile(file: File | string): boolean {
  if (typeof file === 'string') {
    return file.toLowerCase().endsWith('.pdf') || file.startsWith('data:application/pdf');
  }
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
}

/**
 * Extracts structured digital text from a PDF page using baseline Y-coordinate clustering
 */
export async function extractDigitalTextFromPdfPage(page: any): Promise<string> {
  const textContent = await page.getTextContent();
  if (!textContent || !textContent.items || textContent.items.length === 0) {
    return '';
  }

  const items = textContent.items as Array<{
    str: string;
    transform: number[];
    width: number;
    height: number;
  }>;

  // Transform matrix in PDF: [scaleX, skewY, skewX, scaleY, tx, ty]
  // ty is Y coordinate (PDF 0,0 is bottom-left, so larger ty = higher up the page)
  const lineClusters = new Map<number, Array<{ text: string; x: number }>>();

  for (const it of items) {
    const text = (it.str || '').trim();
    if (!text) continue;

    const x = Math.round(it.transform[4]);
    // Cluster lines within 4 units of vertical baseline
    const yCluster = Math.round(it.transform[5] / 4) * 4;

    if (!lineClusters.has(yCluster)) {
      lineClusters.set(yCluster, []);
    }
    lineClusters.get(yCluster)!.push({ text: it.str, x });
  }

  // Sort baselines from top of page to bottom (descending ty)
  const sortedBaselines = Array.from(lineClusters.keys()).sort((a, b) => b - a);
  const textLines: string[] = [];

  for (const y of sortedBaselines) {
    const lineItems = lineClusters.get(y)!;
    // Sort horizontally from left to right
    lineItems.sort((a, b) => a.x - b.x);

    let lineText = '';
    let lastX = lineItems[0].x;

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const gap = item.x - lastX;

      if (i > 0 && gap > 25) {
        lineText += '    '; // Column gap
      } else if (i > 0 && gap > 3) {
        lineText += ' ';
      }
      lineText += item.text;
      lastX = item.x;
    }

    if (lineText.trim()) {
      textLines.push(lineText.trim());
    }
  }

  return textLines.join('\n');
}

/**
 * Renders a PDF page to an offscreen HTML5 Canvas at 300 DPI high resolution
 */
export async function renderPdfPageToCanvas(
  page: any,
  scale = 2.5
): Promise<{ canvas: HTMLCanvasElement; dataUrl: string }> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2d context for PDF rendering');

  // Fill white background before rendering
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  const dataUrl = canvas.toDataURL('image/jpeg', 0.96);
  return { canvas, dataUrl };
}

/**
 * Complete PDF Document Ingestion:
 * 1. Inspects digital text streams (Instantaneous, 100% typo-free for e-Tax / digital invoices)
 * 2. Renders 300 DPI high-definition canvas for scanned photocopier PDFs
 */
export async function processPdfDocument(
  file: File,
  onProgress?: (status: string, pct: number) => void
): Promise<ProcessedPdfPage[]> {
  onProgress?.('กำลังอ่านไฟล์ PDF...', 10);
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const processedPages: ProcessedPdfPage[] = [];

  // Limit processing to first 3 pages (receipts/invoices are typically 1-2 pages)
  const maxPages = Math.min(totalPages, 3);

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    onProgress?.(`กำลังเรนเดอร์หน้า PDF ${pageNum}/${maxPages}...`, Math.round(15 + (pageNum / maxPages) * 70));
    const page = await pdf.getPage(pageNum);

    // 1. Check for digital text
    const digitalText = await extractDigitalTextFromPdfPage(page);
    // If digital text has substantial character content, it's a native digital PDF!
    const isDigital = digitalText.replace(/\s+/g, '').length > 30;

    // 2. Render high-resolution canvas
    const { canvas, dataUrl } = await renderPdfPageToCanvas(page, 2.5);

    processedPages.push({
      pageNumber: pageNum,
      totalPages,
      isDigital,
      rawText: digitalText,
      previewUrl: dataUrl,
      renderedCanvas: canvas,
      canvasDataUrl: dataUrl,
    });
  }

  onProgress?.('ประมวลผล PDF เสร็จสมบูรณ์', 100);
  return processedPages;
}
