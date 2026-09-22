import React, { useRef } from 'react';
import { 
  MousePointer, 
  Type, 
  Eraser, 
  Pen, 
  Highlighter, 
  Square, 
  Circle, 
  Minus, 
  MoveRight, 
  PenTool, 
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { ToolType } from '../types/editor';

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onOpenSignature: () => void;
  onAddImage: (dataUrl: string) => void;
  hasSelection: boolean;
  onDeleteSelected: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  onOpenSignature,
  onAddImage,
  hasSelection,
  onDeleteSelected,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) onAddImage(result);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const tools: { id: ToolType; label: string; icon: React.ReactNode; tooltip: string }[] = [
    { id: 'select', label: 'Select', icon: <MousePointer size={18} />, tooltip: 'Select & Move Elements' },
    { id: 'text', label: 'Text', icon: <Type size={18} />, tooltip: 'Add Bangla or English Text' },
    { id: 'whiteout', label: 'Whiteout', icon: <Eraser size={18} />, tooltip: 'Whiteout / Erase Existing PDF Content' },
    { id: 'draw', label: 'Draw', icon: <Pen size={18} />, tooltip: 'Freehand Pen' },
    { id: 'highlight', label: 'Highlight', icon: <Highlighter size={18} />, tooltip: 'Highlighter Marker' },
    { id: 'rectangle', label: 'Box', icon: <Square size={18} />, tooltip: 'Rectangle Shape' },
    { id: 'circle', label: 'Circle', icon: <Circle size={18} />, tooltip: 'Circle Shape' },
    { id: 'line', label: 'Line', icon: <Minus size={18} />, tooltip: 'Straight Line' },
    { id: 'arrow', label: 'Arrow', icon: <MoveRight size={18} />, tooltip: 'Arrow Shape' },
  ];

  return (
    <aside className="w-16 bg-white border-r border-slate-200 py-3 flex flex-col items-center justify-between shadow-xs select-none z-20">
      <div className="flex flex-col items-center gap-1.5 w-full px-2">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all group relative ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={t.tooltip}
            >
              {t.icon}
              <span className="text-[9px] font-semibold mt-0.5 leading-none">
                {t.label}
              </span>
              {/* Tooltip on hover */}
              <span className="absolute left-14 bg-slate-800 text-white text-[11px] font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {t.tooltip}
              </span>
            </button>
          );
        })}

        <div className="w-8 h-[1px] bg-slate-200 my-1" />

        {/* Signature tool */}
        <button
          onClick={onOpenSignature}
          className="w-11 h-11 rounded-xl flex flex-col items-center justify-center text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all group relative"
          title="Sign Document (স্বাক্ষর)"
        >
          <PenTool size={18} />
          <span className="text-[9px] font-semibold mt-0.5 leading-none">Sign</span>
          <span className="absolute left-14 bg-slate-800 text-white text-[11px] font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            Add Signature (স্বাক্ষর)
          </span>
        </button>

        {/* Image tool */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageFileChange}
          accept="image/*"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-11 h-11 rounded-xl flex flex-col items-center justify-center text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all group relative"
          title="Add Image or Stamp"
        >
          <ImageIcon size={18} />
          <span className="text-[9px] font-semibold mt-0.5 leading-none">Image</span>
          <span className="absolute left-14 bg-slate-800 text-white text-[11px] font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            Insert Image / Stamp
          </span>
        </button>
      </div>

      {/* Bottom Actions: Delete Selected */}
      {hasSelection && (
        <div className="w-full px-2">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onDeleteSelected();
            }}
            onClick={onDeleteSelected}
            className="w-11 h-11 rounded-xl flex flex-col items-center justify-center text-rose-600 hover:text-white hover:bg-rose-600 transition-all shadow-sm cursor-pointer"
            title="Delete selected element (Delete/Backspace)"
          >
            <Trash2 size={18} />
            <span className="text-[9px] font-bold mt-0.5 leading-none">Del</span>
          </button>
        </div>
      )}
    </aside>
  );
};
