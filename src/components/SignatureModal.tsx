import React, { useRef, useState, useEffect } from 'react';
import { X, Check, RotateCcw, PenTool, Type, Upload } from 'lucide-react';
import { FontFamily } from '../types/editor';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState<FontFamily>('Kalpurush');
  const [strokeColor, setStrokeColor] = useState('#0f172a');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = strokeColor;
        }
      }
      setHasDrawn(false);
    }
  }, [isOpen, activeTab, strokeColor]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;
      onSave(canvas.toDataURL('image/png'));
    } else if (activeTab === 'type') {
      if (!typedName.trim()) return;
      const canvas = document.createElement('canvas');
      canvas.width = 450;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.font = `italic 36px "${selectedFont}", sans-serif`;
      ctx.fillStyle = strokeColor;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(typedName, 225, 75);

      onSave(canvas.toDataURL('image/png'));
    }
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        onSave(result);
        onClose();
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Add Signature / স্বাক্ষর যোগ করুন</h3>
            <p className="text-xs text-slate-500">Draw, type, or upload your signature</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50">
          <button
            onClick={() => setActiveTab('draw')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'draw'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PenTool size={16} /> Draw (হাতে আঁকুন)
          </button>
          <button
            onClick={() => setActiveTab('type')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'type'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Type size={16} /> Type (টাইপ করুন)
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload size={16} /> Upload (আপলোড)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {activeTab === 'draw' && (
            <div>
              <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[180px] cursor-crosshair touch-none"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-sm">
                    Sign here with your mouse or finger...
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Color:</span>
                  {['#0f172a', '#1e40af', '#065f46'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setStrokeColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-6 h-6 rounded-full border-2 ${
                        strokeColor === color ? 'border-slate-800 scale-110' : 'border-white'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={clearCanvas}
                  className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                >
                  <RotateCcw size={14} /> Clear (মুছুন)
                </button>
              </div>
            </div>
          )}

          {activeTab === 'type' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Type your name / আপনার নাম লিখুন:
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="e.g. ড. মোঃ রফিকুল ইসলাম or Dr. John Doe"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Font / ফন্ট নির্বাচন:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Kalpurush (বাংলা)', val: 'Kalpurush' },
                    { label: 'Nikosh (বাংলা)', val: 'Nikosh' },
                    { label: 'Roboto (English)', val: 'Roboto' },
                    { label: 'Arial (English)', val: 'Arial' },
                  ].map((f) => (
                    <button
                      key={f.val}
                      onClick={() => setSelectedFont(f.val as FontFamily)}
                      className={`px-3 py-2 text-sm rounded-lg border text-left transition-all ${
                        selectedFont === f.val
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                      style={{ fontFamily: f.val }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 min-h-[90px] flex items-center justify-center">
                {typedName ? (
                  <span
                    style={{
                      fontFamily: selectedFont,
                      fontStyle: 'italic',
                      fontSize: '28px',
                      color: strokeColor,
                    }}
                  >
                    {typedName}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Signature preview will appear here</span>
                )}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors">
              <Upload className="mx-auto text-slate-400 mb-3" size={36} />
              <p className="text-sm font-semibold text-slate-700 mb-1">
                Upload image of signature
              </p>
              <p className="text-xs text-slate-400 mb-4">
                Supports PNG, JPG with transparent or clean white background
              </p>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all">
                <span>Browse File</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          {activeTab !== 'upload' && (
            <button
              onClick={handleSave}
              disabled={activeTab === 'draw' ? !hasDrawn : !typedName.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium shadow-sm transition-all"
            >
              <Check size={16} /> Place Signature
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
