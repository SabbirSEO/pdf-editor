import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  EditorElement, 
  PageDimension, 
  ToolType, 
  TextElement, 
  WhiteoutElement, 
  DrawElement, 
  ShapeElement, 
  ImageElement,
  FontFamily,
  DrawPoint
} from '../types/editor';
import { Edit3, Copy, Trash2, Check, Move, Download } from 'lucide-react';

interface ExtractedTextItem {
  id: string;
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  rawPdfX?: number;
  rawPdfY?: number;
  color?: string;
  fontFamily?: string;
  rawFontName?: string;
  bold?: boolean;
  italic?: boolean;
  embeddedFontData?: Uint8Array;
}

function cleanFontFamily(rawName: string | undefined, isBangla: boolean): string {
  if (!rawName) return isBangla ? 'Nikosh' : 'Roboto';
  // Strip PDF subset prefix like "ABCDEF+" or "BAAAAA+"
  const name = rawName.replace(/^[A-Z]{6}\+/, '').trim();

  if (/nikosh/i.test(name)) return 'Nikosh';
  if (/kalpurush/i.test(name)) return 'Kalpurush';
  if (/tiro/i.test(name)) return 'Tiro Bangla';
  if (/solaiman/i.test(name)) return 'SolaimanLipi';
  if (/siyam/i.test(name)) return 'Siyam Rupali';
  if (/adorsho/i.test(name)) return 'Adorsholipi';
  if (/boshonto/i.test(name)) return 'Boshonto';
  if (/arial/i.test(name) || /helvetica/i.test(name)) return 'Arial';
  if (/roboto/i.test(name)) return 'Roboto';
  if (/times/i.test(name)) return 'Times New Roman';
  if (/courier/i.test(name)) return 'Courier New';
  if (/inter/i.test(name)) return 'Inter';

  // Clean font suffixes like -Bold, -Regular, MT, PSMT
  const cleaned = name.replace(/-(Bold|Italic|Regular|BoldItalic|MT|PSMT)$/i, '').trim();
  return cleaned || (isBangla ? 'Nikosh' : 'Roboto');
}

interface PdfPageProps {
  pdfDoc: any;
  pageIndex: number;
  dimension: PageDimension;
  scale: number;
  elements: EditorElement[];
  selectedElementId: string | null;
  activeTool: ToolType;
  defaultFont: FontFamily;
  defaultFontSize: number;
  defaultColor: string;
  defaultStrokeWidth: number;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (updated: EditorElement, commitToHistory?: boolean) => void;
  onCommitHistory?: () => void;
  onAddElement: (newEl: EditorElement) => void;
  onDeleteElement: (id: string) => void;
}

export const PdfPage: React.FC<PdfPageProps> = ({
  pdfDoc,
  pageIndex,
  dimension,
  scale,
  elements,
  selectedElementId,
  activeTool,
  defaultFont,
  defaultFontSize,
  defaultColor,
  defaultStrokeWidth,
  onSelectElement,
  onUpdateElement,
  onCommitHistory,
  onAddElement,
  onDeleteElement,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Extracted PDF text layer items
  const [extractedTexts, setExtractedTexts] = useState<ExtractedTextItem[]>([]);

  // Creation / Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<DrawPoint[]>([]);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrag, setCurrentDrag] = useState<{ x: number; y: number } | null>(null);

  // Element moving & resizing state
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizingElementId, setResizingElementId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);

  // Active text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-focus and adjust height of textarea
  useEffect(() => {
    if (editingTextId && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      // Adjust height to fit content
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [editingTextId]);



  // Track text items that have been replaced on this page
  const suppressedElements = elements
    .filter((el) => el.pageIndex === pageIndex && el.type === 'text' && (el as TextElement).originalText)
    .map((el) => {
      const te = el as TextElement;
      return {
        originalText: te.originalText!.trim(),
        rawPdfX: te.rawPdfX,
        rawPdfY: te.rawPdfY,
      };
    })
    .filter((s) => s.originalText.length > 0);
  const suppressedKey = suppressedElements.map((s) => `${s.originalText}_${s.rawPdfY ?? ''}`).join('|');

  // Render PDF.js page onto canvas and extract text content
  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (!pdfDoc || !canvasRef.current) return;
      try {
        const page = await pdfDoc.getPage(pageIndex + 1);
        if (isCancelled) return;

        const pixelRatio = window.devicePixelRatio || 2;
        const viewport = page.getViewport({ scale: scale * pixelRatio });
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Pre-fetch operator list to extract font, color, and size metadata
        let opMetaList: Array<{
          text: string;
          color: string;
          fontId: string;
          fontSize: number;
          x: number;
          y: number;
        }> = [];

        try {
          const opList = await page.getOperatorList();
          let curColor = '#000000';
          let curFontId = '';
          let curFontSize = 14;
          let curX = 0;
          let curY = 0;

          for (let i = 0; i < opList.fnArray.length; i++) {
            const fn = opList.fnArray[i];
            const args = opList.argsArray[i];

            if (fn === pdfjsLib.OPS.setFillRGBColor) {
              if (args && args.length >= 3) {
                const r = args[0] <= 1 && args[1] <= 1 && args[2] <= 1 && (args[0] > 0 || args[1] > 0 || args[2] > 0)
                  ? Math.round(args[0] * 255)
                  : Math.round(args[0]);
                const g = args[0] <= 1 && args[1] <= 1 && args[2] <= 1 && (args[0] > 0 || args[1] > 0 || args[2] > 0)
                  ? Math.round(args[1] * 255)
                  : Math.round(args[1]);
                const b = args[0] <= 1 && args[1] <= 1 && args[2] <= 1 && (args[0] > 0 || args[1] > 0 || args[2] > 0)
                  ? Math.round(args[2] * 255)
                  : Math.round(args[2]);
                curColor = '#' + [r, g, b].map((x) => Math.min(255, Math.max(0, x)).toString(16).padStart(2, '0')).join('');
              }
            } else if (fn === pdfjsLib.OPS.setFillGray) {
              if (args && args.length >= 1) {
                const v = args[0] <= 1 && args[0] > 0 ? Math.round(args[0] * 255) : Math.round(args[0]);
                curColor = '#' + [v, v, v].map((x) => Math.min(255, Math.max(0, x)).toString(16).padStart(2, '0')).join('');
              }
            } else if (fn === pdfjsLib.OPS.setFont) {
              if (args && args.length >= 2) {
                curFontId = args[0];
                curFontSize = args[1];
              }
            } else if (fn === pdfjsLib.OPS.setTextMatrix) {
              if (args && args.length >= 6) {
                curX = args[4];
                curY = args[5];
              }
            } else if (fn === pdfjsLib.OPS.showText || fn === pdfjsLib.OPS.showSpacedText) {
              const glyphs = args?.[0];
              if (Array.isArray(glyphs)) {
                const text = glyphs
                  .map((g: any) => (typeof g === 'object' && g ? (g.unicode || g.fontChar || '') : ''))
                  .join('')
                  .trim();
                if (text) {
                  opMetaList.push({
                    text,
                    color: curColor,
                    fontId: curFontId,
                    fontSize: curFontSize,
                    x: curX,
                    y: curY,
                  });
                }
              }
            }
          }
        } catch (e) {
          console.warn('Could not extract operator list metadata:', e);
        }

        // Clear cached intentStates so the page operator stream is freshly pumped for rendering
        if ((page as any)._intentStates) {
          (page as any)._intentStates.clear();
        }

        // Hook _renderPageChunk on this page instance to suppress operators for replaced text
        const origRenderPageChunk = (page as any)._renderPageChunk
          ? (page as any)._renderPageChunk.bind(page)
          : null;

        if (origRenderPageChunk) {
          (page as any)._renderPageChunk = function (chunk: any, intentState: any) {
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

                        // Check word-level match for Bengali / English
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
                        chunk.argsArray[i] = [[]]; // Blank out this text operator from rendering!
                      }
                    }
                  }
                }
              }
            }
            return origRenderPageChunk(chunk, intentState);
          };
        }

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // Extract Text Content for in-place selection, click-to-edit, and detected font matching
        try {
          const textContent = await page.getTextContent();
          if (isCancelled) return;

          const items: ExtractedTextItem[] = [];
          for (let i = 0; i < textContent.items.length; i++) {
            const item = textContent.items[i] as any;
            if (!item.str || !item.str.trim()) continue;

            const [vx, vy] = unscaledViewport.convertToViewportPoint(item.transform[4], item.transform[5]);
            const fontSize = Math.abs(item.transform[0]) || 12;
            const itemHeight = item.height || fontSize;
            const topY = vy - itemHeight;
            const rawPdfX = item.transform[4];
            const rawPdfY = item.transform[5];
            const isBangla = /[\u0980-\u09FF]/.test(item.str);

            // Match with operator metadata
            const cleanStr = item.str.trim();
            const matchedMeta = opMetaList.find(
              (m) =>
                (m.text === cleanStr || m.text.includes(cleanStr) || cleanStr.includes(m.text)) &&
                Math.abs(m.y - rawPdfY) < 6
            ) || opMetaList.find(
              (m) => Math.abs(m.y - rawPdfY) < 6 && Math.abs(m.x - rawPdfX) < 20
            );

            const fontId = matchedMeta?.fontId || item.fontName;
            const fontObj = fontId && page.commonObjs.has(fontId) ? page.commonObjs.get(fontId) : null;

            const rawFontName = fontObj?.name || (textContent.styles[item.fontName]?.fontFamily) || '';
            const detectedFamily = cleanFontFamily(rawFontName, isBangla);
            const isBold = Boolean(fontObj?.bold || /bold|black/i.test(rawFontName));
            const isItalic = Boolean(fontObj?.italic || /italic|oblique/i.test(rawFontName));
            const detectedColor = matchedMeta?.color || '#000000';
            const detectedFontSize = matchedMeta?.fontSize || Math.round(fontSize);

            // Dynamically register embedded font in browser if available
            if (fontObj?.data && fontObj.data.length > 0 && typeof FontFace !== 'undefined') {
              try {
                let alreadyRegistered = false;
                for (const f of (document.fonts as any)) {
                  if (f.family === detectedFamily) {
                    alreadyRegistered = true;
                    break;
                  }
                }
                if (!alreadyRegistered) {
                  const fontBlob = new Blob([fontObj.data as any], { type: fontObj.mimetype || 'font/truetype' });
                  const fontUrl = URL.createObjectURL(fontBlob);
                  const dynFontFace = new FontFace(detectedFamily, `url(${fontUrl})`, {
                    weight: isBold ? 'bold' : 'normal',
                    style: isItalic ? 'italic' : 'normal',
                  });
                  dynFontFace.load().then((face) => {
                    document.fonts.add(face);
                  }).catch(() => {});
                }
              } catch (err) {
                console.warn('Could not register dynamic FontFace:', err);
              }
            }

            items.push({
              id: `pdf_text_${pageIndex}_${i}`,
              str: item.str,
              x: vx,
              y: topY,
              width: item.width || item.str.length * fontSize * 0.6,
              height: itemHeight,
              fontSize: detectedFontSize,
              rawPdfX,
              rawPdfY,
              color: detectedColor,
              fontFamily: detectedFamily,
              rawFontName,
              bold: isBold,
              italic: isItalic,
              embeddedFontData: fontObj?.data,
            });
          }
          setExtractedTexts(items);
        } catch (e) {
          console.warn('Could not extract text layer:', e);
        }
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, pageIndex, scale, suppressedKey]);

  const displayWidth = dimension.width * scale;
  const displayHeight = dimension.height * scale;

  // Convert mouse event to PDF unscaled coordinates
  const getPdfCoords = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    return {
      x: clientX / scale,
      y: clientY / scale,
    };
  };

  // Convert existing PDF text item into editable element with detected font, size, and color
  const handleEditExtractedText = (item: ExtractedTextItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // If an element already replaces this exact text, select and open it
    const existing = elements.find(
      (el) => el.pageIndex === pageIndex && el.type === 'text' && (el as TextElement).originalText === item.str
    );
    if (existing) {
      onSelectElement(existing.id);
      setEditingTextId(existing.id);
      return;
    }

    // Auto-detect Bengali vs English
    const isBangla = /[\u0980-\u09FF]/.test(item.str);
    const chosenFont = item.fontFamily || (isBangla ? 'Nikosh' : 'Roboto');

    // Add editable text element with 100% transparent background and detected typography
    const newText: TextElement = {
      id: `text_${Date.now()}`,
      pageIndex,
      type: 'text',
      originalText: item.str,
      rawPdfX: item.rawPdfX,
      rawPdfY: item.rawPdfY,
      x: item.x,
      y: item.y,
      width: Math.max(90, item.width + 25),
      height: Math.max(22, item.height + 4),
      text: item.str,
      fontFamily: chosenFont,
      fontSize: item.fontSize || defaultFontSize,
      color: item.color || '#000000',
      bold: item.bold ?? false,
      italic: item.italic ?? false,
      underline: false,
      align: 'left',
      backgroundColor: 'transparent',
      detectedFontName: item.rawFontName || chosenFont,
      embeddedFontData: item.embeddedFontData,
    };
    onAddElement(newText);
    onSelectElement(newText.id);
    setEditingTextId(newText.id);
  };

  // Mouse down on page
  const handleMouseDown = (e: React.MouseEvent) => {
    // If clicked on an element's action button or handle, let it handle
    if (
      (e.target as HTMLElement).closest('.text-action-bar') ||
      (e.target as HTMLElement).closest('.resize-handle') ||
      (e.target as HTMLElement).closest('.drag-handle')
    ) {
      return;
    }

    const coords = getPdfCoords(e);

    if (activeTool === 'select') {
      // If clicked empty space, deselect
      if (!(e.target as HTMLElement).closest('.editor-element-box')) {
        onSelectElement(null);
        setEditingTextId(null);
      }
      return;
    }

    if (activeTool === 'text') {
      // If clicked on or near an existing extracted text item, edit that text item directly!
      const hitItem = extractedTexts.find(
        (it) =>
          coords.x >= it.x - 4 &&
          coords.x <= it.x + it.width + 4 &&
          coords.y >= it.y - 4 &&
          coords.y <= it.y + it.height + 4
      );
      if (hitItem) {
        handleEditExtractedText(hitItem);
        return;
      }

      const isBangla = defaultFont === 'Nikosh' || defaultFont === 'Kalpurush';
      const newText: TextElement = {
        id: `text_${Date.now()}`,
        pageIndex,
        type: 'text',
        x: coords.x,
        y: coords.y,
        width: 180,
        height: 28,
        text: isBangla ? 'এখানে লিখুন' : 'Type here',
        fontFamily: defaultFont,
        fontSize: defaultFontSize,
        color: defaultColor,
        bold: false,
        italic: false,
        underline: false,
        align: 'left',
        backgroundColor: 'transparent', // 100% transparent by default
      };
      onAddElement(newText);
      onSelectElement(newText.id);
      setEditingTextId(newText.id);
      return;
    }

    if (activeTool === 'draw' || activeTool === 'highlight') {
      setIsDrawing(true);
      setDrawPoints([coords]);
      return;
    }

    if (['whiteout', 'rectangle', 'circle', 'line', 'arrow'].includes(activeTool)) {
      setDragStart(coords);
      setCurrentDrag(coords);
    }
  };

  // Mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getPdfCoords(e);

    if (isDrawing) {
      setDrawPoints((prev) => [...prev, coords]);
      return;
    }

    if (dragStart) {
      setCurrentDrag(coords);
      return;
    }

    if (draggingElementId) {
      const el = elements.find((x) => x.id === draggingElementId);
      if (el) {
        // Fast live update without pushing to history during drag!
        onUpdateElement({
          ...el,
          x: Math.max(0, coords.x - dragOffset.x),
          y: Math.max(0, coords.y - dragOffset.y),
        }, false);
      }
      return;
    }

    if (resizingElementId && resizeHandle) {
      const el = elements.find((x) => x.id === resizingElementId);
      if (el) {
        let newWidth = el.width;
        let newHeight = el.height;
        let newX = el.x;
        let newY = el.y;

        if (resizeHandle.includes('e')) newWidth = Math.max(30, coords.x - el.x);
        if (resizeHandle.includes('s')) newHeight = Math.max(20, coords.y - el.y);
        if (resizeHandle.includes('w')) {
          const delta = coords.x - el.x;
          newWidth = Math.max(30, el.width - delta);
          newX = coords.x;
        }
        if (resizeHandle.includes('n')) {
          const delta = coords.y - el.y;
          newHeight = Math.max(20, el.height - delta);
          newY = coords.y;
        }

        // Fast live update without pushing to history during resize!
        onUpdateElement({
          ...el,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        }, false);
      }
    }
  };

  // Mouse up
  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (drawPoints.length > 1) {
        const newDraw: DrawElement = {
          id: `draw_${Date.now()}`,
          pageIndex,
          type: 'draw',
          x: 0,
          y: 0,
          width: dimension.width,
          height: dimension.height,
          points: drawPoints,
          strokeColor: activeTool === 'highlight' ? '#fef08a' : defaultColor,
          strokeWidth: activeTool === 'highlight' ? 14 : defaultStrokeWidth,
          isHighlighter: activeTool === 'highlight',
        };
        onAddElement(newDraw);
      }
      setDrawPoints([]);
      return;
    }

    if (dragStart && currentDrag) {
      const minX = Math.min(dragStart.x, currentDrag.x);
      const minY = Math.min(dragStart.y, currentDrag.y);
      const width = Math.max(15, Math.abs(currentDrag.x - dragStart.x));
      const height = Math.max(10, Math.abs(currentDrag.y - dragStart.y));

      if (activeTool === 'whiteout') {
        const newWhiteout: WhiteoutElement = {
          id: `whiteout_${Date.now()}`,
          pageIndex,
          type: 'whiteout',
          x: minX,
          y: minY,
          width,
          height,
          fill: '#ffffff',
        };
        onAddElement(newWhiteout);
        onSelectElement(newWhiteout.id);
      } else if (['rectangle', 'circle'].includes(activeTool)) {
        const newShape: ShapeElement = {
          id: `shape_${Date.now()}`,
          pageIndex,
          type: 'shape',
          shapeType: activeTool as any,
          x: minX,
          y: minY,
          width,
          height,
          fill: 'transparent',
          strokeColor: defaultColor,
          strokeWidth: defaultStrokeWidth,
        };
        onAddElement(newShape);
        onSelectElement(newShape.id);
      } else if (['line', 'arrow'].includes(activeTool)) {
        const newShape: ShapeElement = {
          id: `shape_${Date.now()}`,
          pageIndex,
          type: 'shape',
          shapeType: activeTool as any,
          x: dragStart.x,
          y: dragStart.y,
          width: currentDrag.x - dragStart.x,
          height: currentDrag.y - dragStart.y,
          fill: 'transparent',
          strokeColor: defaultColor,
          strokeWidth: defaultStrokeWidth,
        };
        onAddElement(newShape);
        onSelectElement(newShape.id);
      }

      setDragStart(null);
      setCurrentDrag(null);
      return;
    }

    // Finished dragging or resizing -> commit final state to history!
    if (draggingElementId || resizingElementId) {
      if (onCommitHistory) onCommitHistory();
    }

    setDraggingElementId(null);
    setResizingElementId(null);
    setResizeHandle(null);
  };

  const handleStartMoveElement = (e: React.MouseEvent, el: EditorElement) => {
    e.stopPropagation();
    onSelectElement(el.id);
    const coords = getPdfCoords(e);
    setDraggingElementId(el.id);
    setDragOffset({
      x: coords.x - el.x,
      y: coords.y - el.y,
    });
  };

  const handleDuplicateElement = (el: EditorElement, e: React.MouseEvent) => {
    e.stopPropagation();
    const dup = {
      ...el,
      id: `${el.type}_${Date.now()}`,
      x: el.x + 15,
      y: el.y + 15,
    };
    onAddElement(dup);
    onSelectElement(dup.id);
  };

  const handleDownloadFont = (te: TextElement) => {
    const fontName = te.fontFamily || 'Nikosh';

    // 1. If embedded font data was extracted from the PDF
    if (te.embeddedFontData && te.embeddedFontData.length > 0) {
      const blob = new Blob([te.embeddedFontData as any], { type: 'font/truetype' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fontName.replace(/\s+/g, '_')}.ttf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // 2. If Nikosh
    if (/nikosh/i.test(fontName)) {
      const a = document.createElement('a');
      a.href = '/fonts/Nikosh.ttf';
      a.download = 'Nikosh.ttf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // 3. If Kalpurush
    if (/kalpurush/i.test(fontName)) {
      const a = document.createElement('a');
      a.href = '/fonts/Kalpurush.ttf';
      a.download = 'Kalpurush.ttf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // 4. If Tiro Bangla
    if (/tiro/i.test(fontName)) {
      const a = document.createElement('a');
      a.href = '/fonts/TiroBangla-Regular.ttf';
      a.download = 'TiroBangla-Regular.ttf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // 5. If Google Fonts or standard Web font
    window.open(`https://fonts.google.com/?query=${encodeURIComponent(fontName)}`, '_blank');
  };

  const pageElements = elements.filter((el) => el.pageIndex === pageIndex);

  return (
    <div
      ref={containerRef}
      className="pdf-page-container relative my-6 mx-auto bg-white rounded-sm shadow-md"
      style={{
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
        cursor: activeTool === 'text' ? 'text' : activeTool === 'whiteout' || activeTool === 'draw' ? 'crosshair' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Base Canvas rendered by PDF.js */}
      <canvas
        ref={canvasRef}
        style={{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
        }}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Selectable & Editable Native PDF Text Layer */}
      <div className="absolute inset-0 z-5 pointer-events-none">
        {extractedTexts.map((item) => {
          // If already replaced by an editable element on this page, don't show the hover overlay for this item
          const isReplaced = elements.some(
            (el) =>
              el.pageIndex === pageIndex &&
              el.type === 'text' &&
              (el as TextElement).originalText === item.str
          );
          if (isReplaced) return null;

          return (
            <div
              key={item.id}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleEditExtractedText(item, e);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleEditExtractedText(item, e);
              }}
              style={{
                left: `${item.x * scale}px`,
                top: `${item.y * scale}px`,
                width: `${item.width * scale}px`,
                height: `${item.height * scale}px`,
                fontSize: `${item.fontSize * scale}px`,
              }}
              className="absolute group pointer-events-auto leading-none cursor-text rounded transition-all hover:bg-indigo-500/10 hover:outline hover:outline-1 hover:outline-indigo-500 hover:outline-dashed select-none"
              title={`Click to edit: "${item.str}"`}
            >
              {/* Floating edit pill on hover */}
              {(activeTool === 'select' || activeTool === 'text') && (
                <div className="opacity-0 group-hover:opacity-100 absolute -top-5 left-0 z-30 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1 transition-opacity pointer-events-none whitespace-nowrap">
                  <Edit3 size={10} />
                  <span>Edit: {item.str.length > 20 ? item.str.slice(0, 20) + '...' : item.str}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Overlay Layer for User-Added Elements */}
      <div ref={overlayRef} className="absolute inset-0 z-10 pointer-events-auto">
        {pageElements.map((el) => {
          const isSelected = selectedElementId === el.id;

          // Render Whiteout
          if (el.type === 'whiteout') {
            const we = el as WhiteoutElement;
            return (
              <div
                key={we.id}
                onMouseDown={(e) => handleStartMoveElement(e, we)}
                style={{
                  left: `${we.x * scale}px`,
                  top: `${we.y * scale}px`,
                  width: `${we.width * scale}px`,
                  height: `${we.height * scale}px`,
                  backgroundColor: we.fill,
                }}
                className={`editor-element-box absolute cursor-move transition-all ${
                  isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 z-20' : 'hover:ring-1 hover:ring-slate-400'
                }`}
              >
                {isSelected && (
                  <>
                    <div className="text-action-bar absolute -top-8 left-0 flex items-center gap-1.5 bg-slate-900 text-white px-2 py-1 rounded shadow-lg text-[11px] font-semibold z-40">
                      <span className="text-slate-300 text-[10px]">Patch</span>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeleteElement(we.id);
                        }}
                        className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded flex items-center gap-1 cursor-pointer transition-colors text-[10px]"
                        title="Delete Patch"
                      >
                        <Trash2 size={11} />
                        <span>Delete</span>
                      </button>
                    </div>
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setResizingElementId(we.id);
                        setResizeHandle('se');
                      }}
                      className="resize-handle absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-indigo-600 border-2 border-white rounded-full cursor-se-resize shadow"
                    />
                  </>
                )}
              </div>
            );
          }

          // Render Shape
          if (el.type === 'shape') {
            const se = el as ShapeElement;
            const w = se.width * scale;
            const h = se.height * scale;
            const isLineOrArrow = se.shapeType === 'line' || se.shapeType === 'arrow';

            return (
              <div
                key={se.id}
                onMouseDown={(e) => handleStartMoveElement(e, se)}
                style={{
                  left: `${se.x * scale}px`,
                  top: `${se.y * scale}px`,
                  width: isLineOrArrow ? `${Math.abs(w) || 20}px` : `${w}px`,
                  height: isLineOrArrow ? `${Math.abs(h) || 20}px` : `${h}px`,
                }}
                className={`editor-element-box absolute cursor-move ${
                  isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 z-20' : 'hover:ring-1 hover:ring-slate-300'
                }`}
              >
                <svg
                  width={isLineOrArrow ? Math.abs(w) || 20 : w}
                  height={isLineOrArrow ? Math.abs(h) || 20 : h}
                  className="overflow-visible"
                >
                  {se.shapeType === 'rectangle' && (
                    <rect
                      x={0}
                      y={0}
                      width={w}
                      height={h}
                      fill={se.fill}
                      stroke={se.strokeColor}
                      strokeWidth={se.strokeWidth * scale}
                    />
                  )}
                  {se.shapeType === 'circle' && (
                    <ellipse
                      cx={w / 2}
                      cy={h / 2}
                      rx={Math.max(1, w / 2)}
                      ry={Math.max(1, h / 2)}
                      fill={se.fill}
                      stroke={se.strokeColor}
                      strokeWidth={se.strokeWidth * scale}
                    />
                  )}
                  {se.shapeType === 'line' && (
                    <line
                      x1={0}
                      y1={0}
                      x2={w}
                      y2={h}
                      stroke={se.strokeColor}
                      strokeWidth={se.strokeWidth * scale}
                    />
                  )}
                  {se.shapeType === 'arrow' && (
                    <>
                      <line
                        x1={0}
                        y1={0}
                        x2={w}
                        y2={h}
                        stroke={se.strokeColor}
                        strokeWidth={se.strokeWidth * scale}
                      />
                      <circle
                        cx={w}
                        cy={h}
                        r={se.strokeWidth * scale * 2}
                        fill={se.strokeColor}
                      />
                    </>
                  )}
                </svg>

                {isSelected && !isLineOrArrow && (
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingElementId(se.id);
                      setResizeHandle('se');
                    }}
                    className="resize-handle absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-indigo-600 border-2 border-white rounded-full cursor-se-resize shadow"
                  />
                )}
              </div>
            );
          }

          // Render Freehand Draw / Highlighter
          if (el.type === 'draw') {
            const de = el as DrawElement;
            const pathData = de.points.reduce((acc, pt, i) => {
              const cmd = i === 0 ? 'M' : 'L';
              return `${acc} ${cmd} ${pt.x * scale} ${pt.y * scale}`;
            }, '');

            return (
              <svg
                key={de.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement(de.id);
                }}
                className={`editor-element-box absolute inset-0 pointer-events-auto cursor-pointer ${
                  isSelected ? 'filter drop-shadow-[0_0_4px_rgba(99,102,241,0.8)]' : ''
                }`}
                style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
              >
                <path
                  d={pathData}
                  fill="none"
                  stroke={de.strokeColor}
                  strokeWidth={de.strokeWidth * scale}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={de.isHighlighter ? 0.45 : 1.0}
                />
              </svg>
            );
          }

          // Render Image
          if (el.type === 'image') {
            const ie = el as ImageElement;
            return (
              <div
                key={ie.id}
                onMouseDown={(e) => handleStartMoveElement(e, ie)}
                style={{
                  left: `${ie.x * scale}px`,
                  top: `${ie.y * scale}px`,
                  width: `${ie.width * scale}px`,
                  height: `${ie.height * scale}px`,
                }}
                className={`editor-element-box absolute cursor-move ${
                  isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 z-20' : 'hover:ring-1 hover:ring-slate-300'
                }`}
              >
                <img
                  src={ie.dataUrl}
                  alt="stamp"
                  className="w-full h-full object-contain pointer-events-none"
                />
                {isSelected && (
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingElementId(ie.id);
                      setResizeHandle('se');
                    }}
                    className="resize-handle absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-indigo-600 border-2 border-white rounded-full cursor-se-resize shadow"
                  />
                )}
              </div>
            );
          }

          // Render Text Element
          if (el.type === 'text') {
            const te = el as TextElement;
            const isEditing = editingTextId === te.id;

            return (
              <div
                key={te.id}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('.text-action-bar')) return;
                  e.stopPropagation();
                  onSelectElement(te.id);
                  if (activeTool === 'select' && !isEditing) {
                    setEditingTextId(te.id);
                  }
                }}
                style={{
                  left: `${te.x * scale}px`,
                  top: `${te.y * scale}px`,
                  width: `${te.width * scale}px`,
                  minHeight: `${te.height * scale}px`,
                  backgroundColor: te.backgroundColor || 'transparent',
                }}
                className={`editor-element-box absolute transition-colors ${
                  isSelected
                    ? 'ring-1 ring-indigo-500 ring-offset-0 z-30'
                    : 'hover:outline-1 hover:outline-dashed hover:outline-indigo-300'
                }`}
              >
                {/* Floating Top Move Handle & Action Toolbar */}
                {isSelected && (
                  <div className="text-action-bar absolute -top-9 left-0 flex items-center gap-1.5 bg-slate-900 text-white px-2 py-1 rounded-lg shadow-xl text-[11px] font-semibold z-40 whitespace-nowrap border border-slate-700">
                    {/* Drag Move Handle & Typography Info */}
                    <div
                      onMouseDown={(e) => handleStartMoveElement(e, te)}
                      className="drag-handle flex items-center gap-1.5 cursor-move text-slate-300 hover:text-white pr-2 border-r border-slate-700"
                      title="Drag to move text"
                    >
                      <Move size={13} />
                      <span className="text-[10px] text-indigo-300 font-bold">{te.fontFamily}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{te.fontSize}pt</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/60 inline-block shadow-xs flex-shrink-0"
                        style={{ backgroundColor: te.color }}
                        title={`Detected Font Color: ${te.color}`}
                      />
                    </div>

                    {/* Download Font Button */}
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDownloadFont(te);
                      }}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded flex items-center gap-1 cursor-pointer transition-colors text-[10px] border border-slate-700"
                      title={`Download font file (${te.fontFamily})`}
                    >
                      <Download size={11} />
                      <span>Download Font</span>
                    </button>

                    {/* Done / Edit Button */}
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isEditing) {
                          setEditingTextId(null);
                          if (onCommitHistory) onCommitHistory();
                        } else {
                          setEditingTextId(te.id);
                        }
                      }}
                      className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors ${
                        isEditing 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white font-medium'
                      }`}
                      title={isEditing ? 'Finish editing text' : 'Edit text'}
                    >
                      {isEditing ? <Check size={12} /> : <Edit3 size={12} />}
                      <span>{isEditing ? 'Done' : 'Edit'}</span>
                    </button>

                    {/* Duplicate Button */}
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDuplicateElement(te, e);
                      }}
                      className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer transition-colors"
                      title="Duplicate"
                    >
                      <Copy size={13} />
                    </button>

                    {/* Delete Button */}
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteElement(te.id);
                      }}
                      className="px-2 py-0.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded flex items-center gap-1 cursor-pointer transition-colors text-[10px]"
                      title="Delete Text"
                    >
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  </div>
                )}

                {/* Textarea for live typing / editing with 100% transparent background and zero jump */}
                {isEditing ? (
                  <textarea
                    ref={textareaRef}
                    value={te.text}
                    onChange={(e) => {
                      // Live instantaneous update without history thrashing
                      onUpdateElement({
                        ...te,
                        text: e.target.value,
                      }, false);

                      // Auto grow height
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onBlur={() => {
                      setEditingTextId(null);
                      if (onCommitHistory) onCommitHistory();
                    }}
                    style={{
                      fontFamily: te.fontFamily,
                      fontSize: `${te.fontSize * scale}px`,
                      color: te.color,
                      fontWeight: te.bold ? 'bold' : 'normal',
                      fontStyle: te.italic ? 'italic' : 'normal',
                      textDecoration: te.underline ? 'underline' : 'none',
                      textAlign: te.align,
                      lineHeight: 1.25,
                      background: 'transparent',
                      border: '1px dashed #6366f1',
                      outline: 'none',
                      resize: 'none',
                      padding: '0px',
                      margin: '0px',
                      width: '100%',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                    }}
                    className="cursor-text select-text block"
                    rows={Math.max(1, te.text.split('\n').length)}
                  />
                ) : (
                  <div
                    style={{
                      fontFamily: te.fontFamily,
                      fontSize: `${te.fontSize * scale}px`,
                      color: te.color,
                      fontWeight: te.bold ? 'bold' : 'normal',
                      fontStyle: te.italic ? 'italic' : 'normal',
                      textDecoration: te.underline ? 'underline' : 'none',
                      textAlign: te.align,
                      lineHeight: 1.25,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      border: '1px solid transparent',
                      padding: '0px',
                      margin: '0px',
                      boxSizing: 'border-box',
                    }}
                    className="cursor-pointer select-text"
                  >
                    {te.text}
                  </div>
                )}

                {/* Resize Handle */}
                {isSelected && !isEditing && (
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingElementId(te.id);
                      setResizeHandle('se');
                    }}
                    className="resize-handle absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-indigo-600 border-2 border-white rounded-full cursor-se-resize shadow"
                  />
                )}
              </div>
            );
          }

          return null;
        })}

        {/* Live Drawing Preview */}
        {isDrawing && drawPoints.length > 1 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
          >
            <path
              d={drawPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x * scale} ${pt.y * scale}`, '')}
              fill="none"
              stroke={activeTool === 'highlight' ? '#fef08a' : defaultColor}
              strokeWidth={(activeTool === 'highlight' ? 14 : defaultStrokeWidth) * scale}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={activeTool === 'highlight' ? 0.45 : 1.0}
            />
          </svg>
        )}

        {/* Live Shape / Whiteout Dragging Preview */}
        {dragStart && currentDrag && (
          <div
            style={{
              left: `${Math.min(dragStart.x, currentDrag.x) * scale}px`,
              top: `${Math.min(dragStart.y, currentDrag.y) * scale}px`,
              width: `${Math.abs(currentDrag.x - dragStart.x) * scale}px`,
              height: `${Math.abs(currentDrag.y - dragStart.y) * scale}px`,
            }}
            className={`absolute pointer-events-none border-2 border-dashed ${
              activeTool === 'whiteout' ? 'bg-white/80 border-slate-400' : 'bg-indigo-100/30 border-indigo-500'
            }`}
          />
        )}
      </div>
    </div>
  );
};
