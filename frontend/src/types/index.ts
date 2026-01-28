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
}
