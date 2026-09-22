import React from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Palette,
  Sparkles,
  Type,
  Square,
  Minus,
  Plus,
  Pipette
} from 'lucide-react';
import { FontFamily, ToolType, EditorElement, TextElement } from '../types/editor';

interface FormatBarProps {
  activeTool: ToolType;
  selectedElement: EditorElement | null;
  currentFont: FontFamily;
  currentFontSize: number;
  currentColor: string;
  currentBgColor?: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  textAlign: 'left' | 'center' | 'right';
  currentStrokeWidth: number;
  onFontChange: (font: FontFamily) => void;
  onFontSizeChange: (size: number) => void;
  onColorChange: (color: string) => void;
  onBgColorChange?: (color: string) => void;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
  onTextAlignChange: (align: 'left' | 'center' | 'right') => void;
  onStrokeWidthChange: (width: number) => void;
  onInsertBanglaSample: (text: string) => void;
}

const COLOR_PRESETS = [
  '#000000', '#1e293b', '#dc2626', '#d97706', 
  '#16a34a', '#2563eb', '#7c3aed', '#db2777', '#ffffff'
];

const BANGLA_QUICK_PHRASES = [
  'আমার সোনার বাংলা',
  'বাংলাদেশ',
  'অনুমোদিত (Approved)',
  'স্বাক্ষর:',
  'তারিখ:',
];

export const FormatBar: React.FC<FormatBarProps> = ({
  activeTool,
  selectedElement,
  currentFont,
  currentFontSize,
  currentColor,
  currentBgColor = 'transparent',
  isBold,
  isItalic,
  isUnderline,
  textAlign,
  currentStrokeWidth,
  onFontChange,
  onFontSizeChange,
  onColorChange,
  onBgColorChange,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onTextAlignChange,
  onStrokeWidthChange,
  onInsertBanglaSample,
}) => {
  const isTextContext = activeTool === 'text' || (selectedElement && selectedElement.type === 'text');
  const isShapeContext = ['rectangle', 'circle', 'line', 'arrow'].includes(activeTool) || (selectedElement && selectedElement.type === 'shape');
  const isDrawContext = ['draw', 'highlight'].includes(activeTool) || (selectedElement && selectedElement.type === 'draw');

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center gap-3 text-xs select-none shadow-2xs z-10">
      {/* Font Family Selection */}
      <div className="flex items-center gap-1.5">
        <span className="text-slate-400 font-medium hidden sm:inline flex items-center gap-1">
          <Type size={14} /> Font:
        </span>
        <div className="relative">
          <select
            value={currentFont}
            onChange={(e) => onFontChange(e.target.value as FontFamily)}
            className="h-8 pl-2.5 pr-7 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-xs"
            style={{ fontFamily: currentFont }}
          >
            {!['Nikosh', 'Kalpurush', 'Tiro Bangla', 'Roboto', 'Arial', 'Inter', 'Times New Roman', 'Courier New'].includes(currentFont) && (
              <optgroup label="সনাক্তকৃত ফন্ট (Detected from PDF)">
                <option value={currentFont}>✨ {currentFont} (Detected)</option>
              </optgroup>
            )}
            <optgroup label="বাংলা ফন্ট (Bangla Fonts)">
              <option value="Nikosh">🇧🇩 Nikosh (নিকোশ - সরকারি প্রমিত)</option>
              <option value="Kalpurush">🇧🇩 Kalpurush (কালপুরুষ - ক্লাসিক)</option>
              <option value="Tiro Bangla">🇧🇩 Tiro Bangla (তিরো বাংলা - গুগল)</option>
            </optgroup>
            <optgroup label="English Fonts">
              <option value="Roboto">🇬🇧 Roboto (Google Modern)</option>
              <option value="Arial">🇬🇧 Arial (Universal Sans)</option>
              <option value="Inter">🇬🇧 Inter (UI Standard)</option>
              <option value="Times New Roman">🇬🇧 Times New Roman (Serif)</option>
              <option value="Courier New">🇬🇧 Courier New (Monospace)</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* Font Size with 0.5pt Precision Stepper & Direct Typing */}
      {isTextContext && (
        <div className="flex items-center gap-1">
          <span className="text-slate-400 font-medium hidden sm:inline">Size:</span>
          <div className="flex items-center bg-slate-100 rounded-lg border border-slate-300 overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => onFontSizeChange(Math.max(4, Math.round((currentFontSize - 0.5) * 10) / 10))}
              className="w-7 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors font-bold text-xs"
              title="Decrease font size by 0.5pt"
            >
              <Minus size={12} />
            </button>
            <div className="flex items-center px-1 bg-white border-x border-slate-200">
              <input
                type="number"
                step="0.5"
                min="4"
                max="144"
                value={currentFontSize}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0 && val <= 200) {
                    onFontSizeChange(Math.round(val * 10) / 10);
                  }
                }}
                className="w-11 h-7 text-center font-bold text-xs text-slate-800 bg-transparent focus:outline-none"
                title="Type exact font size (supports decimals like 9.5, 10.5, 11.2, 13)"
              />
              <span className="text-[10px] text-slate-400 font-bold">pt</span>
            </div>
            <button
              type="button"
              onClick={() => onFontSizeChange(Math.min(144, Math.round((currentFontSize + 0.5) * 10) / 10))}
              className="w-7 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors font-bold text-xs"
              title="Increase font size by 0.5pt"
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Quick Preset Dropdown */}
          <select
            value={[8, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 48].includes(currentFontSize) ? currentFontSize : ''}
            onChange={(e) => {
              if (e.target.value) onFontSizeChange(Number(e.target.value));
            }}
            className="h-8 px-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs cursor-pointer"
            title="Quick standard sizes"
          >
            <option value="" disabled>Presets</option>
            {[8, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 48].map((size) => (
              <option key={size} value={size}>
                {size} pt
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Text Style: Bold, Italic, Underline */}
      {isTextContext && (
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={onToggleBold}
            className={`p-1.5 rounded transition-colors ${
              isBold ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
            title="Bold"
          >
            <Bold size={14} />
          </button>
          <button
            onClick={onToggleItalic}
            className={`p-1.5 rounded transition-colors ${
              isItalic ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
            title="Italic"
          >
            <Italic size={14} />
          </button>
          <button
            onClick={onToggleUnderline}
            className={`p-1.5 rounded transition-colors ${
              isUnderline ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
            title="Underline"
          >
            <Underline size={14} />
          </button>
        </div>
      )}

      {/* Alignment */}
      {isTextContext && (
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => onTextAlignChange('left')}
            className={`p-1.5 rounded transition-colors ${
              textAlign === 'left' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
            title="Align Left"
          >
            <AlignLeft size={14} />
          </button>
          <button
            onClick={() => onTextAlignChange('center')}
            className={`p-1.5 rounded transition-colors ${
              textAlign === 'center' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
            title="Align Center"
          >
            <AlignCenter size={14} />
          </button>
          <button
            onClick={() => onTextAlignChange('right')}
            className={`p-1.5 rounded transition-colors ${
              textAlign === 'right' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
            title="Align Right"
          >
            <AlignRight size={14} />
          </button>
        </div>
      )}

      {/* Precise Color Controls (EyeDropper, Hex Editor, Presets) */}
      <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
        <span className="text-slate-400 font-medium hidden sm:inline">Color:</span>

        {/* EyeDropper button (samples exact pixel color from screen or PDF) */}
        {'EyeDropper' in window && (
          <button
            type="button"
            onClick={async () => {
              try {
                const dropper = new (window as any).EyeDropper();
                const result = await dropper.open();
                if (result?.sRGBHex) {
                  onColorChange(result.sRGBHex);
                }
              } catch (e) {
                // cancelled
              }
            }}
            className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg border border-slate-300 transition-colors shadow-2xs"
            title="Pick exact color from PDF or screen with EyeDropper"
          >
            <Pipette size={14} />
          </button>
        )}

        {/* Hex input & palette circle */}
        <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 shadow-2xs">
          <span className="text-slate-400 font-mono text-[11px] font-semibold mr-0.5">#</span>
          <input
            type="text"
            maxLength={6}
            value={currentColor.replace(/^#/, '').toUpperCase()}
            onChange={(e) => {
              const hex = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
              if (hex.length === 6 || hex.length === 3) {
                onColorChange(`#${hex}`);
              }
            }}
            className="w-14 uppercase font-mono text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
            placeholder="000000"
            title="Type or paste exact HEX color code (e.g. F42A41 or 1E3A8A)"
          />
          <label className="cursor-pointer relative flex items-center ml-1">
            <input
              type="color"
              value={currentColor.startsWith('#') && currentColor.length === 7 ? currentColor : '#000000'}
              onChange={(e) => onColorChange(e.target.value)}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            />
            <div
              className="w-4 h-4 rounded-full border border-slate-400 shadow-xs ring-1 ring-slate-200"
              style={{ backgroundColor: currentColor }}
              title="Click to open color picker"
            />
          </label>
        </div>

        {/* Quick Document Presets */}
        <div className="hidden lg:flex items-center gap-1">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              style={{ backgroundColor: color }}
              className={`w-4 h-4 rounded-full border transition-transform ${
                currentColor.toLowerCase() === color.toLowerCase()
                  ? 'border-indigo-600 scale-125 shadow-xs ring-2 ring-indigo-200'
                  : 'border-slate-300 hover:scale-110'
              }`}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Background Fill (Transparent by default) */}
      {isTextContext && onBgColorChange && (
        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
          <span className="text-slate-400 font-medium hidden sm:inline">Background:</span>
          <select
            value={currentBgColor}
            onChange={(e) => onBgColorChange(e.target.value)}
            className="h-8 px-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium text-xs cursor-pointer"
          >
            <option value="transparent">None (Transparent)</option>
            <option value="#ffffff">White (#fff)</option>
            <option value="#fef08a">Yellow Highlight</option>
            <option value="#bbf7d0">Green Highlight</option>
            <option value="#e2e8f0">Light Gray</option>
          </select>
        </div>
      )}

      {/* Line Thickness for Pen / Shape */}
      {(isShapeContext || isDrawContext) && (
        <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
          <span className="text-slate-400 font-medium">Line Width:</span>
          <select
            value={currentStrokeWidth}
            onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
            className="h-8 px-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-semibold text-xs cursor-pointer"
          >
            {[1, 2, 3, 4, 6, 8, 12, 16].map((w) => (
              <option key={w} value={w}>
                {w} px
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Quick Bangla Phrases Pills */}
      <div className="hidden xl:flex items-center gap-1.5 ml-auto pl-3 border-l border-slate-200">
        <span className="text-[11px] font-bold text-indigo-800 flex items-center gap-1">
          <Sparkles size={13} className="text-indigo-600" />
          বাংলা নমুনা:
        </span>
        {BANGLA_QUICK_PHRASES.map((phrase) => (
          <button
            key={phrase}
            onClick={() => onInsertBanglaSample(phrase)}
            className="px-2 py-0.5 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 rounded-md border border-indigo-200/80 text-[11px] font-medium transition-all hover:scale-102"
            style={{ fontFamily: currentFont === 'Nikosh' ? 'Nikosh' : 'Kalpurush' }}
            title={`Insert "${phrase}" into PDF`}
          >
            + {phrase}
          </button>
        ))}
      </div>
    </div>
  );
};
