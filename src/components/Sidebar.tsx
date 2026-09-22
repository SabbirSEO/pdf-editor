import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, FileText } from 'lucide-react';
import { PageDimension } from '../types/editor';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  numPages: number;
  currentPage: number;
  pageDimensions: PageDimension[];
  onSelectPage: (pageIndex: number) => void;
  onAddBlankPage: () => void;
  onDeleteCurrentPage: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  numPages,
  currentPage,
  pageDimensions,
  onSelectPage,
  onAddBlankPage,
  onDeleteCurrentPage,
}) => {
  return (
    <div
      className={`relative bg-slate-50 border-r border-slate-200 transition-all duration-200 ease-in-out flex flex-col z-10 select-none ${
        isOpen ? 'w-56' : 'w-0'
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3.5 top-6 z-20 w-7 h-7 bg-white border border-slate-300 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-sm transition-all hover:scale-105"
        title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {isOpen && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={15} className="text-indigo-600" /> Pages ({numPages})
            </span>
            <button
              onClick={onAddBlankPage}
              className="p-1 rounded text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Add Blank Page (A4)"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Page Thumbnails List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {Array.from({ length: numPages }).map((_, index) => {
              const isActive = currentPage === index;
              const dim = pageDimensions[index] || { width: 595, height: 842 };
              const aspectRatio = dim.width / dim.height;

              return (
                <div
                  key={index}
                  onClick={() => onSelectPage(index)}
                  className={`group cursor-pointer rounded-xl p-2 transition-all flex flex-col items-center ${
                    isActive
                      ? 'bg-indigo-100/60 ring-2 ring-indigo-600 shadow-sm'
                      : 'hover:bg-slate-200/60'
                  }`}
                >
                  <div
                    className="w-36 bg-white border border-slate-300 rounded shadow-xs relative overflow-hidden flex items-center justify-center text-slate-400 group-hover:border-indigo-400 transition-all"
                    style={{
                      height: `${Math.round(144 / aspectRatio)}px`,
                      maxHeight: '190px',
                    }}
                  >
                    <span className="text-xs font-semibold text-slate-400">
                      Page {index + 1}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold mt-1.5 ${
                      isActive ? 'text-indigo-700' : 'text-slate-500'
                    }`}
                  >
                    {index + 1}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer actions */}
          {numPages > 1 && (
            <div className="p-2 border-t border-slate-200 bg-white">
              <button
                onClick={onDeleteCurrentPage}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 size={14} /> Delete Page {currentPage + 1}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
