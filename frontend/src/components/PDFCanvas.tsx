import React, { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Annotation, TextAnnotation } from '../types';

interface PDFCanvasProps {
  pageNumber: number;
  scale: number;
}

const PDFCanvas: React.FC<PDFCanvasProps> = ({ pageNumber, scale }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const {
    currentTool,
    annotations,
    addAnnotation,
    penColor,
    penWidth,
    fontSize,
    fontFamily,
    fontColor,
  } = useEditorStore();

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [textInput, setTextInput] = useState<{ x: number; y: number; text: string } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (currentTool === 'text') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setTextInput({ x, y, text: '' });
      }
    } else if (currentTool === 'pen') {
      setIsDrawing(true);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCurrentPath([{ x, y }]);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawing && currentTool === 'pen') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCurrentPath((prev) => [...prev, { x, y }]);
      }
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentTool === 'pen' && currentPath.length > 0) {
      const annotation: Annotation = {
        id: Date.now().toString(),
        type: 'drawing',
        pageNumber,
        x: currentPath[0].x,
        y: currentPath[0].y,
        data: {
          paths: [currentPath],
          color: penColor,
          width: penWidth,
        },
      };
      addAnnotation(annotation);
      setCurrentPath([]);
    }
    setIsDrawing(false);
  };

  const handleTextSubmit = () => {
    if (textInput && textInput.text.trim()) {
      const annotation: TextAnnotation = {
        id: Date.now().toString(),
        type: 'text',
        pageNumber,
        x: textInput.x,
        y: textInput.y,
        data: {
          text: textInput.text,
          fontSize,
          fontFamily,
          color: fontColor,
        },
      };
      addAnnotation(annotation);
    }
    setTextInput(null);
  };

  const pageAnnotations = annotations.filter((ann) => ann.pageNumber === pageNumber);

  return (
    <>
      <div
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ pointerEvents: currentTool !== 'select' ? 'auto' : 'none' }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Render drawing paths */}
          {currentPath.length > 0 && (
            <path
              d={`M ${currentPath.map((p) => `${p.x},${p.y}`).join(' L ')}`}
              stroke={penColor}
              strokeWidth={penWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {pageAnnotations.map((annotation) => {
            if (annotation.type === 'drawing') {
              return annotation.data.paths.map((path: any, idx: number) => (
                <path
                  key={`${annotation.id}-${idx}`}
                  d={`M ${path.map((p: any) => `${p.x},${p.y}`).join(' L ')}`}
                  stroke={annotation.data.color}
                  strokeWidth={annotation.data.width}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ));
            }
            return null;
          })}
        </svg>

        {/* Render text annotations */}
        {pageAnnotations.map((annotation) => {
          if (annotation.type === 'text') {
            const textAnn = annotation as TextAnnotation;
            return (
              <div
                key={annotation.id}
                className="absolute"
                style={{
                  left: annotation.x,
                  top: annotation.y,
                  fontSize: textAnn.data.fontSize,
                  fontFamily: textAnn.data.fontFamily,
                  color: textAnn.data.color,
                  fontWeight: textAnn.data.bold ? 'bold' : 'normal',
                  fontStyle: textAnn.data.italic ? 'italic' : 'normal',
                  textDecoration: textAnn.data.underline ? 'underline' : 'none',
                  pointerEvents: 'none',
                }}
              >
                {textAnn.data.text}
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* Text input overlay */}
      {textInput && (
        <div
          className="absolute bg-white border-2 border-blue-500 p-1"
          style={{
            left: textInput.x,
            top: textInput.y,
            zIndex: 1000,
          }}
        >
          <input
            type="text"
            autoFocus
            value={textInput.text}
            onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleTextSubmit();
              } else if (e.key === 'Escape') {
                setTextInput(null);
              }
            }}
            onBlur={handleTextSubmit}
            className="outline-none px-2 py-1"
            style={{
              fontSize,
              fontFamily,
              color: fontColor,
              minWidth: '200px',
            }}
            placeholder="Type text..."
          />
        </div>
      )}
    </>
  );
};

export default PDFCanvas;
