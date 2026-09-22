import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import confetti from 'canvas-confetti';
import { EditorElement, PageDimension, TextElement, WhiteoutElement, DrawElement, ShapeElement, ImageElement } from '../types/editor';

/**
 * Renders page elements to an offscreen canvas at high DPI (e.g. 3x scale)
 * and returns the PNG data URL.
 */
async function renderPageElementsToCanvas(
  elements: EditorElement[],
  dimension: PageDimension,
  scale: number = 3, // 3x scale produces ~300 DPI print quality
  pdfJsPage?: any,
  forceRenderBasePage: boolean = false
): Promise<string | null> {
  const suppressedElements = elements
    .filter((el) => el.type === 'text' && (el as TextElement).originalText)
    .map((el) => {
      const te = el as TextElement;
      return {
        originalText: te.originalText!.trim(),
        rawPdfX: te.rawPdfX,
        rawPdfY: te.rawPdfY,
      };
    })
    .filter((s) => s.originalText.length > 0);

  const shouldRenderBasePage = forceRenderBasePage || (pdfJsPage && suppressedElements.length > 0);

  if (!shouldRenderBasePage && elements.length === 0) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(dimension.width * scale);
  canvas.height = Math.round(dimension.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (shouldRenderBasePage) {
    // Fill white base background for the page
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    // Clear canvas to transparent for overlay-only
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // If base page rendering is needed (either fallback mode or replaced text)
  if (pdfJsPage && shouldRenderBasePage) {
    const origRenderPageChunk = (pdfJsPage as any)._renderPageChunk;
    try {
      const viewport = pdfJsPage.getViewport({ scale });

      if ((pdfJsPage as any)._intentStates) {
        (pdfJsPage as any)._intentStates.clear();
      }

      if (suppressedElements.length > 0 && origRenderPageChunk) {
        const boundOrig = origRenderPageChunk.bind(pdfJsPage);
        (pdfJsPage as any)._renderPageChunk = function (chunk: any, intentState: any) {
          if (suppressedElements.length > 0 && chunk && chunk.fnArray) {
            let currentMatrixY = 0;
            for (let i = 0; i < chunk.length; i++) {
              const fn = chunk.fnArray[i];
              if (fn === pdfjsLib.OPS.setTextMatrix) {
                const m = chunk.argsArray[i];
                if (Array.isArray(m) && m.length >= 6) {
                  currentMatrixY = m[5];
                }
              } else if (fn === pdfjsLib.OPS.showText || fn === pdfjsLib.OPS.showSpacedText) {
                const glyphs = chunk.argsArray[i]?.[0];
                if (Array.isArray(glyphs)) {
                  const text = glyphs
                    .map((g: any) => (typeof g === 'object' && g ? (g.unicode || g.fontChar || '') : ''))
                    .join('')
                    .trim();

                  if (text) {
                    const shouldSuppress = suppressedElements.some((item) => {
                      const target = item.originalText;
                      if (!target) return false;
                      if (text === target) return true;
                      if (text.length >= 2 && target.includes(text)) return true;
                      if (target.length >= 2 && text.includes(target)) return true;

                      const words = target.split(/\s+/).filter((w) => w.length >= 2);
                      if (words.some((w) => text.includes(w) || w.includes(text))) {
                        if (item.rawPdfY !== undefined && currentMatrixY !== 0) {
                          return Math.abs(currentMatrixY - item.rawPdfY) < 15;
                        }
                        return true;
                      }
                      return false;
                    });

                    if (shouldSuppress) {
                      chunk.argsArray[i] = [[]]; // Blank out this text operator!
                    }
                  }
                }
              }
            }
          }
          return boundOrig(chunk, intentState);
        };
      }

      // Render PDF.js page onto offscreen canvas with retry if busy
      let renderAttempts = 0;
      while (renderAttempts < 3) {
        try {
          await pdfJsPage.render({ canvasContext: ctx, viewport }).promise;
          break;
        } catch (renderErr: any) {
          renderAttempts++;
          if (renderAttempts >= 3 || !renderErr?.message?.includes('progress')) {
            console.warn('PDF.js render error in export:', renderErr);
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      }
    } catch (err) {
      console.warn('Error rendering base page with text suppression in export:', err);
    } finally {
      if (origRenderPageChunk) {
        (pdfJsPage as any)._renderPageChunk = origRenderPageChunk;
      }
    }
  }

  // Ensure fonts are loaded before drawing (with safety timeout)
  if (document.fonts) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch (e) {
      console.warn('Font loading check timed out or failed:', e);
    }
  }

  for (const el of elements) {
    ctx.save();
    ctx.globalAlpha = el.opacity ?? 1.0;

    if (el.type === 'whiteout') {
      const we = el as WhiteoutElement;
      ctx.fillStyle = we.fill || '#ffffff';
      ctx.fillRect(we.x * scale, we.y * scale, we.width * scale, we.height * scale);
      if (we.strokeWidth && we.strokeWidth > 0 && we.strokeColor) {
        ctx.strokeStyle = we.strokeColor;
        ctx.lineWidth = we.strokeWidth * scale;
        ctx.strokeRect(we.x * scale, we.y * scale, we.width * scale, we.height * scale);
      }
    } else if (el.type === 'shape') {
      const se = el as ShapeElement;
      ctx.fillStyle = se.fill || 'transparent';
      ctx.strokeStyle = se.strokeColor || '#000000';
      ctx.lineWidth = (se.strokeWidth || 2) * scale;
      const x = se.x * scale;
      const y = se.y * scale;
      const w = se.width * scale;
      const h = se.height * scale;

      ctx.beginPath();
      if (se.shapeType === 'rectangle') {
        if (se.fill && se.fill !== 'transparent') ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      } else if (se.shapeType === 'circle') {
        const radiusX = Math.abs(w / 2);
        const radiusY = Math.abs(h / 2);
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        if (se.fill && se.fill !== 'transparent') ctx.fill();
        ctx.stroke();
      } else if (se.shapeType === 'line') {
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.stroke();
      } else if (se.shapeType === 'arrow') {
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.stroke();

        const angle = Math.atan2(h, w);
        const headlen = 15 * scale;
        ctx.beginPath();
        ctx.moveTo(x + w, y + h);
        ctx.lineTo(
          x + w - headlen * Math.cos(angle - Math.PI / 6),
          y + h - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(x + w, y + h);
        ctx.lineTo(
          x + w - headlen * Math.cos(angle + Math.PI / 6),
          y + h - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    } else if (el.type === 'draw') {
      const de = el as DrawElement;
      if (de.points && de.points.length > 1) {
        ctx.beginPath();
        if (de.isHighlighter) {
          ctx.globalAlpha = 0.4;
        }
        ctx.strokeStyle = de.strokeColor;
        ctx.lineWidth = de.strokeWidth * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.moveTo(de.points[0].x * scale, de.points[0].y * scale);
        for (let i = 1; i < de.points.length; i++) {
          ctx.lineTo(de.points[i].x * scale, de.points[i].y * scale);
        }
        ctx.stroke();
      }
    } else if (el.type === 'image') {
      const ie = el as ImageElement;
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, ie.x * scale, ie.y * scale, ie.width * scale, ie.height * scale);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = ie.dataUrl;
      });
    } else if (el.type === 'text') {
      const te = el as TextElement;
      const x = te.x * scale;
      const y = te.y * scale;
      const w = te.width * scale;
      const h = te.height * scale;

      // Draw background if explicitly specified
      if (te.backgroundColor && te.backgroundColor !== 'transparent') {
        ctx.fillStyle = te.backgroundColor;
        ctx.fillRect(x, y, w, h);
      }

      // Setup typography
      const fontStyle = te.italic ? 'italic ' : '';
      const fontWeight = te.bold ? 'bold ' : 'normal';
      const fontSizePx = te.fontSize * scale;
      ctx.font = `${fontStyle}${fontWeight} ${fontSizePx}px "${te.fontFamily}", sans-serif`;
      ctx.fillStyle = te.color;
      ctx.textBaseline = 'top';

      const lines = te.text.split('\n');
      const lineHeight = (te.lineHeight || 1.25) * fontSizePx;
      let curY = y;

      for (const line of lines) {
        let drawX = x;
        if (te.align === 'center') {
          const textMetrics = ctx.measureText(line);
          drawX = x + Math.max(0, (w - textMetrics.width) / 2);
        } else if (te.align === 'right') {
          const textMetrics = ctx.measureText(line);
          drawX = x + Math.max(0, w - textMetrics.width);
        }

        ctx.fillText(line, drawX, curY);

        if (te.underline) {
          const textMetrics = ctx.measureText(line);
          const lineY = curY + fontSizePx + 2 * scale;
          ctx.beginPath();
          ctx.strokeStyle = te.color;
          ctx.lineWidth = Math.max(1, 1.5 * scale);
          ctx.moveTo(drawX, lineY);
          ctx.lineTo(drawX + textMetrics.width, lineY);
          ctx.stroke();
        }

        curY += lineHeight;
      }
    }

    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}

/**
 * Converts a data URL to Uint8Array bytes
 */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Safe helper to trigger browser file download without premature Object URL revocation.
 */
function downloadBlob(blob: Blob, fileName: string): string {
  const downloadUrl = URL.createObjectURL(blob);
  const effectiveName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = effectiveName;
  link.style.display = 'none';
  document.body.appendChild(link);
  
  // Trigger download
  link.click();

  // Crucial: keep URL active for at least 60 seconds so browser download manager finishes
  setTimeout(() => {
    try {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      // ignore
    }
  }, 60000);

  return downloadUrl;
}

/**
 * Main export function: merges original PDF with high-DPI overlays.
 * Resilient against encrypted PDFs, permission restrictions, and corrupted xrefs.
 */
export async function exportModifiedPdf(
  originalPdfBytes: ArrayBuffer,
  elements: EditorElement[],
  pageDimensions: PageDimension[],
  fileName: string = 'document_edited.pdf',
  pdfJsDoc?: any
): Promise<{ success: boolean; downloadUrl: string; fileName: string }> {
  const effectiveName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  // If pdfJsDoc is available, we build a fresh, uncorrupted, unencrypted PDF
  // embedding high-res 300 DPI vector-faithful renders with authentic Bangla typography!
  if (pdfJsDoc && pdfJsDoc.numPages > 0) {
    const pdfDoc = await PDFDocument.create();
    const totalPages = pdfJsDoc.numPages;

    for (let i = 0; i < totalPages; i++) {
      const dimension = pageDimensions[i] || {
        width: 595.28,
        height: 841.89,
        rotation: 0
      };

      let pdfJsPage = null;
      try {
        pdfJsPage = await pdfJsDoc.getPage(i + 1);
      } catch (e) {
        console.warn(`Could not get PDF.js page ${i + 1} for export:`, e);
      }

      const pageElements = elements.filter(el => el.pageIndex === i);
      const page = pdfDoc.addPage([dimension.width, dimension.height]);

      const overlayDataUrl = await renderPageElementsToCanvas(pageElements, dimension, 3, pdfJsPage, true);
      if (overlayDataUrl) {
        const pngBytes = dataUrlToBytes(overlayDataUrl);
        const pngImage = await pdfDoc.embedPng(pngBytes);
        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: dimension.width,
          height: dimension.height,
        });
      }
    }

    const modifiedPdfBytes = await pdfDoc.save({ useObjectStreams: false });
    const blob = new Blob([modifiedPdfBytes as any], { type: 'application/pdf' });
    const downloadUrl = downloadBlob(blob, effectiveName);

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // Ignore confetti issues
    }

    return { success: true, downloadUrl, fileName: effectiveName };
  }

  // Fallback if pdfJsDoc is somehow not supplied
  let safeBytes: Uint8Array;
  if (originalPdfBytes instanceof Uint8Array) {
    safeBytes = originalPdfBytes;
  } else {
    try {
      safeBytes = new Uint8Array(originalPdfBytes);
    } catch (e) {
      throw new Error('Original PDF buffer is detached or unavailable.');
    }
  }

  const pdfDoc = await PDFDocument.load(safeBytes, {
    ignoreEncryption: true,
    throwOnInvalidObject: false
  });

  const pageCount = pdfDoc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const pageElements = elements.filter(el => el.pageIndex === i);
    if (pageElements.length === 0) continue;

    const dimension = pageDimensions[i] || {
      width: pdfDoc.getPage(i).getWidth(),
      height: pdfDoc.getPage(i).getHeight(),
      rotation: 0
    };

    const overlayDataUrl = await renderPageElementsToCanvas(pageElements, dimension, 3);
    if (!overlayDataUrl) continue;

    const pngBytes = dataUrlToBytes(overlayDataUrl);
    const pngImage = await pdfDoc.embedPng(pngBytes);
    const page = pdfDoc.getPage(i);

    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: dimension.width,
      height: dimension.height,
    });
  }

  const modifiedPdfBytes = await pdfDoc.save({ useObjectStreams: false });
  const blob = new Blob([modifiedPdfBytes as any], { type: 'application/pdf' });
  const downloadUrl = downloadBlob(blob, effectiveName);

  try {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  } catch (e) {
    // Ignore confetti issues
  }

  return { success: true, downloadUrl, fileName: effectiveName };
}
