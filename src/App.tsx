import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Toolbar } from './components/Toolbar';
import { FormatBar } from './components/FormatBar';
import { Sidebar } from './components/Sidebar';
import { PdfPage } from './components/PdfPage';
import { SignatureModal } from './components/SignatureModal';
import { 
  EditorElement, 
  PageDimension, 
  ToolType, 
  FontFamily, 
  TextElement, 
  ImageElement 
} from './types/editor';
import { loadPdfDocument, getPdfPageDimensions, createBlankPdfBytes } from './utils/pdfLoader';
import { exportModifiedPdf } from './utils/pdfExport';
import { createSampleBilingualPdf } from './utils/samplePdf';
import { Loader2, CheckCircle2, Download, X } from 'lucide-react';

export const App: React.FC = () => {
  // Document State
  const [fileName, setFileName] = useState<string>('sample_bilingual_document.pdf');
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageDimensions, setPageDimensions] = useState<PageDimension[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.15);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadNotification, setDownloadNotification] = useState<{ url: string; fileName: string } | null>(null);

  // Editor Tools & Formatting State
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [currentFont, setCurrentFont] = useState<FontFamily>('Nikosh');
  const [currentFontSize, setCurrentFontSize] = useState<number>(16);
  const [currentColor, setCurrentColor] = useState<string>('#000000');
  const [currentBgColor, setCurrentBgColor] = useState<string>('transparent');
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(2);

  // Elements & Selection
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<boolean>(false);

  // History for Undo / Redo
  const [history, setHistory] = useState<EditorElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Push new state to history
  const pushHistory = useCallback((newElements: EditorElement[]) => {
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(newElements);
      return next;
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Load PDF from ArrayBuffer
  const loadPdfFromBytes = async (bytes: ArrayBuffer, name: string) => {
    try {
      setIsLoadingPdf(true);
      const safeCopyForWorker = bytes.slice(0);
      const safeCopyForState = bytes.slice(0);
      const doc = await loadPdfDocument(safeCopyForWorker);
      const dimensions = await getPdfPageDimensions(doc);

      setPdfBytes(safeCopyForState);
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setPageDimensions(dimensions);
      setFileName(name);
      setCurrentPage(0);
      setElements([]);
      setSelectedElementId(null);
      setHistory([[]]);
      setHistoryIndex(0);
    } catch (err) {
      console.error('Failed to load PDF document:', err);
      alert('Could not load this PDF file. Please verify it is a valid PDF.');
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // Load Initial Sample PDF on Mount
  useEffect(() => {
    async function initSample() {
      try {
        const sampleBytes = await createSampleBilingualPdf();
        await loadPdfFromBytes(sampleBytes, 'bangla_english_official_sample.pdf');
      } catch (err) {
        console.error('Error creating sample PDF:', err);
        setIsLoadingPdf(false);
      }
    }
    initSample();
  }, []);

  // Sync selected element attributes to format bar
  const selectedElement = elements.find((el) => el.id === selectedElementId) || null;

  useEffect(() => {
    if (selectedElement && selectedElement.type === 'text') {
      const te = selectedElement as TextElement;
      setCurrentFont(te.fontFamily);
      setCurrentFontSize(te.fontSize);
      setCurrentColor(te.color);
      setCurrentBgColor(te.backgroundColor || 'transparent');
      setIsBold(te.bold);
      setIsItalic(te.italic);
      setIsUnderline(te.underline);
      setTextAlign(te.align);
    }
  }, [selectedElementId]);

  // Update an element (supports live update vs history commit)
  const handleUpdateElement = (updated: EditorElement, commitToHistory: boolean = false) => {
    setElements((prev) => {
      const next = prev.map((el) => (el.id === updated.id ? updated : el));
      if (commitToHistory) {
        pushHistory(next);
      }
      return next;
    });
  };

  // Explicitly commit current elements to history
  const handleCommitHistory = () => {
    setElements((current) => {
      pushHistory(current);
      return current;
    });
  };

  // Add a new element & save to history
  const handleAddElement = (newEl: EditorElement) => {
    setElements((prev) => {
      const next = [...prev, newEl];
      pushHistory(next);
      return next;
    });
  };

  // Delete an element
  const handleDeleteElement = (id: string) => {
    setElements((prev) => {
      const next = prev.filter((el) => el.id !== id);
      pushHistory(next);
      return next;
    });
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  // Delete currently selected element
  const handleDeleteSelected = () => {
    if (selectedElementId) {
      handleDeleteElement(selectedElementId);
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setElements(history[prevIdx]);
      setSelectedElementId(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setElements(history[nextIdx]);
      setSelectedElementId(null);
    }
  };

  // Open PDF File
  const handleOpenPdf = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const bytes = e.target?.result as ArrayBuffer;
      if (bytes) {
        await loadPdfFromBytes(bytes, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Create Blank Document
  const handleNewBlank = async () => {
    const blankBytes = await createBlankPdfBytes();
    await loadPdfFromBytes(blankBytes, 'blank_document.pdf');
  };

  // Load Sample Bilingual Document
  const handleLoadSample = async () => {
    const sampleBytes = await createSampleBilingualPdf();
    await loadPdfFromBytes(sampleBytes, 'bangla_english_official_sample.pdf');
  };

  // Add a blank page to existing PDF
  const handleAddBlankPage = async () => {
    if (!pdfBytes) return;
    try {
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.load(pdfBytes);
      doc.addPage([595.28, 841.89]);
      const newBytes = await doc.save();
      await loadPdfFromBytes(newBytes.buffer as ArrayBuffer, fileName);
      setCurrentPage(numPages);
    } catch (err) {
      console.error('Error adding page:', err);
    }
  };

  // Delete current page
  const handleDeleteCurrentPage = async () => {
    if (!pdfBytes || numPages <= 1) return;
    try {
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.load(pdfBytes);
      doc.removePage(currentPage);
      const newBytes = await doc.save();
      await loadPdfFromBytes(newBytes.buffer as ArrayBuffer, fileName);
    } catch (err) {
      console.error('Error removing page:', err);
    }
  };

  // Signature Save handler
  const handleSignatureSave = (dataUrl: string) => {
    const newImage: ImageElement = {
      id: `sig_${Date.now()}`,
      pageIndex: currentPage,
      type: 'image',
      x: 100,
      y: 100,
      width: 160,
      height: 60,
      dataUrl,
      aspectRatio: 160 / 60,
    };
    handleAddElement(newImage);
    setSelectedElementId(newImage.id);
    setActiveTool('select');
  };

  // Image Upload Handler from Toolbar
  const handleAddImage = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const aspect = img.width / img.height;
      const initialWidth = Math.min(250, img.width);
      const initialHeight = initialWidth / aspect;

      const newImage: ImageElement = {
        id: `img_${Date.now()}`,
        pageIndex: currentPage,
        type: 'image',
        x: 100,
        y: 100,
        width: initialWidth,
        height: initialHeight,
        dataUrl,
        aspectRatio: aspect,
      };
      handleAddElement(newImage);
      setSelectedElementId(newImage.id);
      setActiveTool('select');
    };
    img.src = dataUrl;
  };

  // Insert Bangla quick sample text
  const handleInsertBanglaSample = (text: string) => {
    const dim = pageDimensions[currentPage] || { width: 595, height: 842 };
    const newText: TextElement = {
      id: `text_${Date.now()}`,
      pageIndex: currentPage,
      type: 'text',
      x: Math.round(dim.width / 3),
      y: Math.round(dim.height / 3),
      width: 220,
      height: 45,
      text,
      fontFamily: currentFont === 'Nikosh' || currentFont === 'Kalpurush' ? currentFont : 'Kalpurush',
      fontSize: currentFontSize || 18,
      color: currentColor || '#000000',
      bold: isBold,
      italic: isItalic,
      underline: isUnderline,
      align: textAlign,
    };
    handleAddElement(newText);
    setSelectedElementId(newText.id);
    setActiveTool('select');
  };

  // Export PDF
  const handleExport = async () => {
    if (!pdfBytes) return;
    try {
      setIsExporting(true);
      const res = await exportModifiedPdf(pdfBytes, elements, pageDimensions, fileName, pdfDoc);
      if (res && res.downloadUrl) {
        setDownloadNotification({ url: res.downloadUrl, fileName: res.fileName });
      }
    } catch (err: any) {
      console.error('Error exporting PDF:', err);
      alert(`Export error: ${err?.message || 'Unknown export failure'}. Please check console.`);
    } finally {
      setIsExporting(false);
    }
  };

  // Keyboard Shortcuts (Delete, Undo, Redo, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing inside an input or textarea, don't trigger global delete/undo
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape') {
        setSelectedElementId(null);
        setActiveTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, historyIndex, history]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden font-sans">
      {/* Top Navigation */}
      <Navbar
        fileName={fileName}
        currentPage={currentPage}
        numPages={numPages}
        scale={scale}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        isExporting={isExporting}
        onOpenPdf={handleOpenPdf}
        onNewBlank={handleNewBlank}
        onLoadSample={handleLoadSample}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onZoomIn={() => setScale((s) => Math.min(2.0, Number((s + 0.15).toFixed(2))))}
        onZoomOut={() => setScale((s) => Math.max(0.5, Number((s - 0.15).toFixed(2))))}
        onResetZoom={() => setScale(1.15)}
        onExport={handleExport}
        onPageChange={(p) => setCurrentPage(p)}
      />

      {/* Contextual Format Bar */}
      <FormatBar
        activeTool={activeTool}
        selectedElement={selectedElement}
        currentFont={currentFont}
        currentFontSize={currentFontSize}
        currentColor={currentColor}
        currentBgColor={currentBgColor}
        isBold={isBold}
        isItalic={isItalic}
        isUnderline={isUnderline}
        textAlign={textAlign}
        currentStrokeWidth={currentStrokeWidth}
        onFontChange={(font) => {
          setCurrentFont(font);
          if (selectedElement && selectedElement.type === 'text') {
            handleUpdateElement({ ...selectedElement, fontFamily: font } as TextElement, true);
          }
        }}
        onFontSizeChange={(size) => {
          setCurrentFontSize(size);
          if (selectedElement && selectedElement.type === 'text') {
            handleUpdateElement({ ...selectedElement, fontSize: size } as TextElement, true);
          }
        }}
        onColorChange={(color) => {
          setCurrentColor(color);
          if (selectedElement) {
            if (selectedElement.type === 'text') {
              handleUpdateElement({ ...selectedElement, color } as TextElement, true);
            } else if (selectedElement.type === 'shape') {
              handleUpdateElement({ ...selectedElement, strokeColor: color } as any, true);
            }
          }
        }}
        onBgColorChange={(bgColor) => {
          setCurrentBgColor(bgColor);
          if (selectedElement && selectedElement.type === 'text') {
            handleUpdateElement({ ...selectedElement, backgroundColor: bgColor } as TextElement, true);
          }
        }}
        onToggleBold={() => {
          const next = !isBold;
          setIsBold(next);
          if (selectedElement && selectedElement.type === 'text') {
            handleUpdateElement({ ...selectedElement, bold: next } as TextElement, true);
          }
        }}
        onToggleItalic={() => {
          const next = !isItalic;
          setIsItalic(next);
          if (selectedElement && selectedElement.type === 'text') {
            handleUpdateElement({ ...selectedElement, italic: next } as TextElement, true);
          }
        }}
        onToggleUnderline={() => {
          const next = !isUnderline;
          setIsUnderline(next);
          if (selectedElement && selectedElement.type === 'text') {
            handleUpdateElement({ ...selectedElement, underline: next } as TextElement, true);
          }
        }}
        onTextAlignChange={(align) => {
          setTextAlign(align);
          if (selectedElement && selectedElement.type === 'text') {
            handleUpdateElement({ ...selectedElement, align } as TextElement, true);
          }
        }}
        onStrokeWidthChange={(width) => {
          setCurrentStrokeWidth(width);
          if (selectedElement && (selectedElement.type === 'shape' || selectedElement.type === 'draw')) {
            handleUpdateElement({ ...selectedElement, strokeWidth: width } as any, true);
          }
        }}
        onInsertBanglaSample={handleInsertBanglaSample}
      />

      {/* Main Workspace Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Toolbar */}
        <Toolbar
          activeTool={activeTool}
          onSelectTool={(tool) => {
            setActiveTool(tool);
            if (tool !== 'select') setSelectedElementId(null);
          }}
          onOpenSignature={() => setIsSignatureModalOpen(true)}
          onAddImage={handleAddImage}
          hasSelection={selectedElementId !== null}
          onDeleteSelected={handleDeleteSelected}
        />

        {/* Left Sidebar (Thumbnails) */}
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          numPages={numPages}
          currentPage={currentPage}
          pageDimensions={pageDimensions}
          onSelectPage={(p) => setCurrentPage(p)}
          onAddBlankPage={handleAddBlankPage}
          onDeleteCurrentPage={handleDeleteCurrentPage}
        />

        {/* Center Canvas Viewport */}
        <main className="flex-1 overflow-auto bg-slate-200/70 p-4 sm:p-8 flex flex-col items-center relative">
          {isLoadingPdf ? (
            <div className="flex flex-col items-center justify-center m-auto text-slate-500 gap-3">
              <Loader2 size={36} className="animate-spin text-indigo-600" />
              <p className="text-sm font-semibold">Loading PDF Document & Bangla Fonts...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {Array.from({ length: numPages }).map((_, idx) => {
                const dim = pageDimensions[idx] || { width: 595, height: 842, rotation: 0 };
                return (
                  <div key={idx} className="flex flex-col items-center mb-6">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1">
                      Page {idx + 1} of {numPages}
                    </div>
                    <PdfPage
                      pdfDoc={pdfDoc}
                      pageIndex={idx}
                      dimension={dim}
                      scale={scale}
                      elements={elements}
                      selectedElementId={selectedElementId}
                      activeTool={activeTool}
                      defaultFont={currentFont}
                      defaultFontSize={currentFontSize}
                      defaultColor={currentColor}
                      defaultStrokeWidth={currentStrokeWidth}
                      onSelectElement={(id) => setSelectedElementId(id)}
                      onUpdateElement={handleUpdateElement}
                      onCommitHistory={handleCommitHistory}
                      onAddElement={handleAddElement}
                      onDeleteElement={handleDeleteElement}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Floating Download Success Toast with Manual Download Fallback */}
      {downloadNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700/80 animate-in fade-in slide-in-from-bottom-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} className="stroke-[2.5]" />
          </div>
          <div className="pr-2">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              PDF Generated Successfully!
            </h4>
            <p className="text-xs text-slate-300">
              Download started. If it didn't trigger automatically, click below:
            </p>
          </div>
          <a
            href={downloadNotification.url}
            download={downloadNotification.fileName}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </a>
          <button
            onClick={() => setDownloadNotification(null)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
            title="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={handleSignatureSave}
      />
    </div>
  );
};
export default App;
