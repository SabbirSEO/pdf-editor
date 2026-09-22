import * as pdfjsLib from 'pdfjs-dist';
import { PageDimension } from '../types/editor';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.js`;

export async function loadPdfDocument(data: ArrayBuffer) {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(data.slice(0)),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
  });
  return await loadingTask.promise;
}

export async function getPdfPageDimensions(pdfDoc: any): Promise<PageDimension[]> {
  const dimensions: PageDimension[] = [];
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    dimensions.push({
      width: viewport.width,
      height: viewport.height,
      rotation: viewport.rotation || 0,
    });
  }
  return dimensions;
}

/**
 * Creates a blank single page A4 PDF in ArrayBuffer format
 */
export async function createBlankPdfBytes(): Promise<ArrayBuffer> {
  const { PDFDocument } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  // Standard A4: 595.28 x 841.89 points
  pdfDoc.addPage([595.28, 841.89]);
  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer as ArrayBuffer;
}
