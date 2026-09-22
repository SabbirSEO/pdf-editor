export type ToolType = 
  | 'select' 
  | 'text' 
  | 'whiteout' 
  | 'draw' 
  | 'highlight' 
  | 'rectangle' 
  | 'circle' 
  | 'line' 
  | 'arrow' 
  | 'image' 
  | 'signature';

export type FontFamily = 
  | 'Nikosh' 
  | 'Kalpurush' 
  | 'Tiro Bangla'
  | 'Roboto' 
  | 'Arial' 
  | 'Inter' 
  | 'Times New Roman' 
  | 'Courier New'
  | (string & {});

export interface BaseElement {
  id: string;
  pageIndex: number;
  x: number; // in points (PDF space)
  y: number;
  width: number;
  height: number;
  opacity?: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: FontFamily;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right';
  backgroundColor?: string;
  lineHeight?: number;
  originalText?: string;
  rawPdfX?: number;
  rawPdfY?: number;
  detectedFontName?: string;
  embeddedFontData?: Uint8Array;
}

export interface WhiteoutElement extends BaseElement {
  type: 'whiteout';
  fill: string; // usually #ffffff
  strokeColor?: string;
  strokeWidth?: number;
}

export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawElement extends BaseElement {
  type: 'draw';
  points: DrawPoint[];
  strokeColor: string;
  strokeWidth: number;
  isHighlighter?: boolean;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'line' | 'arrow';
  fill: string;
  strokeColor: string;
  strokeWidth: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  dataUrl: string;
  aspectRatio: number;
}

export type EditorElement = 
  | TextElement 
  | WhiteoutElement 
  | DrawElement 
  | ShapeElement 
  | ImageElement;

export interface PageDimension {
  width: number;
  height: number;
  rotation: number;
}

export interface DocumentState {
  file: File | null;
  pdfBytes: ArrayBuffer | null;
  numPages: number;
  pageDimensions: PageDimension[];
  elements: EditorElement[];
  selectedElementId: string | null;
  currentPage: number;
  scale: number;
  activeTool: ToolType;
  // Default styling for new elements
  defaultFont: FontFamily;
  defaultFontSize: number;
  defaultColor: string;
  defaultStrokeWidth: number;
}
