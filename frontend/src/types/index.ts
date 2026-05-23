export interface Annotation {
  id: string;
  type: 'text' | 'drawing' | 'shape' | 'highlight' | 'image' | 'textEdit';
  pageNumber: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  data: any;
}

// Represents an edit to the original PDF text
export interface TextEditAnnotation extends Annotation {
  type: 'textEdit';
  data: {
    originalText: string;
    newText: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    originalTextId: string; // ID of the ExtractedTextItem being replaced
    textAlign?: 'left' | 'center' | 'right'; // Preserved text alignment
    pageWidth?: number; // Page width for proper alignment
    lineHeight?: number; // Source baseline-to-baseline spacing
    firstBaselineY?: number; // Canvas Y of original first-line baseline
    bold?: boolean;
    italic?: boolean;
  };
}

export interface TextAnnotation extends Annotation {
  type: 'text';
  data: {
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  };
}

export interface DrawingAnnotation extends Annotation {
  type: 'drawing';
  data: {
    paths: Array<{ x: number; y: number }[]>;
    color: string;
    width: number;
  };
}

export interface ShapeAnnotation extends Annotation {
  type: 'shape';
  data: {
    shapeType: 'rectangle' | 'circle' | 'line' | 'arrow';
    strokeColor: string;
    strokeWidth: number;
    fillColor?: string;
    endX?: number;
    endY?: number;
  };
}

export interface HighlightAnnotation extends Annotation {
  type: 'highlight';
  data: {
    color: string;
    opacity: number;
  };
}

export interface ImageAnnotation extends Annotation {
  type: 'image';
  data: {
    src: string;
    originalWidth: number;
    originalHeight: number;
  };
}

export type Tool =
  | 'select'
  | 'text'
  | 'editText'
  | 'pen'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'highlight'
  | 'image';

export interface PDFDocument {
  id: string;
  name: string;
  file: File;
  numPages: number;
  annotations: Annotation[];
}

export interface SearchResult {
  pageNumber: number;
  text: string;
  index: number;
  // Bounding box of the match in canvas coordinates at scale=1.
  // The overlay multiplies by the current zoom level. Absent on results
  // produced before the highlight feature existed.
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ExtractedTextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  pageNumber: number;
  textAlign?: 'left' | 'center' | 'right'; // Detected text alignment
  pageWidth?: number; // Page width for calculating alignment
  lineHeight?: number; // Measured baseline-to-baseline spacing in source PDF
  firstBaselineY?: number; // Canvas Y of the first line's baseline (for accurate placement)
  bold?: boolean;
  italic?: boolean;
  // The block's frozen position/size at extraction time. x/y/width/height
  // can be dragged or resized for display, but the original PDF text still
  // lives at original* — that's what the cover rectangle must blank out at
  // save time, regardless of where the user has repositioned the block.
  originalX?: number;
  originalY?: number;
  originalWidth?: number;
  originalHeight?: number;
}
