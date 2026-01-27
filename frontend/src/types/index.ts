export interface Annotation {
  id: string;
  type: 'text' | 'drawing' | 'shape' | 'highlight' | 'image';
  pageNumber: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  data: any;
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
