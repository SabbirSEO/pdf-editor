import React, { useRef } from 'react';
import { 
  FileUp, 
  FilePlus, 
  FileText, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  RotateCw, 
  Maximize2,
  Sparkles,
  Loader2
} from 'lucide-react';

interface NavbarProps {
  fileName: string;
  currentPage: number;
  numPages: number;
  scale: number;
  canUndo: boolean;
  canRedo: boolean;
  isExporting: boolean;
  onOpenPdf: (file: File) => void;
  onNewBlank: () => void;
  onLoadSample: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onExport: () => void;
  onPageChange: (page: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  fileName,
  currentPage,
  numPages,
  scale,
  canUndo,
  canRedo,
  isExporting,
  onOpenPdf,
  onNewBlank,
  onLoadSample,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onExport,
  onPageChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenPdf(file);
      e.target.value = '';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-sm z-30 select-none">
      {/* Left: Brand & File Actions */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 mr-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <FileText size={22} className="stroke-[2.2]" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-800 text-base tracking-tight">PDF Editor</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                বাংলা & EN
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[180px]">
              {fileName || 'No file selected'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/pdf"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all border border-slate-200 hover:border-slate-300 shadow-2xs"
            title="Open an existing PDF from computer"
          >
            <FileUp size={15} className="text-indigo-600" />
            <span className="hidden md:inline">Open PDF</span>
          </button>

          <button
            onClick={onNewBlank}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all border border-slate-200 hover:border-slate-300 shadow-2xs"
            title="Create blank A4 page"
          >
            <FilePlus size={15} className="text-emerald-600" />
            <span className="hidden md:inline">New Blank</span>
          </button>

          <button
            onClick={onLoadSample}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all border border-indigo-200 shadow-2xs"
            title="Load sample template with Bangla & English layout"
          >
            <Sparkles size={14} className="text-indigo-600" />
            <span>Sample Demo</span>
          </button>
        </div>
      </div>

      {/* Center: Pagination & Undo/Redo & Zoom */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-600 rounded hover:bg-white transition-all"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-600 rounded hover:bg-white transition-all"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw size={15} />
          </button>
        </div>

        {/* Page navigation */}
        {numPages > 0 && (
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={numPages}
              value={currentPage + 1}
              onChange={(e) => {
                const p = parseInt(e.target.value, 10);
                if (!isNaN(p) && p >= 1 && p <= numPages) {
                  onPageChange(p - 1);
                }
              }}
              className="w-10 text-center bg-white border border-slate-300 rounded px-1 py-0.5 text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-slate-400">/ {numPages}</span>
          </div>
        )}

        {/* Zoom Controls */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={onZoomOut}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-all"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <span className="text-xs font-bold text-slate-700 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={onZoomIn}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-all"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={onResetZoom}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-all ml-0.5"
            title="Fit to Page"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Right: Export / Download */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExport}
          disabled={isExporting || numPages === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 hover:shadow-lg transition-all active:scale-95"
          title="Export high quality PDF with Bangla fonts"
        >
          {isExporting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download size={16} />
              <span>Download PDF</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
